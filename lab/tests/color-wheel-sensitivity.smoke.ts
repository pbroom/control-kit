import { expect, test } from '@playwright/test';

const EXAMPLE_NAME =
  'Color grading controls — Circular controls (3-way color adjuster) demo';
const TONE_LABELS = ['Highlights', 'Midtones', 'Shadows'] as const;

function center(bounds: {
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

test('all three color wheels use quarter-distance relative dragging without changing keyboard steps', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('/docs/plane-examples#three-way-color-adjuster');
  await expect(page).toHaveTitle(/Control Kit/);
  const example = page.getByRole('figure', {
    name: EXAMPLE_NAME,
    exact: true,
  });
  await example.scrollIntoViewIfNeeded();
  await expect(example).toBeVisible();
  await expect(example.locator('[data-tone-control]')).toHaveCount(3);
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);

  for (const label of TONE_LABELS) {
    const plane = example.getByRole('group', {
      name: `${label} color balance`,
      exact: true,
    });
    const thumb = plane.locator('[data-slot="plane-thumb"]');
    const xAxis = plane.locator('[data-plane-axis="x"]');
    const yAxis = plane.locator('[data-plane-axis="y"]');
    const planeBounds = await plane.boundingBox();
    const firstThumbBounds = await thumb.boundingBox();
    if (!planeBounds || !firstThumbBounds) {
      throw new Error(`${label} wheel geometry is unavailable.`);
    }

    const firstStart = center(firstThumbBounds);
    const firstPointerDelta = {
      x: planeBounds.width * 0.2,
      y: -planeBounds.height * 0.16,
    };
    const firstX = Number(await xAxis.inputValue());
    const firstY = Number(await yAxis.inputValue());
    await page.mouse.move(firstStart.x, firstStart.y);
    await page.mouse.down();
    await page.mouse.move(
      firstStart.x + firstPointerDelta.x,
      firstStart.y + firstPointerDelta.y,
      { steps: 5 },
    );
    await page.mouse.up();

    await expect
      .poll(async () => Number(await xAxis.inputValue()))
      .toBeCloseTo(firstX + 0.05, 4);
    await expect
      .poll(async () => Number(await yAxis.inputValue()))
      .toBeCloseTo(firstY + 0.04, 4);
    const secondThumbBounds = await thumb.boundingBox();
    if (!secondThumbBounds) throw new Error(`${label} thumb disappeared.`);
    const secondCenter = center(secondThumbBounds);
    expect(secondCenter.x - firstStart.x).toBeCloseTo(
      firstPointerDelta.x * 0.25,
      0,
    );
    expect(secondCenter.y - firstStart.y).toBeCloseTo(
      firstPointerDelta.y * 0.25,
      0,
    );

    const secondPointerDelta = {
      x: -planeBounds.width * 0.12,
      y: planeBounds.height * 0.08,
    };
    await page.mouse.move(secondCenter.x, secondCenter.y);
    await page.mouse.down();
    await page.mouse.move(
      secondCenter.x + secondPointerDelta.x,
      secondCenter.y + secondPointerDelta.y,
      { steps: 4 },
    );
    await page.mouse.up();

    await expect
      .poll(async () => Number(await xAxis.inputValue()))
      .toBeCloseTo(firstX + 0.02, 4);
    await expect
      .poll(async () => Number(await yAxis.inputValue()))
      .toBeCloseTo(firstY + 0.02, 4);
    const finalThumbBounds = await thumb.boundingBox();
    if (!finalThumbBounds) throw new Error(`${label} thumb disappeared.`);
    const finalCenter = center(finalThumbBounds);
    expect(finalCenter.x - secondCenter.x).toBeCloseTo(
      secondPointerDelta.x * 0.25,
      0,
    );
    expect(finalCenter.y - secondCenter.y).toBeCloseTo(
      secondPointerDelta.y * 0.25,
      0,
    );
  }

  const highlightsPlane = example.getByRole('group', {
    name: 'Highlights color balance',
    exact: true,
  });
  const highlightsX = highlightsPlane.locator('[data-plane-axis="x"]');
  const beforeKeyboard = Number(await highlightsX.inputValue());
  await highlightsX.focus();
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(async () => Number(await highlightsX.inputValue()))
    .toBeCloseTo(beforeKeyboard + 0.01, 4);

  expect(errors).toEqual([]);
});
