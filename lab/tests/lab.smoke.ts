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
  await expect(page.locator('.lab-stage .primitive-demo')).toBeVisible();
  await page.getByLabel('Primitive input value').focus();
  await page.keyboard.press('ArrowUp');

  await page.getByRole('button', { name: /Multi input/ }).click();
  await expect(page.locator('.lab-stage .multi-demo')).toBeVisible();
  await page.getByLabel('Hue').focus();
  await page.keyboard.press('ArrowUp');

  await page.getByRole('button', { name: /Checkbox/ }).click();
  await expect(page.locator('.lab-stage .checkbox-demo')).toBeVisible();
  await page.getByRole('checkbox', { name: /Enable preview updates/ }).click();

  await page.getByRole('button', { name: /Toggle group/ }).click();
  await expect(page.locator('.lab-stage .toggle-demo')).toBeVisible();
  await page.getByRole('button', { name: /Tune/ }).click();

  await page.getByRole('button', { name: /Tooltip/ }).click();
  await expect(page.locator('.lab-stage .tooltip-demo')).toBeVisible();
  await page.getByRole('button', { name: 'Layer' }).hover();
  await expect(page.getByText('Layer tooltip preview')).toBeVisible();
  await expect(page.locator('.event-log')).toContainText('Layer opened');
  expect(browserErrors).toEqual([]);
});
