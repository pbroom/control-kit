import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import {
  type GitRunner,
  handleStructureOverridesCommit,
  handleStructureOverridesStatus,
  STRUCTURE_OVERRIDES_COMMIT_ENDPOINT,
  STRUCTURE_OVERRIDES_STATUS_ENDPOINT,
} from './src/routes/lab/performance-analysis/structure-overrides-git.js';
import {
  handleStructureOverridesWrite,
  STRUCTURE_OVERRIDES_ENDPOINT,
} from './src/routes/lab/performance-analysis/structure-overrides-server.js';
import {
  handleStructureEditorLocalWrite,
  STRUCTURE_EDITOR_LOCAL_ENDPOINT,
} from './src/routes/lab/performance-analysis/structure-editor-local-schema.js';

const fromLab = (path: string) => new URL(path, import.meta.url).pathname;

// The lab's tsconfig has no Node types; these are the few bits used here.
type DevRequest = {
  method?: string;
  on(event: 'data', listener: (chunk: Uint8Array) => void): void;
  on(event: 'end', listener: () => void): void;
  url?: string;
};
type DevResponse = {
  end(body?: string): void;
  setHeader(name: string, value: string): void;
  statusCode: number;
};
type NodeFs = {
  readFile(path: string, encoding: 'utf8'): Promise<string>;
  writeFile(path: string, data: string, encoding: 'utf8'): Promise<void>;
};
type NodeChildProcess = {
  execFile(
    file: string,
    args: readonly string[],
    options: { cwd: string; maxBuffer: number },
    callback: (
      error: (Error & { stderr?: string }) | null,
      stdout: string,
      stderr: string,
    ) => void,
  ): void;
};

const loadFs = async () =>
  (await import('node:fs/promises' as string)) as NodeFs;

function readBody(req: DevRequest) {
  return new Promise<string>((resolve) => {
    const chunks: Uint8Array[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const bytes = new Uint8Array(
        chunks.reduce((total, chunk) => total + chunk.length, 0),
      );
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      resolve(new TextDecoder().decode(bytes));
    });
  });
}

function sendJson(res: DevResponse, result: { body: string; status: number }) {
  res.statusCode = result.status;
  res.setHeader('content-type', 'application/json');
  res.end(result.body);
}

/** git with fixed args, no shell, from the repo root. */
function runGit(cwd: string): GitRunner {
  return async (args) => {
    const childProcess = (await import(
      'node:child_process' as string
    )) as NodeChildProcess;

    return new Promise((resolve, reject) => {
      childProcess.execFile(
        'git',
        args,
        { cwd, maxBuffer: 4 * 1024 * 1024 },
        (error, stdout, stderr) => {
          if (error) {
            reject(Object.assign(error, { stderr: String(stderr ?? '') }));
            return;
          }
          resolve({ stderr: String(stderr), stdout: String(stdout) });
        },
      );
    });
  };
}

/**
 * Dev server only. The Structure editor POSTs the whole overrides file to
 * save it (validated, written in canonical form; Vite then hot-reloads the
 * imported JSON), asks whether it differs from HEAD, and can commit it
 * (that one path only, never pushed).
 */
function structureOverridesWriter(): Plugin {
  const file = fromLab('./structure-overrides.json');
  const deps = {
    git: runGit(fromLab('..')),
    readWorking: async () => (await loadFs()).readFile(file, 'utf8'),
  };

  const localFile = fromLab('./structure-editor.local.json');

  return {
    apply: 'serve',
    configureServer(server) {
      // Local, gitignored editor preferences (render frame per demo).
      server.middlewares.use(
        STRUCTURE_EDITOR_LOCAL_ENDPOINT,
        (request, response) => {
          const req = request as unknown as DevRequest;
          const res = response as unknown as DevResponse;

          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('allow', 'POST');
            res.end();
            return;
          }

          void readBody(req)
            .then((body) =>
              handleStructureEditorLocalWrite(body, async (text) => {
                await (await loadFs()).writeFile(localFile, text, 'utf8');
              }),
            )
            .then((result) => sendJson(res, result))
            .catch((error: unknown) =>
              sendJson(res, {
                body: JSON.stringify({ errors: [String(error)], ok: false }),
                status: 500,
              }),
            );
        },
      );
      // Registered before the save route, which would match these as a prefix.
      server.middlewares.use(
        STRUCTURE_OVERRIDES_STATUS_ENDPOINT,
        (request, response) => {
          const res = response as unknown as DevResponse;

          if ((request as unknown as DevRequest).method !== 'GET') {
            sendJson(res, { body: '{}', status: 405 });
            return;
          }

          void handleStructureOverridesStatus(deps).then((result) =>
            sendJson(res, result),
          );
        },
      );
      server.middlewares.use(
        STRUCTURE_OVERRIDES_COMMIT_ENDPOINT,
        (request, response) => {
          const res = response as unknown as DevResponse;

          if ((request as unknown as DevRequest).method !== 'POST') {
            sendJson(res, { body: '{}', status: 405 });
            return;
          }

          void handleStructureOverridesCommit(deps).then((result) =>
            sendJson(res, result),
          );
        },
      );
      server.middlewares.use(
        STRUCTURE_OVERRIDES_ENDPOINT,
        (request, response, next) => {
          const req = request as unknown as DevRequest;
          const res = response as unknown as DevResponse;

          if (req.url && req.url !== '/' && !req.url.startsWith('/?')) {
            next();
            return;
          }

          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('allow', 'POST');
            res.end();
            return;
          }

          void readBody(req)
            .then((body) =>
              handleStructureOverridesWrite(body, async (text) => {
                await (await loadFs()).writeFile(file, text, 'utf8');
              }),
            )
            .then((result) => sendJson(res, result))
            .catch((error: unknown) =>
              sendJson(res, {
                body: JSON.stringify({ errors: [String(error)], ok: false }),
                status: 500,
              }),
            );
        },
      );
    },
    name: 'lab-structure-overrides-writer',
  };
}

export default defineConfig({
  root: fromLab('.'),
  plugins: [react(), tailwindcss(), structureOverridesWriter()],
  resolve: {
    alias: [
      { find: '@', replacement: fromLab('./src') },
      {
        find: '@pbroom/control-kit',
        replacement: fromLab('../src/index.ts'),
      },
      {
        find: '@color-kit/core-wasm',
        replacement: fromLab('./src/vendor/color-kit/core-wasm/index.ts'),
      },
      {
        find: '@color-kit/core',
        replacement: fromLab('./src/vendor/color-kit/core/index.ts'),
      },
      {
        find: 'color-kit/react',
        replacement: fromLab('./src/vendor/color-kit/react/index.ts'),
      },
      {
        find: '@color-kit/react',
        replacement: fromLab('./src/vendor/color-kit/react/index.ts'),
      },
      {
        find: 'color-kit/core',
        replacement: fromLab('./src/vendor/color-kit/core/index.ts'),
      },
      {
        find: 'color-kit',
        replacement: fromLab('./src/vendor/color-kit/core/index.ts'),
      },
    ],
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
  },
  build: {
    outDir: '../dist-lab',
    emptyOutDir: true,
  },
  worker: {
    format: 'es',
  },
});
