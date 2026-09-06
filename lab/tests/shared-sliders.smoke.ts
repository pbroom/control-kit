import { expect, test } from '@playwright/test';
import { collectBrowserErrors } from './lab-smoke-utils.js';

test('color slider adapters retain channel steps, vertical direction, bounds, and markers', async ({
  page,
}) => {
  const errors = await collectBrowserErrors(page);
  await page.goto('/docs/slider');
  const lightness = page.getByRole('slider', {
    name: 'Lightness slider',
    exact: true,
  });
  await expect(lightness).toHaveValue('0.64');
  await lightness.press('ArrowRight');
  await expect(lightness).toHaveValue('0.65');
  await lightness.press('Shift+ArrowRight');
  await expect(lightness).toHaveValue('0.75');
  const vertical = page
    .getByRole('figure', { name: 'Vertical slider demo', exact: true })
    .getByRole('slider');
  await vertical.press('Home');
  await expect(vertical).toHaveValue('0');
  await vertical.press('ArrowUp');
  await expect(vertical).toHaveValue('0.004');
  await vertical.press('End');
  await expect(vertical).toHaveValue('0.4');
  const hue = page.getByRole('slider', { name: 'Limited hue', exact: true });
  await hue.press('Home');
  await expect(hue).toHaveValue('120');
  await hue.press('ArrowRight');
  await expect(hue).toHaveValue('121.2');
  await expect(hue).toHaveAttribute('aria-valuetext', '121 degrees');
  await hue.press('End');
  await expect(hue).toHaveValue('240');

  const hueRail = page
    .getByRole('figure', { name: 'Slider range demo', exact: true })
    .locator('[data-color-slider]');
  await hueRail.scrollIntoViewIfNeeded();
  const bounds = (await hueRail
    .locator('[data-slot="slider-control"]')
    .boundingBox())!;
  await page.mouse.move(
    bounds.x + bounds.width * 0.25,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.down();
  await expect(hue).not.toHaveValue('240');
  await page.mouse.move(bounds.x + bounds.width, bounds.y + bounds.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(hue).toHaveValue('240');

  await page.goto('/lab/slider');
  const rail = page.locator('[data-color-slider]');
  const input = rail.getByRole('slider');
  await expect(
    rail.locator('[data-color-slider-marker]').first(),
  ).toBeVisible();
  await input.press('Home');
  await expect(input).toHaveValue('0');
  await input.press('End');
  await expect(input).toHaveValue('0.4');
  await expect(
    rail.locator('[data-color-slider-marker]').first(),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('tone sliders share the color adapter and mesh controls share Base UI Slider', async ({
  page,
}) => {
  const errors = await collectBrowserErrors(page);
  await page.goto('/docs/plane-examples#three-way-color-adjuster');
  const tones = page.locator('[data-tone-slider]');
  await expect(tones).toHaveCount(6);
  for (const tone of await tones.all()) {
    await expect(tone).toHaveAttribute('data-color-value-slider', '');
    await expect(tone.locator('[data-slot="slider-thumb"] input')).toHaveCount(
      1,
    );
  }
  const luminance = page.getByRole('slider', {
    name: 'Midtones luminance',
    exact: true,
  });
  await luminance.press('End');
  await expect(luminance).toHaveValue('100');
  const saturation = page.getByRole('slider', {
    name: 'Midtones saturation',
    exact: true,
  });
  await saturation.press('Home');
  await expect(saturation).toHaveValue('0');
  await saturation.press('ArrowRight');
  await expect(saturation).toHaveValue('1');
  const mesh = page.getByRole('figure', {
    name: 'Mesh gradient demo',
    exact: true,
  });
  for (const name of ['Flow', 'Grain']) {
    const input = mesh.getByRole('slider', { name, exact: true });
    expect(
      await input.evaluate((node) =>
        Boolean(node.closest('[data-slot="slider-thumb"]')),
      ),
    ).toBe(true);
    await input.press('End');
    await expect(input).toHaveValue('100');
  }
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test.describe('touch input', () => {
  test.use({ hasTouch: true });
  test('commits the final color after a touch drag', async ({ page }) => {
    await page.goto('/docs/slider');
    const rail = page.locator('[data-color-slider]').first();
    await rail.scrollIntoViewIfNeeded();
    const bounds = (await rail.boundingBox())!;
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { x: bounds.x + bounds.width * 0.25, y: bounds.y + bounds.height / 2 },
      ],
    });
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: bounds.x + bounds.width * 0.75, y: bounds.y + bounds.height / 2 },
      ],
    });
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await expect
      .poll(async () =>
        Math.abs(Number(await rail.getByRole('slider').inputValue()) - 0.75),
      )
      .toBeLessThan(0.01);
    await session.detach();
  });
});
