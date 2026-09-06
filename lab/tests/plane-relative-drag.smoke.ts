import { expect, test } from '@playwright/test';

test('relative dragging pans the image while the focal point requires a direct press', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/docs/plane-examples#image-pan-and-focal-point');
  const example = page.getByRole('figure', {
    name: 'Image pan and focal point demo',
    exact: true,
  });
  await example.scrollIntoViewIfNeeded();
  const plane = example.locator('[data-slot="plane"]');
  const panX = example.getByRole('slider', {
    name: 'Image pan, horizontal position',
    exact: true,
  });
  const panY = example.getByRole('slider', {
    name: 'Image pan, vertical position',
    exact: true,
  });
  const focalX = example.getByRole('slider', {
    name: 'Focal point, horizontal position',
    exact: true,
  });
  const focalY = example.getByRole('slider', {
    name: 'Focal point, vertical position',
    exact: true,
  });
  const bounds = await plane.boundingBox();
  if (!bounds) throw new Error('The image plane has no bounds.');

  // This empty-space press is much nearer the focal point than the pan thumb.
  const start = {
    x: bounds.x + bounds.width * 0.86,
    y: bounds.y + bounds.height * 0.35,
  };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await expect(panX).toHaveValue('0.5');
  await expect(panY).toHaveValue('0.5');
  await expect(focalX).toHaveValue('0.72');
  await page.mouse.move(
    start.x - bounds.width * 0.1,
    start.y + bounds.height * 0.1,
    { steps: 5 },
  );
  await page.mouse.up();
  await expect
    .poll(async () => Number(await panX.inputValue()))
    .toBeCloseTo(0.4, 2);
  await expect
    .poll(async () => Number(await panY.inputValue()))
    .toBeCloseTo(0.4, 2);
  await expect(focalX).toHaveValue('0.72');
  await expect(focalY).toHaveValue('0.65');

  const focal = example.locator('[data-thumb-id="focal-point"]');
  const focalBounds = await focal.boundingBox();
  if (!focalBounds) throw new Error('The focal point has no bounds.');
  // Grab off-center to prove direct dragging preserves the grabbed offset too.
  const grab = {
    x: focalBounds.x + focalBounds.width / 2 + 6,
    y: focalBounds.y + focalBounds.height / 2,
  };
  await page.mouse.move(grab.x, grab.y);
  await page.mouse.down();
  await expect(focalX).toHaveValue('0.72');
  await expect(focalY).toHaveValue('0.65');
  await page.mouse.move(
    grab.x - bounds.width * 0.1,
    grab.y + bounds.height * 0.1,
    { steps: 5 },
  );
  await page.mouse.up();
  await expect
    .poll(async () => Number(await focalX.inputValue()))
    .toBeCloseTo(0.62, 2);
  await expect
    .poll(async () => Number(await focalY.inputValue()))
    .toBeCloseTo(0.55, 2);
  await expect
    .poll(async () => Number(await panX.inputValue()))
    .toBeCloseTo(0.4, 2);
  await expect
    .poll(async () => Number(await panY.inputValue()))
    .toBeCloseTo(0.4, 2);
  const beforeKey = Number(await focalX.inputValue());
  await focalX.focus();
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(async () => Number(await focalX.inputValue()))
    .toBeGreaterThan(beforeKey);
  expect(errors).toEqual([]);
});
