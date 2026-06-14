import { expect, test, type Page } from '@playwright/test';

async function collectBrowserErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(`console: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    errors.push(`pageerror: ${error.message}`);
  });

  return errors;
}

test('loads the lab and exercises the core component surfaces', async ({
  page,
}) => {
  const browserErrors = await collectBrowserErrors(page);

  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Primitive input' }),
  ).toBeVisible();
  await page.getByLabel('Primitive input value').focus();
  await page.keyboard.press('ArrowUp');

  await page.getByRole('button', { name: /Multi input/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Multi input' }),
  ).toBeVisible();
  await page.getByRole('button', { name: /^H\s+/ }).click();

  await page.getByRole('button', { name: /Checkbox/ }).click();
  await expect(page.getByRole('heading', { name: 'Checkbox' })).toBeVisible();
  await page.getByRole('checkbox', { name: /Enable preview updates/ }).click();

  await page.getByRole('button', { name: /Toggle group/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Toggle group' }),
  ).toBeVisible();
  await page.getByRole('button', { name: /Tune/ }).click();

  await page.getByRole('button', { name: /Tooltip/ }).click();
  await expect(page.getByRole('heading', { name: 'Tooltip' })).toBeVisible();
  await page.getByRole('button', { name: 'Layer' }).hover();
  await expect(page.getByText('Layer tooltip preview')).toBeVisible();

  await page.getByRole('button', { name: 'Export state' }).click();
  await expect(page.locator('.event-log')).toContainText(
    'Copied current lab state',
  );
  expect(browserErrors).toEqual([]);
});
