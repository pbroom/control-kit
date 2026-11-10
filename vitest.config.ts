import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';

const fromRoot = (path: string) =>
  fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      // Test the package source rather than a possibly stale `dist/`, as the
      // lab does (see lab/vite.config.ts).
      {
        find: /^@pbroom\/control-kit$/,
        replacement: fromRoot('./src/index.ts'),
      },
      // Lets unit tests import the lab's vendored color-kit sources.
      {
        find: /^@color-kit\/core$/,
        replacement: fromRoot('./lab/src/vendor/color-kit/core/index.ts'),
      },
    ],
  },
  test: {
    // Agent worktrees hold full repo copies with their own node_modules;
    // collecting their tests loads a second React and fails hooks.
    exclude: [...configDefaults.exclude, '.claude/worktrees/**'],
    server: {
      deps: {
        // Ships ESM with extensionless imports that Node cannot resolve.
        inline: ['@material/material-color-utilities'],
      },
    },
  },
});
