import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import {
  handleStructureOverridesWrite,
  STRUCTURE_OVERRIDES_ENDPOINT,
} from './src/routes/lab/performance-analysis/structure-overrides-server.js';

const fromLab = (path: string) => new URL(path, import.meta.url).pathname;

/**
 * Dev server only: the Structure tab's editor POSTs the whole overrides file
 * here; it is validated against the schema and written in canonical form.
 * Vite then hot-reloads the imported JSON.
 */
// The lab's tsconfig has no Node types; these are the few bits used here.
type DevRequest = {
  method?: string;
  on(event: 'data', listener: (chunk: Uint8Array) => void): void;
  on(event: 'end', listener: () => void): void;
};
type NodeFs = {
  writeFile(path: string, data: string, encoding: 'utf8'): Promise<void>;
};

function structureOverridesWriter(): Plugin {
  const file = fromLab('./structure-overrides.json');

  return {
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(STRUCTURE_OVERRIDES_ENDPOINT, (request, res) => {
        const req = request as unknown as DevRequest;

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('allow', 'POST');
          res.end();
          return;
        }

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

          void handleStructureOverridesWrite(
            new TextDecoder().decode(bytes),
            async (text) => {
              const fs = (await import('node:fs/promises' as string)) as NodeFs;
              await fs.writeFile(file, text, 'utf8');
            },
          )
            .then((result) => {
              res.statusCode = result.status;
              res.setHeader('content-type', 'application/json');
              res.end(result.body);
            })
            .catch((error: unknown) => {
              res.statusCode = 500;
              res.setHeader('content-type', 'application/json');
              res.end(JSON.stringify({ errors: [String(error)], ok: false }));
            });
        });
      });
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
