import { expect, test } from '@playwright/test';

for (const portal of [true, false]) {
  test(`attachment preserves keyboard order and child input behavior (portal=${portal})`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/tests/fixtures/plane-attachment.html?portal=${portal}`);
    const attachment = page.locator('[data-slot="plane-attachment"]');
    const name = page.getByRole('textbox', { name: 'Name', exact: true });
    const coordinates = page.getByLabel('Coordinates', { exact: true });
    await expect(attachment).toHaveCount(0);

    await page.getByRole('button', { name: 'Before', exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('slider', { name: 'Horizontal position', exact: true }),
    ).toBeFocused();
    await expect(attachment).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(name).toBeFocused();
    // Native Tab may select the field's existing text; normalize the caret.
    await page.keyboard.press('End');
    await page.keyboard.type(' edited');
    await expect(name).toHaveValue('Gradient edited');
    await expect(coordinates).toHaveText('{"x":0.5,"y":0.5}');

    await name.click();
    await page.keyboard.press('ArrowRight');
    await expect(name).toBeFocused();
    await expect(coordinates).toHaveText('{"x":0.5,"y":0.5}');
    await expect(page.locator('[data-slot="plane-thumb"]')).not.toHaveAttribute(
      'data-dragging',
    );

    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('button', { name: 'OK', exact: true }),
    ).toBeFocused();
    await expect(attachment).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('button', { name: 'After', exact: true }),
    ).toBeFocused();
    await expect(attachment).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
