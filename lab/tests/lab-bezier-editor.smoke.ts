import { expect, test, type Locator, type Page } from '@playwright/test';
import { collectBrowserErrors } from './lab-smoke-utils.js';

const EXAMPLE_NAME = 'Bezier control-point editor demo';

async function replaceControlFieldValue(field: Locator, value: string) {
  await field.click();
  await field.press('ControlOrMeta+A');
  await field.pressSequentially(value);
  await field.press('Enter');
}

function cssPointToClient(
  bounds: { x: number; y: number; width: number; height: number },
  x: number,
  y: number,
) {
  const normalizedX = (2 + x * 8) / 12;
  const normalizedY = (2 + y * 8) / 12;
  return {
    x: bounds.x + normalizedX * bounds.width,
    y: bounds.y + (1 - normalizedY) * bounds.height,
  };
}

async function dragThumbTo(
  page: Page,
  example: Locator,
  thumbIndex: number,
  x: number,
  y: number,
  shiftKey = false,
) {
  const thumb = example.locator('[data-slot="plane-thumb"]').nth(thumbIndex);
  const plane = example.locator('[data-slot="plane"]');
  const [thumbBounds, planeBounds] = await Promise.all([
    thumb.boundingBox(),
    plane.boundingBox(),
  ]);
  expect(thumbBounds).not.toBeNull();
  expect(planeBounds).not.toBeNull();

  const target = cssPointToClient(planeBounds!, x, y);
  await page.mouse.move(
    thumbBounds!.x + thumbBounds!.width / 2,
    thumbBounds!.y + thumbBounds!.height / 2,
  );
  if (shiftKey) await page.keyboard.down('Shift');
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 4 });
  await page.mouse.up();
  if (shiftKey) await page.keyboard.up('Shift');
}

function parseBezier(value: string | null) {
  const values = value?.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
  expect(values).toHaveLength(4);
  return values!;
}

async function openBezierExample(page: Page) {
  await page.goto('/docs/plane-examples');
  const example = page.getByRole('figure', {
    name: EXAMPLE_NAME,
    exact: true,
  });
  await example.scrollIntoViewIfNeeded();
  return example;
}

test('uses Control Fields and renders the 12 × 12 orange Bezier editor', async ({
  page,
}) => {
  const browserErrors = await collectBrowserErrors(page);
  const example = await openBezierExample(page);

  const curve = example.locator('[data-bezier-curve]');
  const value = example.locator('[data-bezier-value]');
  const plane = example.locator('[data-slot="plane"]');
  const controlFields = example.locator('[data-slot="control-field"]');

  await expect(plane.locator('[data-slot="plane-thumb"]')).toHaveCount(2);
  await expect(controlFields).toHaveCount(4);
  await expect(value).toHaveText('cubic-bezier(0.45, 0.03, 0.36, 1.00)');

  for (const name of ['x1', 'y1', 'x2', 'y2']) {
    await expect(
      example.getByRole('textbox', {
        name: `${name} Bezier value`,
        exact: true,
      }),
    ).toBeVisible();
  }

  await expect(example.locator('[data-grid-line="vertical"]')).toHaveCount(13);
  await expect(example.locator('[data-grid-line="horizontal"]')).toHaveCount(
    13,
  );
  await expect(
    example.locator('[data-bezier-endpoint="start"]'),
  ).toHaveAttribute('cx', '60');
  await expect(
    example.locator('[data-bezier-endpoint="start"]'),
  ).toHaveAttribute('cy', '300');
  await expect(example.locator('[data-bezier-endpoint="end"]')).toHaveAttribute(
    'cx',
    '300',
  );
  await expect(example.locator('[data-bezier-endpoint="end"]')).toHaveAttribute(
    'cy',
    '60',
  );
  await expect(curve).toHaveAttribute('stroke', '#fb923c');
  await expect(plane.locator('[data-slot="plane-thumb"]').first()).toHaveCSS(
    'border-top-color',
    'rgb(251, 146, 60)',
  );

  const planeBounds = await plane.boundingBox();
  expect(planeBounds).not.toBeNull();
  expect(Math.abs(planeBounds!.width - planeBounds!.height)).toBeLessThan(1);
  expect(planeBounds!.width).toBeGreaterThan(
    page.viewportSize()!.width >= 1000 ? 350 : 260,
  );
  expect(planeBounds!.width).toBeLessThanOrEqual(360);

  const exampleBounds = await example.boundingBox();
  const controlsBounds = await controlFields.last().boundingBox();
  expect(exampleBounds).not.toBeNull();
  expect(controlsBounds).not.toBeNull();
  expect(controlsBounds!.x + controlsBounds!.width).toBeLessThanOrEqual(
    exampleBounds!.x + exampleBounds!.width + 1,
  );
  expect(browserErrors).toEqual([]);
});

