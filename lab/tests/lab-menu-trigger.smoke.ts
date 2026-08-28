import { expect, test } from '@playwright/test';

test('release mode opens the Menu on pointer release', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Desktop pointer timing.');

  await page.goto('/lab/menu');
  await page.getByRole('button', { name: 'Trigger behavior: Release' }).click();

  const trigger = page.getByRole('button', { name: 'Menu actions' });
  const firstAction = page.getByRole('menuitem', { name: /Copy/ }).first();
  const triggerBox = await trigger.boundingBox();
  expect(triggerBox).not.toBeNull();

  await page.mouse.move(
    triggerBox!.x + triggerBox!.width / 2,
    triggerBox!.y + triggerBox!.height / 2,
  );
  await page.mouse.down();
  await expect(firstAction).toBeHidden();
  await page.mouse.up();
  await expect(firstAction).toBeVisible();
});
