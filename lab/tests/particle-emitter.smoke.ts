import { expect, test, type Locator, type Page } from '@playwright/test';
import { collectBrowserErrors } from './lab-smoke-utils.js';

async function openEmitterExample(page: Page) {
  await page.goto('/docs/plane-examples#particle-emitter-direction-spread');
  const example = page.getByRole('figure', {
    name: 'Particle emitter direction/spread demo',
    exact: true,
  });
  await example.scrollIntoViewIfNeeded();
  const canvas = example.locator('[data-emitter-canvas]');
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-emitter-state', /running|static/);
  return example;
}

async function setPlaneValue(page: Page, plane: Locator, x: number, y: number) {
  const bounds = await plane.boundingBox();
  if (!bounds) throw new Error('The particle emitter Plane has no bounds.');
  await page.mouse.click(
    bounds.x + bounds.width * x,
    bounds.y + bounds.height * (1 - y),
  );
}

async function numberAttribute(locator: Locator, name: string) {
  return Number(await locator.getAttribute(name));
}

test('emits a bounded, continuously moving particle pool inside the Plane', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === 'mobile',
    'Covered in the desktop lifecycle pass.',
  );
  const errors = await collectBrowserErrors(page);
  const example = await openEmitterExample(page);
  const plane = example.locator('[data-emitter-plane]');
  const canvas = example.locator('[data-emitter-canvas]');
  const source = example.locator('[data-emitter-source]');
  const thumb = example.locator('[data-slot="plane-thumb"]');

  await expect(canvas).toHaveCount(1);
  await expect(source).toHaveCount(1);
  expect(
    await canvas.evaluate(
      (node) => node.parentElement?.hasAttribute('data-emitter-plane') ?? false,
    ),
  ).toBe(true);
  await expect(canvas).toHaveCSS('pointer-events', 'none');
  expect(
    Number(await thumb.evaluate((node) => getComputedStyle(node).zIndex)),
  ).toBeGreaterThan(
    Number(await canvas.evaluate((node) => getComputedStyle(node).zIndex)) || 0,
  );

  const [planeBounds, canvasBounds, sourceBounds] = await Promise.all([
    plane.boundingBox(),
    canvas.boundingBox(),
    source.boundingBox(),
  ]);
  if (!planeBounds || !canvasBounds || !sourceBounds) {
    throw new Error('The particle emitter did not render measurable bounds.');
  }
  expect(Math.abs(canvasBounds.x - (planeBounds.x + 1))).toBeLessThan(0.1);
  expect(Math.abs(canvasBounds.y - (planeBounds.y + 1))).toBeLessThan(0.1);
  expect(Math.abs(canvasBounds.width - (planeBounds.width - 2))).toBeLessThan(
    0.1,
  );
  expect(Math.abs(canvasBounds.height - (planeBounds.height - 2))).toBeLessThan(
    0.1,
  );
  expect(sourceBounds.x + sourceBounds.width / 2).toBeCloseTo(
    planeBounds.x + planeBounds.width / 2,
    0,
  );
  expect(sourceBounds.y + sourceBounds.height / 2).toBeCloseTo(
    planeBounds.y + planeBounds.height / 2,
    0,
  );

  const initialTravel = await numberAttribute(
    canvas,
    'data-emitter-travel-distance',
  );
  const initialSpawns = await numberAttribute(
    canvas,
    'data-emitter-spawn-count',
  );
  await page.waitForTimeout(180);
  expect(
    await numberAttribute(canvas, 'data-emitter-travel-distance'),
  ).toBeGreaterThan(initialTravel);
  expect(
    await numberAttribute(canvas, 'data-emitter-spawn-count'),
  ).toBeGreaterThan(initialSpawns);

  await page.waitForTimeout(1_150);
  const particleCount = await numberAttribute(
    canvas,
    'data-emitter-particle-count',
  );
  expect(particleCount).toBeGreaterThan(0);
  expect(particleCount).toBeLessThanOrEqual(
    await numberAttribute(canvas, 'data-emitter-max-particles'),
  );
  expect(await numberAttribute(canvas, 'data-emitter-out-of-bounds')).toBe(0);
  expect(errors).toEqual([]);
});

