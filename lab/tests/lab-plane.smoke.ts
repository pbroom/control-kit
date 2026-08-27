import { expect, test } from '@playwright/test';
import {
  collectBrowserErrors,
  performancePanelFor,
} from './lab-smoke-utils.js';

test('drives the composed Plane with pointer, keyboard, and properties', async ({
  page,
}) => {
  const browserErrors = await collectBrowserErrors(page);

  await page.goto('/lab/plane');
  await expect(page).toHaveURL(/\/lab\/plane$/);

  const plane = page.getByTestId('plane-demo');
  const thumb = page.getByTestId('plane-demo-thumb');
  const readout = page.getByTestId('plane-demo-readout');

  await expect(plane).toBeVisible();
  await expect(plane.locator('svg')).toHaveCount(0);
  await expect(thumb).toBeVisible();
  await expect(readout).toHaveText('X 0.50 · Y 0.50');
  await expect(page.getByTestId('plane-demo-commit-count')).toHaveCount(0);
  await expect(thumb.locator('span[aria-hidden="true"]')).toHaveCSS(
    'width',
    '12px',
  );
  await expect(thumb.locator('span[aria-hidden="true"]')).toHaveCSS(
    'height',
    '12px',
  );

  const readThumbVisualState = () =>
    thumb.evaluate((node) => {
      const style = getComputedStyle(node);
      return {
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        boxShadow: style.boxShadow,
        transform: style.transform,
        transitionDuration: style.transitionDuration,
        transitionProperty: style.transitionProperty,
      };
    });

  const planeBox = await plane.boundingBox();
  const thumbBox = await thumb.boundingBox();
  const idleThumbVisualState = await readThumbVisualState();
  expect(planeBox).not.toBeNull();
  expect(thumbBox).not.toBeNull();
  await page.mouse.move(
    thumbBox!.x + thumbBox!.width / 2,
    thumbBox!.y + thumbBox!.height / 2,
  );
  await expect(thumb).toHaveAttribute('data-hovered', 'true');
  const hoveredThumbBox = await thumb.boundingBox();
  expect(hoveredThumbBox).not.toBeNull();
  expect(hoveredThumbBox!.width).toBe(thumbBox!.width);
  expect(hoveredThumbBox!.height).toBe(thumbBox!.height);
  expect(await readThumbVisualState()).toEqual(idleThumbVisualState);
  await page.mouse.down();
  await expect(thumb).toHaveAttribute('data-hovered', 'true');
  const pressedThumbBox = await thumb.boundingBox();
  expect(pressedThumbBox).not.toBeNull();
  expect(pressedThumbBox!.width).toBe(thumbBox!.width);
  expect(pressedThumbBox!.height).toBe(thumbBox!.height);
  expect(await readThumbVisualState()).toEqual(idleThumbVisualState);
  await page.mouse.move(
    planeBox!.x + planeBox!.width * 0.8,
    planeBox!.y + planeBox!.height * 0.25,
  );
  await page.mouse.up();
  await page.mouse.move(planeBox!.x + 2, planeBox!.y + 2);
  await expect(thumb).not.toHaveAttribute('data-hovered');

  await expect(readout).toContainText('X 0.80 · Y 0.75');
  await expect(page.getByLabel('X position', { exact: true })).toHaveValue(
    '0.8',
  );
  await expect(page.getByLabel('Y position', { exact: true })).toHaveValue(
    '0.75',
  );

  const xAxis = page.getByRole('slider', {
    name: 'Horizontal position',
    exact: true,
  });
  const yAxis = page.getByRole('slider', {
    name: 'Vertical position',
    exact: true,
  });
  await expect(xAxis).toBeFocused();
  await expect(thumb).toHaveAttribute('data-focused', 'true');
  await expect(thumb).not.toHaveAttribute('data-focus-visible');
  await page.keyboard.press('Tab');
  await expect(xAxis).toBeFocused();
  await expect(thumb).toHaveAttribute('data-focus-visible', 'true');
  await page.keyboard.press('ArrowRight');
  await expect(readout).toContainText('X 0.81 · Y 0.75');
  await page.keyboard.press('ArrowLeft');
  await expect(readout).toContainText('X 0.80 · Y 0.75');
  await page.keyboard.press('Tab');
  await expect(xAxis).not.toBeFocused();
  await expect(yAxis).not.toBeFocused();
  await expect(thumb).not.toHaveAttribute('data-focused');
  await xAxis.focus();
  await page.keyboard.press('Alt+ArrowRight');
  await expect(xAxis).toHaveValue('0.801');
  await page.keyboard.press('Alt+ArrowLeft');
  await expect(xAxis).toHaveValue('0.8');
  await page.keyboard.press('Shift+ArrowLeft');
  await expect(readout).toContainText('X 0.70 · Y 0.75');
  await page.keyboard.down('ArrowRight');
  await expect(readout).toContainText('X 0.71 · Y 0.75');
  await page.keyboard.down('ArrowUp');
  await expect(readout).toContainText('X 0.72 · Y 0.76');
  await page.keyboard.up('ArrowUp');
  await page.keyboard.up('ArrowRight');

  await page.keyboard.down('ArrowDown');
  try {
    await page.waitForTimeout(350);
    await page.keyboard.down('ArrowLeft');
    try {
      await page.waitForTimeout(120);
    } finally {
      await page.keyboard.up('ArrowLeft');
    }
    const xAfterLeftRelease = Number(await xAxis.inputValue());
    const yAfterLeftRelease = Number(await yAxis.inputValue());
    await page.waitForTimeout(120);
    expect(Number(await xAxis.inputValue())).toBe(xAfterLeftRelease);
    expect(Number(await yAxis.inputValue())).toBeLessThan(yAfterLeftRelease);
  } finally {
    await page.keyboard.up('ArrowDown');
  }

  await page.keyboard.press('ArrowDown');
  const valueAfterHeldKeys = {
    x: Number(await xAxis.inputValue()),
    y: Number(await yAxis.inputValue()),
  };
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  expect(Number(await xAxis.inputValue())).toBeCloseTo(
    valueAfterHeldKeys.x - 0.02,
    5,
  );
  expect(Number(await yAxis.inputValue())).toBe(valueAfterHeldKeys.y);
  const finalExpectedValue = {
    x: await xAxis.inputValue(),
    y: await yAxis.inputValue(),
  };

  const disabledToggle = page.getByRole('checkbox', {
    name: 'Disabled',
    exact: true,
  });
  await disabledToggle.click();
  await expect(plane).toHaveAttribute('data-disabled', 'true');
  await page.mouse.click(
    planeBox!.x + planeBox!.width * 0.2,
    planeBox!.y + planeBox!.height * 0.8,
  );
  await expect(xAxis).toHaveValue(finalExpectedValue.x);
  await expect(yAxis).toHaveValue(finalExpectedValue.y);

  const performancePanel = performancePanelFor(page, 'Plane');
  await expect(performancePanel).toBeVisible();
  await expect(
    performancePanel.getByText('Plane primitive', { exact: true }),
  ).toBeVisible();
  await expect(
    performancePanel.locator('[data-primitive-layer="plane-thumb"]'),
  ).toBeVisible();

  expect(browserErrors).toEqual([]);
});