test('updates the Bezier curve through keyboard and Control Field scrubbing', async ({
  page,
}) => {
  const browserErrors = await collectBrowserErrors(page);
  const example = await openBezierExample(page);
  const curve = example.locator('[data-bezier-curve]');
  const value = example.locator('[data-bezier-value]');

  const x1 = example.getByRole('textbox', {
    name: 'x1 Bezier value',
    exact: true,
  });

  const initialCurve = await curve.getAttribute('d');
  await x1.focus();
  await x1.press('ArrowUp');
  await expect(x1).toBeFocused();
  await expect(value).toHaveText('cubic-bezier(0.46, 0.03, 0.36, 1.00)');
  const firstSteppedCurve = await curve.getAttribute('d');
  expect(firstSteppedCurve).not.toBe(initialCurve);
  await x1.press('ArrowUp');
  await expect(x1).toBeFocused();
  await expect(value).toHaveText('cubic-bezier(0.47, 0.03, 0.36, 1.00)');

  const scrubArea = example.getByLabel('Scrub x1 Bezier value', {
    exact: true,
  });
  const scrubBounds = await scrubArea.boundingBox();
  expect(scrubBounds).not.toBeNull();
  const curveBeforeScrub = await curve.getAttribute('d');
  await page.mouse.move(
    scrubBounds!.x + scrubBounds!.width / 2,
    scrubBounds!.y + scrubBounds!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    scrubBounds!.x + scrubBounds!.width / 2 + 24,
    scrubBounds!.y + scrubBounds!.height / 2,
  );
  await expect(curve).not.toHaveAttribute('d', curveBeforeScrub ?? '');
  await page.mouse.up();
  expect(browserErrors).toEqual([]);
});

test('clamps Control Field values and applies them to the curve preview', async ({
  page,
}) => {
  const browserErrors = await collectBrowserErrors(page);
  const example = await openBezierExample(page);
  const curve = example.locator('[data-bezier-curve]');
  const value = example.locator('[data-bezier-value]');
  const preview = example.locator('[data-bezier-preview]');
  const previewSquare = example.locator('[data-bezier-preview-square]');
  const x1 = example.getByRole('textbox', {
    name: 'x1 Bezier value',
    exact: true,
  });
  const y1 = example.getByRole('textbox', {
    name: 'y1 Bezier value',
    exact: true,
  });
  const x2 = example.getByRole('textbox', {
    name: 'x2 Bezier value',
    exact: true,
  });
  const y2 = example.getByRole('textbox', {
    name: 'y2 Bezier value',
    exact: true,
  });

  await replaceControlFieldValue(x1, '0');
  await replaceControlFieldValue(y1, '0');
  await replaceControlFieldValue(x2, '1');
  await replaceControlFieldValue(y2, '1');
  await expect(value).toHaveText('cubic-bezier(0.00, 0.00, 1.00, 1.00)');
  const linearPath = await curve.getAttribute('d');
  const pathCoordinates = linearPath?.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
  expect(pathCoordinates).toEqual([60, 300, 60, 300, 300, 60, 300, 60]);
  for (let index = 0; index < pathCoordinates!.length; index += 2) {
    expect(pathCoordinates![index] + pathCoordinates![index + 1]).toBe(360);
  }

  await replaceControlFieldValue(x2, '1.2');
  await expect(value).toHaveText('cubic-bezier(0.00, 0.00, 1.00, 1.00)');
  await expect(
    example.getByRole('textbox', {
      name: 'x2 Bezier value',
      exact: true,
    }),
  ).toHaveValue('1.00');
  await replaceControlFieldValue(y2, '1.4');
  await expect(value).toHaveText('cubic-bezier(0.00, 0.00, 1.00, 1.25)');
  await replaceControlFieldValue(y1, '-0.4');
  await expect(value).toHaveText('cubic-bezier(0.00, -0.25, 1.00, 1.25)');

  await expect(preview).toHaveCSS('border-top-width', '0px');
  await expect(example.locator('[data-bezier-preview-dot]')).toHaveCount(0);
  await expect(previewSquare).toHaveAttribute('data-replay', '0');
  await expect(previewSquare).toHaveCSS(
    'animation-timing-function',
    'cubic-bezier(0, -0.25, 1, 1.25)',
  );
  await example.getByRole('button', { name: 'Replay', exact: true }).click();
  await expect(previewSquare).toHaveAttribute('data-replay', '1');
  await expect(previewSquare).toHaveCSS('animation-name', 'ck-bezier-preview');

  expect(browserErrors).toEqual([]);
});

