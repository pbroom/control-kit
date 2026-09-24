import { expect, test, type Locator, type Page } from '@playwright/test';
import { collectBrowserErrors } from './lab-smoke-utils.js';

async function openControlInput(page: Page) {
  await page.goto('/lab/input-primitive');
  const input = page.getByRole('textbox', {
    name: 'Value preview',
    exact: true,
  });
  await expect(input).toBeVisible();
  const root = page.locator('[data-slot="control-input"]', { has: input });
  return { input, root };
}

async function typeAndCommit(input: Locator, text: string) {
  await input.click();
  await input.press('ControlOrMeta+A');
  await input.pressSequentially(text);
  await input.press('Enter');
}

test('commits typed text in place and steps with modifier keys', async ({
  page,
}) => {
  const browserErrors = await collectBrowserErrors(page);
  const { input } = await openControlInput(page);

  await expect(input).toHaveValue('42');
  await expect(input).not.toHaveAttribute('role', 'spinbutton');
  await expect(input).toHaveAttribute('aria-roledescription', 'Number field');

  await typeAndCommit(input, '25');
  await expect(input).toHaveValue('25');
  await expect(input).toBeFocused();

  await input.press('ArrowUp');
  await expect(input).toHaveValue('26');
  await input.press('Shift+ArrowUp');
  await expect(input).toHaveValue('36');
  await input.press('Alt+ArrowUp');
  await expect(input).toHaveValue('36.1');
  await input.press('Alt+ArrowDown');
  await input.press('ArrowDown');
  await expect(input).toHaveValue('35');
  await input.press('End');
  await expect(input).toHaveValue('100');
  await input.press('Home');
  await expect(input).toHaveValue('0');

  // Escape restores the value from focus after an uncommitted edit.
  await input.pressSequentially('7');
  await input.press('Escape');
  await expect(input).toHaveValue('0');

  expect(browserErrors).toEqual([]);
});

test('resolves arithmetic and color-kit expressions on commit', async ({
  page,
}) => {
  const browserErrors = await collectBrowserErrors(page);
  const { input } = await openControlInput(page);

  await typeAndCommit(input, '10');
  await expect(input).toHaveValue('10');

  await typeAndCommit(input, '* 2');
  await expect(input).toHaveValue('20');
  await expect(input).not.toHaveAttribute('data-expression', '');

  await typeAndCommit(input, '+ 5');
  await expect(input).toHaveValue('25');

  await typeAndCommit(input, '-5');
  await expect(input).toHaveValue('20');

  await typeAndCommit(input, '75%');
  await expect(input).toHaveValue('75');

  await typeAndCommit(input, '2/');
  await expect(input).toHaveValue('2/');
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await input.press('Escape');
  await expect(input).toHaveValue('75');

  expect(browserErrors).toEqual([]);
});

test('scrubs from the handle and commits on release', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  const browserErrors = await collectBrowserErrors(page);
  const { input, root } = await openControlInput(page);
  const handle = root.locator('[data-control-kit-scrub-handle]');
  const bounds = await handle.boundingBox();
  expect(bounds).not.toBeNull();

  const startX = bounds!.x + bounds!.width / 2;
  const y = bounds!.y + bounds!.height / 2;
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(startX + 12, y, { steps: 4 });
  await expect(root).toHaveAttribute('data-scrubbing', '');
  await expect(input).toHaveValue('54');
  await page.keyboard.down('Shift');
  await page.mouse.move(startX + 14, y, { steps: 2 });
  await page.keyboard.up('Shift');
  await expect(input).toHaveValue('74');
  await page.mouse.up();
  await expect(root).not.toHaveAttribute('data-scrubbing', '');
  await expect(input).toHaveValue('74');

  expect(browserErrors).toEqual([]);
});
