import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

const labPort = Number(process.env.CONTROL_KIT_LAB_PORT ?? 5185);
const labUrl = `http://127.0.0.1:${labPort}/`;
const repoRoot = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.smoke.ts',
  outputDir: '../output/playwright/results',
  fullyParallel: false,
  reporter: [['list']],
  workers: 1,
  webServer: {
    command: `pnpm exec vite --config lab/vite.config.ts --host 127.0.0.1 --port ${labPort} --strictPort`,
    cwd: repoRoot,
    url: labUrl,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  use: {
    baseURL: labUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: 'mobile',
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
      },
    },
  ],
});
