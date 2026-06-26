import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const fromLab = (path: string) => new URL(path, import.meta.url).pathname;

export default defineConfig({
  root: fromLab('.'),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: '@', replacement: fromLab('./src') },
      {
        find: '@color-kit/control-kit',
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
