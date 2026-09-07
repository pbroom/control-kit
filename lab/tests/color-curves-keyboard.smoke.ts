import { expect, test } from '@playwright/test';

test('curve keyboard movement reverses immediately at neighbor bounds', async ({
  page,
}) => {
  await page.goto('/docs/plane-examples');
  const plane = page.getByRole('group', {
    name: 'Color curves control',
    exact: true,
  });
  await plane.scrollIntoViewIfNeeded();
  const bounds = (await plane.boundingBox())!;
  for (const x of [0.4, 0.75]) {
    await plane.click({
      position: { x: bounds.width * x, y: bounds.height * (1 - x) },
    });
  }
  const thumb = plane.locator('[data-thumb-id="point-0"]');
  const input = thumb.locator('[data-plane-axis="x"]');
  const nextInput = plane.locator(
    '[data-thumb-id="point-1"] [data-plane-axis="x"]',
  );
  await input.focus();
  await input.press('End');
  const upper = Number(await nextInput.inputValue()) - 1 / 1024;
  expect(Number(await input.inputValue())).toBeCloseTo(upper, 8);
  await page.keyboard.down('ArrowRight');
  for (let repeat = 0; repeat < 4; repeat += 1)
    await page.keyboard.down('ArrowRight');
  await page.keyboard.up('ArrowRight');
  expect(Number(await input.inputValue())).toBeCloseTo(upper, 8);
  await input.press('ArrowLeft');
  expect(Number(await input.inputValue())).toBeCloseTo(upper - 0.01, 8);

  await input.press('Home');
  const lower = 1 / 1024;
  expect(Number(await input.inputValue())).toBeCloseTo(lower, 8);
  await page.keyboard.down('ArrowLeft');
  for (let repeat = 0; repeat < 4; repeat += 1)
    await page.keyboard.down('ArrowLeft');
  await page.keyboard.up('ArrowLeft');
  await input.press('ArrowRight');
  expect(Number(await input.inputValue())).toBeCloseTo(lower + 0.01, 8);
  await input.press('Alt+ArrowRight');
  expect(Number(await input.inputValue())).toBeCloseTo(lower + 0.011, 8);
  await input.press('Shift+ArrowRight');
  expect(Number(await input.inputValue())).toBeCloseTo(lower + 0.111, 8);
  await expect(thumb).toHaveAttribute('data-curve-keyboard-focus', 'true');
  await input.press('Delete');
  await expect(thumb).toHaveCount(0);
});
