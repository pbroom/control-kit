import { expect, test, type Locator, type Page } from '@playwright/test';

async function pressMoveRelease(
  page: Page,
  trigger: Locator,
  movements: Array<{ x: number; y: number }>,
  holdMs = 0,
) {
  const box = await trigger.boundingBox();
  expect(box).not.toBeNull();

  const start = {
    x: box!.x + box!.width / 2,
    y: box!.y + box!.height / 2,
  };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  if (holdMs > 0) await page.waitForTimeout(holdMs);
  for (const movement of movements) {
    await page.mouse.move(start.x + movement.x, start.y + movement.y);
  }
  await page.mouse.up();
}

test('Select docs use the compact non-selectable trigger contract', async ({
  page,
}) => {
  await page.goto('/docs/select');

  const trigger = page
    .getByLabel('Select demo', { exact: true })
    .getByRole('button', { name: 'Medium', exact: true });

  await expect(trigger).toHaveAttribute('data-select-trigger', '');
  await expect(trigger).toHaveCSS('height', '24px');
  await expect(trigger).toHaveCSS('min-height', '24px');
  await expect(trigger).toHaveCSS('font-size', '11px');
  await expect(trigger).toHaveCSS('user-select', 'none');
});

test('requires deliberate pointer travel before release selects a Select option', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Desktop pointer gesture.');

  await page.goto('/docs/select');
  const demo = page.getByLabel('Select demo', { exact: true });
  const trigger = demo.getByRole('button', { name: 'Medium', exact: true });
  const selectedOption = page.getByRole('menuitemradio', {
    name: 'Medium',
    exact: true,
  });

  // Ordinary quick clicks retain Base UI's trigger behavior.
  await pressMoveRelease(page, trigger, []);
  await expect(selectedOption).toBeVisible();
  await pressMoveRelease(page, trigger, []);
  await expect(selectedOption).toBeHidden();

  // After 200ms Base UI arms release-to-item and aligns the selected option
  // beneath the original cursor. A stationary release must still stay open.
  await pressMoveRelease(page, trigger, [], 250);
  await expect(selectedOption).toBeVisible();
  await expect(trigger).toHaveAccessibleName('Medium');

  await page.keyboard.press('Escape');
  await pressMoveRelease(
    page,
    trigger,
    [
      { x: 3, y: 0 },
      { x: 0, y: 0 },
    ],
    250,
  );
  await expect(selectedOption).toBeVisible();
  await expect(trigger).toHaveAccessibleName('Medium');

  await page.keyboard.press('Escape');
  // Seven pixels is enough deliberate travel; there is no larger geometry
  // dead zone around the trigger.
  await pressMoveRelease(page, trigger, [{ x: 7, y: 0 }], 250);
  await expect(selectedOption).toBeHidden();
  await expect(trigger).toHaveAccessibleName('Medium');
});

test('requires deliberate pointer travel before release activates a Menu command', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Desktop pointer gesture.');

  await page.goto('/docs/menu');
  const demo = page.getByLabel('Menu demo', { exact: true });
  const trigger = demo.getByRole('button', { name: 'Menu action: Copy' });
  const copyItem = page.getByRole('menuitem', { name: /Copy/ }).first();
  const actionItem = page
    .locator(
      '[role="menuitem"]:not([aria-haspopup]):not([aria-disabled="true"])',
    )
    .nth(1);

  await pressMoveRelease(page, trigger, [], 250);
  await expect(copyItem).toBeVisible();
  await expect(trigger).toHaveAccessibleName('Menu action: Copy');

  await page.keyboard.press('Escape');
  await pressMoveRelease(
    page,
    trigger,
    [
      { x: 3, y: 0 },
      { x: 0, y: 0 },
    ],
    250,
  );
  await expect(copyItem).toBeVisible();
  await expect(trigger).toHaveAccessibleName('Menu action: Copy');

  await page.keyboard.press('Escape');
  const triggerBox = await trigger.boundingBox();
  expect(triggerBox).not.toBeNull();
  const start = {
    x: triggerBox!.x + triggerBox!.width / 2,
    y: triggerBox!.y + triggerBox!.height / 2,
  };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await expect(actionItem).toBeVisible();
  const actionItemBox = await actionItem.boundingBox();
  expect(actionItemBox).not.toBeNull();
  await page.mouse.move(
    actionItemBox!.x + actionItemBox!.width / 2,
    actionItemBox!.y + actionItemBox!.height / 2,
  );
  await page.mouse.up();
  await expect(actionItem).toBeHidden();
  await expect(
    demo.getByRole('button', { name: /Menu action:/ }),
  ).not.toHaveAccessibleName('Menu action: Copy');
});