test('pointer changes direction and spread without resetting the emitter', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === 'mobile',
    'Covered in the desktop trajectory pass.',
  );
  const errors = await collectBrowserErrors(page);
  const example = await openEmitterExample(page);
  const plane = example.locator('[data-emitter-plane]');
  const canvas = example.locator('[data-emitter-canvas]');

  await setPlaneValue(page, plane, 0.5, 0.5);
  await expect(canvas).toHaveAttribute('data-emitter-angle', '0.000');
  await expect(canvas).toHaveAttribute('data-emitter-spread', '8.000');
  const centeredSpawnCount = await numberAttribute(
    canvas,
    'data-emitter-spawn-count',
  );

  await setPlaneValue(page, plane, 0.95, 0.5);
  await expect(canvas).toHaveAttribute('data-emitter-angle', '0.000');
  await expect(canvas).toHaveAttribute('data-emitter-spread', '35.000');
  await expect(example.locator('output')).toHaveText('0° · 35° spread');
  await expect
    .poll(() => numberAttribute(canvas, 'data-emitter-spawn-count'))
    .toBeGreaterThan(centeredSpawnCount);
  const rightVelocity = {
    x: await numberAttribute(canvas, 'data-emitter-newest-velocity-x'),
    y: await numberAttribute(canvas, 'data-emitter-newest-velocity-y'),
  };
  expect(rightVelocity.x).toBeGreaterThan(0);
  expect(Math.abs(rightVelocity.y / rightVelocity.x)).toBeLessThan(0.34);

  const spawnCountBeforeTurn = await numberAttribute(
    canvas,
    'data-emitter-spawn-count',
  );
  await setPlaneValue(page, plane, 0.5, 0.95);
  await expect(canvas).toHaveAttribute('data-emitter-angle', '90.000');
  await expect
    .poll(() => numberAttribute(canvas, 'data-emitter-spawn-count'))
    .toBeGreaterThan(spawnCountBeforeTurn);
  const upwardVelocity = {
    x: await numberAttribute(canvas, 'data-emitter-newest-velocity-x'),
    y: await numberAttribute(canvas, 'data-emitter-newest-velocity-y'),
  };
  expect(upwardVelocity.y).toBeGreaterThan(0);
  expect(Math.abs(upwardVelocity.x / upwardVelocity.y)).toBeLessThan(0.34);
  expect(errors).toEqual([]);
});

test('Plane pointer and keyboard input stay usable at desktop and mobile sizes', async ({
  page,
}) => {
  const errors = await collectBrowserErrors(page);
  const example = await openEmitterExample(page);
  const plane = example.locator('[data-emitter-plane]');
  const canvas = example.locator('[data-emitter-canvas]');
  const horizontal = example.getByRole('slider', {
    name: 'Emitter direction X',
    exact: true,
  });
  const vertical = example.getByRole('slider', {
    name: 'Emitter direction Y',
    exact: true,
  });

  const bounds = await plane.boundingBox();
  if (!bounds) throw new Error('The particle emitter Plane did not render.');
  expect(bounds.width).toBe(bounds.height);
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );

  await setPlaneValue(page, plane, 0.8, 0.8);
  await expect(canvas).toHaveAttribute('data-emitter-angle', '45.000');
  await setPlaneValue(page, plane, 0.5, 0.5);
  await horizontal.focus();
  await horizontal.press('ArrowRight');
  await expect(horizontal).toHaveValue('0.51');
  await expect(canvas).toHaveAttribute('data-emitter-angle', '0.000');
  await vertical.focus();
  await vertical.press('ArrowUp');
  await expect(vertical).toHaveValue('0.51');
  await expect(canvas).toHaveAttribute('data-emitter-angle', '45.000');
  expect(errors).toEqual([]);
});

test('reduced motion keeps a deterministic static preview with no animation loop', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === 'mobile',
    'Covered in the desktop reduced-motion pass.',
  );
  const errors = await collectBrowserErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const example = await openEmitterExample(page);
  const plane = example.locator('[data-emitter-plane]');
  const canvas = example.locator('[data-emitter-canvas]');

  await expect(canvas).toHaveAttribute('data-emitter-reduced', 'true');
  await expect(canvas).toHaveAttribute('data-emitter-state', 'static');
  await expect(canvas).toHaveAttribute(
    'data-emitter-rendered-particle-count',
    '11',
  );
  const firstFrameCount = await numberAttribute(
    canvas,
    'data-emitter-frame-count',
  );
  const firstImage = await canvas.screenshot();
  await page.waitForTimeout(300);
  expect(await numberAttribute(canvas, 'data-emitter-frame-count')).toBe(
    firstFrameCount,
  );
  expect((await canvas.screenshot()).equals(firstImage)).toBe(true);

  await setPlaneValue(page, plane, 0.1, 0.5);
  await expect(canvas).toHaveAttribute('data-emitter-angle', '180.000');
  expect((await canvas.screenshot()).equals(firstImage)).toBe(false);
  expect(errors).toEqual([]);
});

test('pauses offscreen and disposes its frame on unmount', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === 'mobile',
    'Covered in the desktop lifecycle pass.',
  );
  const errors = await collectBrowserErrors(page);
  const example = await openEmitterExample(page);
  const canvas = example.locator('[data-emitter-canvas]');

  await canvas.evaluate((node) => {
    node.parentElement?.style.setProperty('transform', 'translateY(-5000px)');
  });
  await expect(canvas).toHaveAttribute('data-emitter-state', 'offscreen');
  const pausedFrameCount = await numberAttribute(
    canvas,
    'data-emitter-frame-count',
  );
  await page.waitForTimeout(250);
  expect(await numberAttribute(canvas, 'data-emitter-frame-count')).toBe(
    pausedFrameCount,
  );

  await canvas.evaluate((node) => {
    node.parentElement?.style.removeProperty('transform');
  });
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-emitter-state', 'running');
  await canvas.evaluate((node) => {
    Object.assign(window, { __disposedEmitterCanvas: node });
    history.pushState({}, '', '/docs/plane');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page).toHaveURL(/\/docs\/plane$/);
  await expect(page.locator('[data-emitter-canvas]')).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        (
          window as typeof window & {
            __disposedEmitterCanvas?: HTMLCanvasElement;
          }
        ).__disposedEmitterCanvas?.dataset.emitterState,
    ),
  ).toBe('disposed');
  expect(errors).toEqual([]);
});
