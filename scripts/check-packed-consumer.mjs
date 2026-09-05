import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium, expect } from '@playwright/test';
import { preview } from 'vite';

const gitInstall = process.argv.includes('--git');
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
  let packageSource = `file:${tarball}`;
  if (gitInstall) {
    // Clone only committed files: local dist/ and node_modules must not mask
    // a broken prepare lifecycle. A file Git URL exercises pnpm's Git fetcher
    // at the exact checkout commit without depending on a published branch.
    const source = join(temporary, 'source');
    run('git', ['clone', '--no-local', '--no-checkout', repo, source], repo);
    const head = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repo,
      encoding: 'utf8',
    }).trim();
    const trackedDist = execFileSync(
      'git',
      ['ls-tree', '-r', '--name-only', head, 'dist'],
      {
        cwd: repo,
        encoding: 'utf8',
      },
    ).trim();
    assert.equal(trackedDist, '', 'Git install must build dist from source');
    packageSource = `git+${pathToFileURL(source).href}#${head}`;
  } else {
    run('pnpm', ['build'], repo);
    run('pnpm', ['pack', '--out', tarball], repo);
  }
  await cp(join(repo, 'fixtures/consumer'), consumer, { recursive: true });

  // Use the versions selected by the repository lockfile, but install them
  // outside the repository. No workspace links or source aliases can mask a
  // missing package file, export, peer dependency, or Tailwind source.
  const dependencies = { 'control-kit': packageSource };
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
    ...(gitInstall
      ? ['add', '--allow-build=control-kit', `control-kit@${packageSource}`]
      : ['install', '--no-frozen-lockfile']),
    ...(gitInstall
      ? ['--store-dir', join(temporary, 'store')]
      : ['--ignore-scripts']),
    '--config.auto-install-peers=false',
  ]);
  run('pnpm', ['exec', 'tsc', '--project', 'tsconfig.json']);
  run('node', [
    '--input-type=module',
    '-e',
    String.raw`import assert from 'node:assert/strict';
     import { createRequire } from 'node:module';
     import * as esm from 'control-kit';
     const require = createRequire(import.meta.url);
     const cjs = require('control-kit');
     assert.equal(require('control-kit/package.json').name, 'control-kit');
     assert.match(import.meta.resolve('control-kit'), /\/dist\/index\.js$/);
     assert.match(require.resolve('control-kit'), /\/dist\/index\.cjs$/);
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

  const outline = page.getByRole('group', { name: 'Channel display' });
  await expect(outline).toHaveCSS('border-color', 'rgb(76, 76, 76)');
  await hsl.press('Tab');
  const linear = page.getByRole('button', { name: 'Linear', exact: true });
  await expect(linear).toBeFocused();
  await expect(linear).toHaveCSS('box-shadow', /0px 0px 0px 2px/);
  const defaultRing = await linear.evaluate(
    (element) => getComputedStyle(element).boxShadow,
  );
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--ck-border', '#654321');
    document.documentElement.style.setProperty('--ck-accent', '#ff0000');
  });
  await expect(outline).toHaveCSS('border-color', 'rgb(101, 67, 33)');
  await expect
    .poll(() =>
      linear.evaluate((element) => getComputedStyle(element).boxShadow),
    )
    .not.toBe(defaultRing);
  await expect(linear).toHaveCSS('box-shadow', /0px 0px 0px 2px/);
  await page.evaluate(() => {
    document.documentElement.style.removeProperty('--ck-border');
    document.documentElement.style.removeProperty('--ck-accent');
  });

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
    `${gitInstall ? 'Git-installed' : 'Packed'} consumer passed: ESM/CJS, types, channel input, Tooltip, ToggleGroup and Tailwind themes.`,
  );
} finally {
  await browser?.close();
  if (server) await new Promise((resolve) => server.httpServer.close(resolve));
  await rm(temporary, { recursive: true, force: true });
}
