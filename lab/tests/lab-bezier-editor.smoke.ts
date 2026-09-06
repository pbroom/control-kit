import { expect, test } from '@playwright/test';
import { collectBrowserErrors } from './lab-smoke-utils.js';

test('edits both Bezier handles, exact values, and the motion preview', async ({
  page,
}) => {
  const browserErrors = await collectBrowserErrors(page);
  await page.goto('/docs/plane-examples');

  const example = page.getByRole('figure', {
    name: 'Bezier control-point editor demo',
    exact: true,
  });
  await example.scrollIntoViewIfNeeded();

  const curve = example.locator('[data-bezier-curve]');
  const value = example.locator('[data-bezier-value]');
  const plane = example.locator('[data-slot="plane"]');
  const initialCurve = await curve.getAttribute('d');

  await expect(plane.locator('[data-slot="plane-thumb"]')).toHaveCount(2);
  await expect(value).toHaveText('cubic-bezier(0.45, 0.03, 0.36, 1.00)');

  const firstX = example.getByRole('slider', {
    name: 'First control point X',
    exact: true,
  });
  await firstX.focus();
  await firstX.press('ArrowRight');
  await expect(value).toHaveText('cubic-bezier(0.46, 0.03, 0.36, 1.00)');
  const firstEditedCurve = await curve.getAttribute('d');
  expect(firstEditedCurve).not.toBe(initialCurve);

  const secondX = example.getByRole('slider', {
    name: 'Second control point X',
    exact: true,
  });
  await secondX.focus();
  await secondX.press('ArrowRight');
  await expect(value).toHaveText('cubic-bezier(0.46, 0.03, 0.37, 1.00)');
  await expect(curve).not.toHaveAttribute('d', firstEditedCurve ?? '');

  const x1 = example.getByRole('spinbutton', {
    name: 'x1 Bezier value',
    exact: true,
  });
  await x1.fill('0.2');
  await x1.press('Enter');
  await expect(value).toHaveText('cubic-bezier(0.20, 0.03, 0.37, 1.00)');

  const y1 = example.getByRole('spinbutton', {
    name: 'y1 Bezier value',
    exact: true,
  });
  await y1.fill('-0.25');
  await y1.press('Enter');
  await expect(value).toHaveText('cubic-bezier(0.20, -0.25, 0.37, 1.00)');

  const x2 = example.getByRole('spinbutton', {
    name: 'x2 Bezier value',
    exact: true,
  });
  await x2.fill('1.2');
  await x2.press('Enter');
  await expect(x2).toHaveAttribute('aria-invalid', 'true');
  await expect(value).toHaveText('cubic-bezier(0.20, -0.25, 0.37, 1.00)');
  await x2.fill('0.8');
  await x2.press('Enter');
  await expect(value).toHaveText('cubic-bezier(0.20, -0.25, 0.80, 1.00)');

  const previewDot = example.locator('[data-bezier-preview-dot]');
  await expect(previewDot).toHaveAttribute('data-replay', '0');
  await example.getByRole('button', { name: 'Replay', exact: true }).click();
  await expect(previewDot).toHaveAttribute('data-replay', '1');
  await expect(previewDot).toHaveCSS(
    'animation-timing-function',
    'cubic-bezier(0.2, -0.25, 0.8, 1)',
  );

  const exampleBounds = await example.boundingBox();
  const controlsBounds = await example
    .locator('input[aria-label$="Bezier value"]')
    .last()
    .boundingBox();
  expect(exampleBounds).not.toBeNull();
  expect(controlsBounds).not.toBeNull();
  expect(controlsBounds!.x + controlsBounds!.width).toBeLessThanOrEqual(
    exampleBounds!.x + exampleBounds!.width + 1,
  );
  expect(browserErrors).toEqual([]);
});

test('honors reduced motion for the Bezier preview', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/docs/plane-examples');

  const example = page.getByRole('figure', {
    name: 'Bezier control-point editor demo',
    exact: true,
  });
  const previewDot = example.locator('[data-bezier-preview-dot]');
  await example.scrollIntoViewIfNeeded();

  await expect(previewDot).toHaveCSS('animation-name', 'none');
});