test('Shift-snaps either handle to the nearest endpoint axis', async ({
  page,
}) => {
  const browserErrors = await collectBrowserErrors(page);
  await page.goto('/docs/plane-examples');

  const example = page.getByRole('figure', {
    name: EXAMPLE_NAME,
    exact: true,
  });
  await example.scrollIntoViewIfNeeded();
  const value = example.locator('[data-bezier-value]');

  await dragThumbTo(page, example, 0, 0.45, -0.16, true);
  let points = parseBezier(await value.textContent());
  expect(points[0]).toBeGreaterThan(0);
  expect(points[1]).toBe(0);

  await dragThumbTo(page, example, 0, 0.09, 0.62, true);
  points = parseBezier(await value.textContent());
  expect(points[0]).toBe(0);
  expect(points[1]).toBeGreaterThan(0);

  await dragThumbTo(page, example, 1, 0.5, 1.2, true);
  points = parseBezier(await value.textContent());
  expect(points[2]).toBeLessThan(1);
  expect(points[3]).toBe(1);

  await dragThumbTo(page, example, 1, 0.91, 0.28, true);
  points = parseBezier(await value.textContent());
  expect(points[2]).toBe(1);
  expect(points[3]).toBeLessThan(1);

  const firstThumb = example.locator('[data-slot="plane-thumb"]').first();
  const plane = example.locator('[data-slot="plane"]');
  const [thumbBounds, planeBounds] = await Promise.all([
    firstThumb.boundingBox(),
    plane.boundingBox(),
  ]);
  expect(thumbBounds).not.toBeNull();
  expect(planeBounds).not.toBeNull();
  await page.mouse.move(
    thumbBounds!.x + thumbBounds!.width / 2,
    thumbBounds!.y + thumbBounds!.height / 2,
  );
  await page.mouse.down();
  let target = cssPointToClient(planeBounds!, 0.45, 0.3);
  await page.mouse.move(target.x, target.y);
  points = parseBezier(await value.textContent());
  expect(points[0]).toBeCloseTo(0.45, 1);
  expect(points[1]).toBeCloseTo(0.3, 1);

  await page.keyboard.down('Shift');
  target = cssPointToClient(planeBounds!, 0.5, 0.31);
  await page.mouse.move(target.x, target.y);
  points = parseBezier(await value.textContent());
  expect(points[0]).toBeGreaterThan(0);
  expect(points[1]).toBe(0);

  await page.keyboard.up('Shift');
  target = cssPointToClient(planeBounds!, 0.52, 0.32);
  await page.mouse.move(target.x, target.y);
  points = parseBezier(await value.textContent());
  expect(points[0]).toBeCloseTo(0.52, 1);
  expect(points[1]).toBeCloseTo(0.32, 1);
  await page.mouse.up();

  await page.keyboard.down('Shift');
  target = cssPointToClient(planeBounds!, 0.2, 0.08);
  await page.mouse.click(target.x, target.y);
  await page.keyboard.up('Shift');
  points = parseBezier(await value.textContent());
  expect(points[0]).toBeGreaterThan(0);
  expect(points[1]).toBe(0);

  await dragThumbTo(page, example, 0, 0.2, 0.08);
  points = parseBezier(await value.textContent());
  expect(points[0]).toBeCloseTo(0.2, 1);
  expect(points[1]).toBeCloseTo(0.08, 1);

  const firstX = example.getByRole('slider', {
    name: 'First control point X',
    exact: true,
  });
  const beforeKeyboard = points[0];
  const beforeKeyboardY = points[1];
  await firstX.focus();
  await firstX.press('ArrowRight');
  points = parseBezier(await value.textContent());
  expect(points[0]).toBeCloseTo(beforeKeyboard + 0.01, 2);
  expect(points[1]).toBe(beforeKeyboardY);
  await firstX.press('Shift+ArrowRight');
  points = parseBezier(await value.textContent());
  expect(points[0]).toBeCloseTo(beforeKeyboard + 0.11, 2);
  expect(points[1]).toBe(beforeKeyboardY);
  expect(browserErrors).toEqual([]);
});

test('honors reduced motion for the rotating square preview', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/docs/plane-examples');

  const example = page.getByRole('figure', {
    name: EXAMPLE_NAME,
    exact: true,
  });
  const previewSquare = example.locator('[data-bezier-preview-square]');
  await example.scrollIntoViewIfNeeded();

  await expect(previewSquare).toHaveCSS('animation-name', 'none');
});
