import { expect, test } from '@playwright/test';

const PHOTO = '**/color-curves-portrait.jpg';
const fixture =
  '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><defs><linearGradient id="tone"><stop stop-color="#202020"/><stop offset="1" stop-color="#e0e0e0"/></linearGradient></defs><rect width="512" height="512" fill="url(#tone)"/></svg>';

test('photo curves edit pixels and manage focused points in equal square frames', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route(PHOTO, (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: fixture,
      headers: { 'access-control-allow-origin': '*' },
    }),
  );
  await page.goto('/docs/plane-examples');
  const plane = page.getByRole('group', {
    name: 'Color curves control',
    exact: true,
  });
  const frame = page.locator('figure').filter({ has: plane });
  const photo = frame.locator('canvas');
  const thumbs = plane.locator('[data-slot="plane-thumb"]');
  await expect(photo).toHaveAttribute('data-photo-state', 'ready');
  await plane.scrollIntoViewIfNeeded();
  const pixels = () =>
    photo.evaluate((canvas: HTMLCanvasElement) =>
      Array.from(canvas.getContext('2d')!.getImageData(255, 255, 1, 1).data),
    );
  const original = await pixels();
  const box = (await plane.boundingBox())!;
  const image = (await photo.boundingBox())!;
  expect(box.width).toBe(box.height);
  expect(image.width).toBe(box.width);
  expect(image.height).toBe(box.height);
  if (testInfo.project.name === 'mobile') {
    expect(image.x).toBe(box.x);
    expect(image.y).toBeLessThan(box.y);
  } else {
    expect(image.y).toBe(box.y);
    expect(image.x).toBeLessThan(box.x);
  }
  await expect(thumbs).toHaveCount(2);
  await plane.click({ position: { x: box.width * 0.2, y: box.height * 0.2 } });
  await expect(thumbs).toHaveCount(2);
  await plane.click({ position: { x: box.width * 0.4, y: box.height * 0.6 } });
  await expect(thumbs).toHaveCount(3);
  const added = plane.locator('[data-thumb-id="point-0"]');
  const handle = (await added.boundingBox())!;
  await page.mouse.move(
    handle.x + handle.width / 2,
    handle.y + handle.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.2, {
    steps: 8,
  });
  await page.mouse.up();
  await expect.poll(pixels).not.toEqual(original);
  await expect(added).not.toHaveAttribute('data-focus-visible');
  await page.keyboard.press('Backspace');
  await expect(thumbs).toHaveCount(3);
  await page.keyboard.press('Tab');
  await expect(added).toHaveAttribute('data-focus-visible', 'true');
  await page.keyboard.press('Delete');
  await expect(thumbs).toHaveCount(2);
  await expect(plane.locator('[data-focused]')).toHaveCount(1);
  await page.keyboard.press('Backspace');
  await expect(thumbs).toHaveCount(2);
  await frame.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect.poll(pixels).toEqual(original);
  for (const modifier of ['Control', 'Meta'] as const) {
    await plane.click({
      position: { x: box.width * 0.4, y: box.height * 0.6 },
    });
    await expect(thumbs).toHaveCount(3);
    await thumbs.first().click({ modifiers: [modifier] });
    await expect(thumbs).toHaveCount(2);
    await frame.getByRole('button', { name: 'Reset', exact: true }).click();
  }
  await frame
    .getByRole('combobox', { name: 'Curve channel' })
    .selectOption('Red');
  await plane.click({ position: { x: box.width * 0.5, y: box.height * 0.5 } });
  const red = plane.locator('[data-thumb-id="point-3"]');
  await red.locator('input').first().focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('ArrowUp');
  await expect
    .poll(async () => (await pixels())[0])
    .toBeGreaterThan(original[0]);
  const adjusted = await pixels();
  expect(adjusted.slice(1)).toEqual(original.slice(1));
  expect(errors).toEqual([]);
});

test('photo loading failure offers a working retry', async ({ page }) => {
  await page.route(PHOTO, (route) => route.abort());
  await page.goto('/docs/plane-examples');
  const plane = page.getByRole('group', {
    name: 'Color curves control',
    exact: true,
  });
  const frame = page.locator('figure').filter({ has: plane });
  await expect(
    frame.getByText('The portrait could not be loaded.'),
  ).toBeVisible();
  await page.unroute(PHOTO);
  await page.route(PHOTO, (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: fixture,
      headers: { 'access-control-allow-origin': '*' },
    }),
  );
  await frame.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(frame.locator('canvas')).toHaveAttribute(
    'data-photo-state',
    'ready',
  );
});

test('bundled portrait remains editable when remote image hosts are unavailable', async ({
  page,
}) => {
  await page.route('https://images.unsplash.com/**', (route) => route.abort());
  await page.goto('/docs/plane-examples#color-curves');
  const plane = page.getByRole('group', {
    name: 'Color curves control',
    exact: true,
  });
  const frame = page.locator('figure').filter({ has: plane });
  const photo = frame.locator('canvas');
  await expect(photo).toHaveAttribute('data-photo-state', 'ready');
  await plane.scrollIntoViewIfNeeded();
  const pixels = () =>
    photo.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  const original = await pixels();
  const high = plane.locator('[data-thumb-id="white"]').locator('input').last();
  await high.focus();
  await high.press('ArrowDown');
  await expect.poll(pixels).not.toEqual(original);
});