test('tracks a sustained drag without repeated Plane layout reads', async ({
  page,
}) => {
  const browserErrors = await collectBrowserErrors(page);

  await page.goto('/lab/plane');
  const plane = page.getByTestId('plane-demo');
  const thumb = page.getByTestId('plane-demo-thumb');
  const readout = page.getByTestId('plane-demo-readout');
  const [planeBox, thumbBox] = await Promise.all([
    plane.boundingBox(),
    thumb.boundingBox(),
  ]);
  expect(planeBox).not.toBeNull();
  expect(thumbBox).not.toBeNull();

  await page.evaluate(() => {
    const planeNode = document.querySelector<HTMLElement>(
      '[data-testid="plane-demo"]',
    );
    const thumbNode = document.querySelector<HTMLElement>(
      '[data-testid="plane-demo-thumb"]',
    );
    if (!planeNode || !thumbNode) throw new Error('Plane demo is unavailable');

    const profile = {
      planeBoundsReads: 0,
      pointerMoves: 0,
      thumbStyleMutations: 0,
    };
    const originalGetBoundingClientRect =
      planeNode.getBoundingClientRect.bind(planeNode);
    planeNode.getBoundingClientRect = () => {
      profile.planeBoundsReads += 1;
      return originalGetBoundingClientRect();
    };
    planeNode.addEventListener('pointermove', () => {
      profile.pointerMoves += 1;
    });
    new MutationObserver((records) => {
      profile.thumbStyleMutations += records.length;
    }).observe(thumbNode, { attributeFilter: ['style'], attributes: true });
    Object.assign(window, { __planeDragProfile: profile });
  });

  await page.mouse.move(
    thumbBox!.x + thumbBox!.width / 2,
    thumbBox!.y + thumbBox!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    planeBox!.x + planeBox!.width * 0.82,
    planeBox!.y + planeBox!.height * 0.28,
    { steps: 48 },
  );
  await expect(readout).toHaveText('X 0.82 · Y 0.72');
  await expect(page.getByLabel('X position', { exact: true })).toHaveValue(
    '0.5',
  );
  await expect(page.getByLabel('Y position', { exact: true })).toHaveValue(
    '0.5',
  );
  await page.mouse.up();

  const profile = await page.evaluate(
    () =>
      (
        window as typeof window & {
          __planeDragProfile: {
            planeBoundsReads: number;
            pointerMoves: number;
            thumbStyleMutations: number;
          };
        }
      ).__planeDragProfile,
  );
  expect(profile.pointerMoves).toBeGreaterThanOrEqual(40);
  expect(profile.planeBoundsReads).toBeLessThanOrEqual(2);
  expect(profile.thumbStyleMutations).toBeGreaterThan(0);
  expect(profile.thumbStyleMutations).toBeLessThanOrEqual(
    profile.pointerMoves * 2 + 2,
  );
  const finalThumbPosition = await thumb.evaluate((node) => ({
    left: Number.parseFloat(node.style.left),
    top: Number.parseFloat(node.style.top),
  }));
  expect(Math.round(finalThumbPosition.left)).toBe(82);
  expect(Math.round(finalThumbPosition.top)).toBe(28);
  await expect(readout).toHaveText('X 0.82 · Y 0.72');
  await expect(page.getByLabel('X position', { exact: true })).toHaveValue(
    '0.82',
  );
  await expect(page.getByLabel('Y position', { exact: true })).toHaveValue(
    '0.72',
  );
  expect(browserErrors).toEqual([]);
});
