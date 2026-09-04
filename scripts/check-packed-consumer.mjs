import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';
import { preview } from 'vite';

const repo = fileURLToPath(new URL('..', import.meta.url));
const temporary = await mkdtemp(join(tmpdir(), 'control-kit-consumer-'));
const consumer = join(temporary, 'consumer');
const tarball = join(temporary, 'control-kit.tgz');
let server;
let browser;

function run(command, args, cwd = consumer) {
  execFileSync(command, args, { cwd, stdio: 'inherit' });
}

try {
  run('pnpm', ['build'], repo);
  run('pnpm', ['pack', '--out', tarball], repo);
  await cp(join(repo, 'fixtures/consumer'), consumer, { recursive: true });

  // Use the versions selected by the repository lockfile, but install them
  // outside the repository. No workspace links or source aliases can mask a
  // missing package file, export, peer dependency, or Tailwind source.
  const dependencies = { '@color-kit/control-kit': `file:${tarball}` };
  for (const name of [
    '@base-ui/react',
    'react',
    'react-dom',
    '@types/react',
    '@types/react-dom',
    'typescript',
    'vite',
    '@vitejs/plugin-react',
    'tailwindcss',
    '@tailwindcss/vite',
  ]) {
    const metadata = JSON.parse(
      await readFile(join(repo, 'node_modules', name, 'package.json'), 'utf8'),
    );
    dependencies[name] = metadata.version;
  }
  await writeFile(
    join(consumer, 'package.json'),
    JSON.stringify({ private: true, type: 'module', dependencies }, null, 2),
  );
  run('pnpm', [
    'install',
    '--no-frozen-lockfile',
    '--ignore-scripts',
    '--config.auto-install-peers=false',
  ]);
  run('pnpm', ['exec', 'tsc', '--project', 'tsconfig.json']);
  run('node', [
    '--input-type=module',
    '-e',
    String.raw`import assert from 'node:assert/strict';
     import { createRequire } from 'node:module';
     import * as esm from '@color-kit/control-kit';
     const require = createRequire(import.meta.url);
     const cjs = require('@color-kit/control-kit');
     assert.match(import.meta.resolve('@color-kit/control-kit'), /\/dist\/index\.js$/);
     assert.match(require.resolve('@color-kit/control-kit'), /\/dist\/index\.cjs$/);
     assert.deepEqual(Object.keys(esm).sort(), Object.keys(cjs).sort());
     for (const kit of [esm, cjs]) {
       assert.deepEqual(kit.clampPlaneValue({x: 2, y: -1}), {x: 1, y: 0});
       assert.equal(typeof kit.usePrimitiveValueInput, 'function');
     }`,
  ]);
  run('pnpm', ['exec', 'vite', 'build']);
  server = await preview({
    configFile: false,
    root: consumer,
    preview: { host: '127.0.0.1', port: 0, open: false },
  });
  const address = server.httpServer.address();
  assert(address && typeof address !== 'string');
  browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const response = await page.goto(`http://127.0.0.1:${address.port}/`);
  assert.equal(response.status(), 200);
  await expect(page).toHaveTitle('Control Kit package consumer');
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);

  const channel = page.getByRole('textbox', { name: 'Color channel' });
  await channel.focus();
  await channel.press('ArrowUp');
  await expect(page.getByTestId('channel-value')).toHaveText('43');
  await expect(page.getByTestId('interaction')).toHaveText('keyboard');
  await channel.fill('75');
  await channel.press('Enter');
  await expect(page.getByTestId('channel-value')).toHaveText('75');

  const rgb = page.getByRole('button', { name: 'RGB', exact: true });
  await expect(rgb).toHaveAttribute('aria-pressed', 'true');
  await expect(rgb).toHaveCSS('background-color', 'rgb(56, 56, 56)');
  await expect(rgb).toHaveCSS('color', 'rgb(255, 255, 255)');
  const hsl = page.getByRole('button', { name: 'HSL', exact: true });
  await hsl.click();
  await expect(hsl).toHaveAttribute('aria-pressed', 'true');
  await expect(rgb).toHaveAttribute('aria-pressed', 'false');

  await page.getByRole('button', { name: 'Channel help' }).hover();
  const tooltip = page.locator('[data-slot="tooltip-content"]');
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveCSS('background-color', 'rgb(31, 31, 31)');
  await expect(tooltip).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(tooltip.locator('path').first()).toHaveCSS(
    'fill',
    'rgb(31, 31, 31)',
  );
  await expect(tooltip.locator('path').nth(1)).toHaveCSS(
    'stroke',
    'rgb(76, 76, 76)',
  );
  // Tooltip portals must pick up the documented root-level token overrides,
  // with no Lab CSS, shadcn theme, or host background/foreground tokens.
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--ck-surface', '#123456');
    document.documentElement.style.setProperty(
      '--ck-surface-content',
      '#234567',
    );
    document.documentElement.style.setProperty('--ck-foreground', '#fedcba');
  });
  await expect(hsl).toHaveCSS('background-color', 'rgb(18, 52, 86)');
  await expect(tooltip).toHaveCSS('background-color', 'rgb(35, 69, 103)');
  await expect(tooltip).toHaveCSS('color', 'rgb(254, 220, 186)');
  await expect(tooltip.locator('path').first()).toHaveCSS(
    'fill',
    'rgb(35, 69, 103)',
  );
  await page.getByRole('button', { name: 'Inverse help' }).hover();
  const inverse = page
    .locator('[data-slot="tooltip-content"]')
    .filter({ hasText: 'Inverse tooltip' });
  await expect(inverse).toBeVisible();
  await expect(inverse).toHaveCSS('background-color', 'rgb(254, 220, 186)');
  await expect(inverse).toHaveCSS('color', 'rgb(35, 69, 103)');
  await expect(inverse.locator('path').first()).toHaveCSS(
    'fill',
    'rgb(254, 220, 186)',
  );
  assert.deepEqual(errors, []);
  console.log(
    'Packed consumer passed: ESM/CJS, types, channel input, Tooltip, ToggleGroup and Tailwind themes.',
  );
} finally {
  await browser?.close();
  if (server) await new Promise((resolve) => server.httpServer.close(resolve));
  await rm(temporary, { recursive: true, force: true });
}
