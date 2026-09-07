import { expect, test } from '@playwright/test';

test('gradient origin carries its radius thumb; the radius changes independently', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/docs/plane-examples');
  const example = page.getByRole('figure', {
    name: 'Gradient origin + radius demo',
    exact: true,
  });
  await example.scrollIntoViewIfNeeded();
  const plane = example.locator('[data-slot="plane"]');
  const origin = example.locator('[data-thumb-id="gradient-origin"]');
  const radius = example.locator('[data-thumb-id="gradient-radius"]');
  const x = example.getByRole('slider', {
    name: 'Gradient origin horizontal position',
    exact: true,
  });
  const radiusX = example.getByRole('slider', {
    name: 'Gradient radius horizontal offset',
    exact: true,
  });
  const radiusY = example.getByRole('slider', {
    name: 'Gradient radius vertical offset',
    exact: true,
  });
  const bounds = await plane.boundingBox();
  if (!bounds) throw new Error('Missing gradient bounds');
  const center = async (locator: typeof origin) => {
    const rect = await locator.boundingBox();
    if (!rect) throw new Error('Missing thumb bounds');
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  };
  const oldRadius = await center(radius);
  const oldOrigin = await center(origin);
  await page.mouse.move(oldOrigin.x, oldOrigin.y);
  await page.mouse.down();
  await page.mouse.move(
    oldOrigin.x + bounds.width * 0.15,
    oldOrigin.y + bounds.height * 0.1,
    { steps: 5 },
  );
  await page.mouse.up();
  await expect
    .poll(async () => Number(await x.inputValue()))
    .toBeCloseTo(0.49, 2);
  await expect(radiusX).toHaveValue('0.36');
  await expect(radiusY).toHaveValue('-0.12');
  const carriedRadius = await center(radius);
  expect(carriedRadius.x - oldRadius.x).toBeCloseTo(bounds.width * 0.15, 0);
  expect(carriedRadius.y - oldRadius.y).toBeCloseTo(bounds.height * 0.1, 0);

  const background = plane.locator('[style*="radial-gradient"]');
  const before = await background.getAttribute('style');
  await page.mouse.move(carriedRadius.x, carriedRadius.y);
  await page.mouse.down();
  await page.mouse.move(carriedRadius.x - bounds.width * 0.1, carriedRadius.y, {
    steps: 5,
  });
  await page.mouse.up();
  await expect
    .poll(async () => Number(await radiusX.inputValue()))
    .toBeCloseTo(0.26, 2);
  await expect
    .poll(async () => Number(await x.inputValue()))
    .toBeCloseTo(0.49, 2);
  expect(await background.getAttribute('style')).not.toBe(before);

  await radiusX.focus();
  await page.keyboard.press('ArrowLeft');
  await expect
    .poll(async () => Number(await radiusX.inputValue()))
    .toBeCloseTo(0.25, 2);
  await expect
    .poll(async () => Number(await x.inputValue()))
    .toBeCloseTo(0.49, 2);
  // An offset on the opposite side of the origin remains valid.
  await page.keyboard.press('Home');
  await expect(radiusX).toHaveValue('-1');
  await x.focus();
  await page.keyboard.press('ArrowRight');
  await expect(radiusX).toHaveValue('-1');
  await expect
    .poll(async () => Number(await x.inputValue()))
    .toBeCloseTo(0.5, 2);
  expect(errors).toEqual([]);
});
