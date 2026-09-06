import { expect, test, type Locator, type Page } from '@playwright/test';
import { collectBrowserErrors } from './lab-smoke-utils.js';

async function openMotionExample(page: Page) {
  await page.goto('/docs/plane-examples#motion-direction-intensity');
  const example = page.getByRole('figure', {
    name: 'Motion direction/intensity demo',
    exact: true,
  });
  await example.scrollIntoViewIfNeeded();
  await expect(example.locator('[data-motion-field]')).toHaveAttribute(
    'data-motion-state',
    /moving|static/,
  );
  return example;
}

async function setPlaneValue(page: Page, plane: Locator, x: number, y: number) {
  const bounds = await plane.boundingBox();
  if (!bounds) throw new Error('The motion plane has no bounds.');
  await page.mouse.click(
    bounds.x + bounds.width * x,
    bounds.y + bounds.height * (1 - y),
  );
}

async function readTravel(field: Locator) {
  return {
    x: Number(await field.getAttribute('data-motion-travel-x')),
    y: Number(await field.getAttribute('data-motion-travel-y')),
  };
}

async function readRenderCount(field: Locator) {
  return Number(await field.getAttribute('data-motion-render-count'));
}

async function measureTravel(field: Locator, duration = 320) {
  const start = await readTravel(field);
  await field.page().waitForTimeout(duration);
  const end = await readTravel(field);
  return { x: end.x - start.x, y: end.y - start.y };
}

test('particle trajectory follows pointer direction and radial speed without resetting', async ({
  page,
}) => {
  const errors = await collectBrowserErrors(page);
  const example = await openMotionExample(page);
  const field = example.locator('[data-motion-field]');
  const plane = example.locator('[data-motion-plane]');

  await setPlaneValue(page, plane, 0.95, 0.5);
  await expect(field).toHaveAttribute('data-motion-angle', '0.000');
  const fastTravel = await measureTravel(field);
  expect(fastTravel.x).toBeGreaterThan(16);
  expect(Math.abs(fastTravel.y)).toBeLessThan(0.05);

  await setPlaneValue(page, plane, 0.62, 0.5);
  await expect(field).toHaveAttribute('data-motion-speed', '20.160');
  const slowTravel = await measureTravel(field);
  expect(slowTravel.x).toBeGreaterThan(3);
  expect(fastTravel.x / slowTravel.x).toBeGreaterThan(2.8);

  const travelBeforeTurn = await readTravel(field);
  await setPlaneValue(page, plane, 0.5, 0.9);
  const travelAfterTurn = await readTravel(field);
  expect(travelAfterTurn.x).toBeGreaterThan(travelBeforeTurn.x - 1);
  expect(travelAfterTurn.x).toBeGreaterThan(16);
  const upwardTravel = await measureTravel(field);
  expect(Math.abs(upwardTravel.x)).toBeLessThan(0.05);
  expect(upwardTravel.y).toBeGreaterThan(14);

  await setPlaneValue(page, plane, 0.5, 0.5);
  await expect(field).toHaveAttribute('data-motion-state', 'stopped');
  await expect(example.locator('[data-motion-readout]')).toHaveText(
    'Stopped · 0% intensity',
  );
  const stoppedRenderCount = await readRenderCount(field);
  const stoppedTravel = await measureTravel(field, 350);
  expect(Math.abs(stoppedTravel.x)).toBeLessThan(0.0001);
  expect(Math.abs(stoppedTravel.y)).toBeLessThan(0.0001);
  expect(await readRenderCount(field)).toBe(stoppedRenderCount);

  await setPlaneValue(page, plane, 0.8, 0.5);
  await expect
    .poll(async () => readRenderCount(field))
    .toBeGreaterThan(stoppedRenderCount);
  expect(errors).toEqual([]);
});

test('keyboard input keeps the Cartesian angle convention', async ({
  page,
}) => {
  const example = await openMotionExample(page);
  const field = example.locator('[data-motion-field]');
  const plane = example.locator('[data-motion-plane]');
  const horizontal = example.getByRole('slider', {
    name: 'Horizontal motion',
    exact: true,
  });
  const vertical = example.getByRole('slider', {
    name: 'Vertical motion',
    exact: true,
  });

  await setPlaneValue(page, plane, 0.5, 0.5);
  await horizontal.focus();
  await horizontal.press('ArrowRight');
  await expect(horizontal).toHaveValue('0.51');
  await expect(field).toHaveAttribute('data-motion-angle', '0.000');

  await vertical.focus();
  await vertical.press('ArrowUp');
  await expect(vertical).toHaveValue('0.51');
  await expect(field).toHaveAttribute('data-motion-angle', '45.000');
  const travel = await measureTravel(field);
  expect(travel.x).toBeGreaterThan(0);
  expect(travel.y).toBeGreaterThan(0);
  expect(travel.x / travel.y).toBeGreaterThan(0.8);
  expect(travel.x / travel.y).toBeLessThan(1.2);
});

test('reduced motion renders a deterministic static direction preview', async ({
  page,
}) => {
  const errors = await collectBrowserErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const example = await openMotionExample(page);
  const field = example.locator('[data-motion-field]');
  const plane = example.locator('[data-motion-plane]');

  await expect(field).toHaveAttribute('data-motion-reduced', 'true');
  await expect(field).toHaveAttribute('data-motion-state', 'static');
  await expect(field).toHaveAccessibleName(/Static direction preview/);
  const initialSample = {
    x: await field.getAttribute('data-motion-sample-x'),
    y: await field.getAttribute('data-motion-sample-y'),
  };
  const still = await measureTravel(field, 350);
  expect(still).toEqual({ x: 0, y: 0 });

  await page.reload();
  const reopened = await openMotionExample(page);
  const reopenedField = reopened.locator('[data-motion-field]');
  await expect(reopenedField).toHaveAttribute(
    'data-motion-sample-x',
    initialSample.x ?? '',
  );
  await expect(reopenedField).toHaveAttribute(
    'data-motion-sample-y',
    initialSample.y ?? '',
  );

  await setPlaneValue(page, reopened.locator('[data-motion-plane]'), 0.1, 0.5);
  await expect(reopenedField).toHaveAttribute('data-motion-angle', '180.000');
  await expect(reopenedField).toHaveAccessibleName(
    /Static direction preview, 180 degrees/,
  );
  expect(errors).toEqual([]);
});

test('field and circular control adapt from side-by-side to stacked', async ({
  page,
}, testInfo) => {
  const example = await openMotionExample(page);
  const fieldBounds = await example
    .locator('[data-motion-field-shell]')
    .boundingBox();
  const planeBounds = await example
    .locator('[data-motion-plane]')
    .boundingBox();
  if (!fieldBounds || !planeBounds)
    throw new Error('The motion demo did not render.');

  if (testInfo.project.name === 'mobile') {
    expect(planeBounds.y).toBeGreaterThan(fieldBounds.y + fieldBounds.height);
  } else {
    expect(planeBounds.x).toBeGreaterThan(fieldBounds.x + fieldBounds.width);
    expect(Math.abs(planeBounds.y - fieldBounds.y)).toBeLessThan(60);
  }
});
