import { expect, test } from '@playwright/test';
import { collectBrowserErrors } from './lab-smoke-utils.js';

test('keeps the Lucide icon picker anchored and keyboard operable', async ({
  page,
}) => {
  const browserErrors = await collectBrowserErrors(page);

  await page.goto('/lab/input-primitive');
  await page.getByLabel('Content: Icon', { exact: true }).click();

  const trigger = page.getByLabel(/^Choose Lucide icon\./);
  await expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
  await trigger.click();

  const search = page.getByRole('combobox', {
    name: 'Search Lucide icons',
    exact: true,
  });
  const popup = search.locator('xpath=../..');
  const listbox = page.getByRole('listbox', {
    name: 'Lucide icons',
    exact: true,
  });

  await expect(search).toBeFocused();
  await expect(listbox.getByRole('option').first()).toBeVisible();

  const [triggerBox, popupBox] = await Promise.all([
    trigger.boundingBox(),
    popup.boundingBox(),
  ]);
  expect(triggerBox).not.toBeNull();
  expect(popupBox).not.toBeNull();
  expect(popupBox!.width).toBeCloseTo(triggerBox!.width, 0);
  expect(popupBox!.x).toBeCloseTo(triggerBox!.x, 0);
  const opensBelow =
    popupBox!.y >= triggerBox!.y + triggerBox!.height + 5;
  const opensAbove = popupBox!.y + popupBox!.height <= triggerBox!.y - 5;
  expect(opensBelow || opensAbove).toBe(true);

  await search.fill('triangle-alert');
  const triangleAlert = listbox.getByRole('option', {
    name: 'Triangle Alert',
    exact: true,
  });
  await expect(triangleAlert).toBeVisible();
  const triangleAlertId = await triangleAlert.getAttribute('id');
  expect(triangleAlertId).not.toBeNull();
  await expect(search).toHaveAttribute(
    'aria-activedescendant',
    triangleAlertId!,
  );
  await search.press('Enter');

  await expect(trigger).toContainText('Triangle Alert');
  await expect(search).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(search).toBeFocused();
  await search.fill('not-a-real-lucide-icon');
  await expect(
    page.getByText('No icons match “not-a-real-lucide-icon”.', { exact: true }),
  ).toBeVisible();
  await search.press('Escape');
  await expect(search).toBeHidden();
  await expect(trigger).toBeFocused();

  expect(browserErrors).toEqual([]);
});
