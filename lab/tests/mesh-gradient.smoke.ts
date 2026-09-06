import { createHash } from 'node:crypto';
import { expect, test, type Locator } from '@playwright/test';
import { collectBrowserErrors } from './lab-smoke-utils.js';

// Compare the rendered gradient itself, excluding movable point overlays.
async function gradientHash(canvas: Locator) {
  const image = await canvas.screenshot({
    style: '[data-slot="plane-thumb"] { visibility: hidden !important; }',
  });
  return createHash('sha256').update(image).digest('hex');
}

test('renders and edits the mesh through pointer, keyboard, and appearance controls', async ({
  page,
}) => {
  const errors = await collectBrowserErrors(page);
  await page.goto('/docs/plane-examples#mesh-gradient');
  const example = page.getByRole('figure', {
    name: 'Mesh gradient demo',
    exact: true,
  });
  const plane = example.getByRole('group', {
    name: 'Mesh gradient control points',
    exact: true,
  });
  const canvas = example.locator('canvas[data-mesh-gradient]');
  const axis = example.getByRole('slider', {
    name: /Color 3(?: mesh point)? horizontal position/,
  });
  await expect(canvas).toHaveAttribute('data-renderer', 'webgl');
  await canvas.scrollIntoViewIfNeeded();
  const initial = await gradientHash(canvas);
  const initialPosition = await axis.inputValue();
  const colorTrigger = example.getByRole('button', {
    name: /Edit selected point color/,
  });
  const initialColor = (await colorTrigger.textContent())!.trim();

  await axis.press('End');
  await expect(axis).toHaveValue('1');
  await expect(example.locator('output').first()).toContainText(
    /Color 3.*100%/,
  );
  await expect.poll(() => gradientHash(canvas)).not.toBe(initial);

  const beforeDrag = await gradientHash(canvas);
  await plane.scrollIntoViewIfNeeded();
  const thumb = example.locator('[data-slot="plane-thumb"]').nth(2);
  const bounds = (await thumb.boundingBox())!;
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(bounds.x - 80, bounds.y + 25, { steps: 6 });
  await page.mouse.up();
  await expect(axis).not.toHaveValue('1');
  await expect.poll(() => gradientHash(canvas)).not.toBe(beforeDrag);

  for (const preset of ['Ember', 'Orchid', 'Glacier']) {
    const before = await gradientHash(canvas);
    await example.getByRole('button', { name: preset, exact: true }).click();
    await expect.poll(() => gradientHash(canvas)).not.toBe(before);
  }
  const beforeColor = await gradientHash(canvas);
  await colorTrigger.click();
  const colorPicker = page.getByRole('dialog', {
    name: 'Selected point color',
  });
  const hex = colorPicker.getByRole('textbox', { name: 'Hex color' });
  await hex.fill('#ff0000');
  await expect(colorTrigger).toContainText('#FF0000');
  await expect.poll(() => gradientHash(canvas)).not.toBe(beforeColor);
  await page.keyboard.press('Escape');
  await expect(colorPicker).toBeHidden();
  await expect(colorTrigger).toBeFocused();

  for (const name of ['Flow', 'Grain']) {
    const before = await gradientHash(canvas);
    await example.getByRole('slider', { name, exact: true }).press('End');
    await expect.poll(() => gradientHash(canvas)).not.toBe(before);
  }
  await example
    .getByRole('button', { name: 'Hide points', exact: true })
    .click();
  await expect(thumb).toBeHidden();
  await expect(
    example.getByRole('button', { name: 'Show points', exact: true }),
  ).not.toHaveAttribute('aria-pressed');
  await example
    .getByRole('button', { name: 'Show points', exact: true })
    .click();
  await expect(thumb).toBeVisible();
  await example
    .getByRole('button', { name: 'Reset mesh', exact: true })
    .click();
  await expect(axis).toHaveValue(initialPosition);
  await expect(colorTrigger).toContainText(initialColor);
  await expect.poll(() => gradientHash(canvas)).toBe(initial);

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  // Browser context restoration must redraw the retained settings without another edit.
  const beforeLoss = await gradientHash(canvas);
  await canvas.evaluate(async (node) => {
    const canvas = node as HTMLCanvasElement;
    const extension = canvas
      .getContext('webgl')!
      .getExtension('WEBGL_lose_context');
    if (!extension) throw new Error('Context-loss testing is unavailable');
    await new Promise<void>((resolve) => {
      canvas.addEventListener('webglcontextrestored', () => resolve(), {
        once: true,
      });
      canvas.addEventListener(
        'webglcontextlost',
        () => {
          setTimeout(() => extension.restoreContext(), 50);
        },
        { once: true },
      );
      extension.loseContext();
    });
  });
  await expect(canvas).toHaveAttribute('data-renderer', 'webgl');
  await expect.poll(() => gradientHash(canvas)).toBe(beforeLoss);
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('keeps the Plane color picker synchronized, keyboard accessible, and in the viewport', async ({
  page,
}) => {
  const errors = await collectBrowserErrors(page);
  await page.goto('/docs/plane-examples#mesh-gradient');
  const example = page.getByRole('figure', {
    name: 'Mesh gradient demo',
    exact: true,
  });
  const canvas = example.locator('canvas[data-mesh-gradient]');
  await expect(canvas).toHaveAttribute('data-renderer', 'webgl');
  await canvas.scrollIntoViewIfNeeded();
  const trigger = example.getByRole('button', {
    name: /Edit selected point color/,
  });
  await expect(example.locator('input[type="color"]')).toHaveCount(0);
  await trigger.click();

  const picker = page.getByRole('dialog', { name: 'Selected point color' });
  const hex = picker.getByRole('textbox', { name: 'Hex color' });
  const hue = picker.getByRole('slider', { name: 'Hue', exact: true });
  const saturation = picker.getByRole('slider', {
    name: 'Saturation',
    exact: true,
  });
  const value = picker.getByRole('slider', { name: 'Value', exact: true });
  await expect(picker).toBeVisible();
  const pickerBounds = (await picker.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(pickerBounds.x).toBeGreaterThanOrEqual(0);
  expect(pickerBounds.y).toBeGreaterThanOrEqual(0);
  expect(pickerBounds.x + pickerBounds.width).toBeLessThanOrEqual(
    viewport.width,
  );
  expect(pickerBounds.y + pickerBounds.height).toBeLessThanOrEqual(
    viewport.height,
  );

  const pointAxis = example.getByRole('slider', {
    name: /Color 3(?: mesh point)? horizontal position/,
  });
  const pointPosition = await pointAxis.inputValue();
  const beforePlane = await gradientHash(canvas);
  const planeBounds = (await picker
    .getByRole('group', { name: 'Selected color saturation and value' })
    .boundingBox())!;
  await page.mouse.move(
    planeBounds.x + planeBounds.width * 0.25,
    planeBounds.y + planeBounds.height * 0.25,
  );
  await page.mouse.down();
  await page.mouse.move(
    planeBounds.x + planeBounds.width * 0.75,
    planeBounds.y + planeBounds.height * 0.75,
    { steps: 4 },
  );
  await page.mouse.up();
  await expect(pointAxis).toHaveValue(pointPosition);
  await expect.poll(() => gradientHash(canvas)).not.toBe(beforePlane);

  const beforeHue = await gradientHash(canvas);
  await hue.press('Home');
  await expect.poll(() => gradientHash(canvas)).not.toBe(beforeHue);

  const beforeKeyboard = await gradientHash(canvas);
  await saturation.press('Home');
  await saturation.press('ArrowRight');
  await value.press('End');
  await expect.poll(() => gradientHash(canvas)).not.toBe(beforeKeyboard);

  await hex.fill('#808080');
  await expect(trigger).toContainText('#808080');
  await hue.press('Home');
  await hue.press('ArrowRight');
  await expect(trigger).toContainText('#808080');
  await saturation.press('End');
  await expect(trigger).not.toContainText('#808080');

  const validColor = (await trigger.textContent())!.trim();
  await hex.fill('#zzzzzz');
  await expect(hex).toHaveAttribute('aria-invalid', 'true');
  await expect(picker.getByRole('alert')).toHaveText(
    'Enter a six-digit hex color.',
  );
  await expect(trigger).toContainText(validColor);
  await hex.fill('#00ff00');
  await expect(hex).not.toHaveAttribute('aria-invalid', 'true');
  await expect(trigger).toContainText('#00FF00');
  await expect(hue).toHaveValue('120');

  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await example
    .getByRole('button', { name: 'Select color 1', exact: true })
    .click();
  await expect(trigger).toContainText('#10246E');
  await trigger.click();
  await expect(hex).toHaveValue('#10246E');
  await example.getByRole('button', { name: 'Ember', exact: true }).click();
  await expect(picker).toBeHidden();
  await expect(trigger).toContainText('#FF986B');
  await trigger.click();
  await expect(hex).toHaveValue('#FF986B');

  await example
    .getByRole('button', { name: 'Hide points', exact: true })
    .click();
  await expect(picker).toBeHidden();
  expect(errors).toEqual([]);
});

test('keeps the mesh visible and editable when WebGL is unavailable', async ({
  page,
}) => {
  const errors = await collectBrowserErrors(page);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: unknown[]
    ) {
      if (type.includes('webgl')) return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto('/docs/plane-examples#mesh-gradient');
  const example = page.getByRole('figure', {
    name: 'Mesh gradient demo',
    exact: true,
  });
  const canvas = example.locator('canvas[data-mesh-gradient]');
  await expect(canvas).toHaveAttribute('data-renderer', 'canvas2d');
  const colorCount = await canvas.evaluate((node) => {
    const canvas = node as HTMLCanvasElement;
    const pixels = canvas
      .getContext('2d')!
      .getImageData(0, 0, canvas.width, canvas.height).data;
    const colors = new Set<string>();
    for (let index = 0; index < pixels.length; index += 64) {
      colors.add(`${pixels[index]},${pixels[index + 1]},${pixels[index + 2]}`);
    }
    return colors.size;
  });
  expect(colorCount).toBeGreaterThan(100);
  const before = await gradientHash(canvas);
  await example.getByRole('button', { name: 'Ember', exact: true }).click();
  await expect.poll(() => gradientHash(canvas)).not.toBe(before);
  expect(errors).toEqual([]);
});

test('recovers to software rendering when WebGL shader initialization fails', async ({
  page,
}) => {
  const errors = await collectBrowserErrors(page);
  await page.addInitScript(() => {
    const original = WebGLRenderingContext.prototype.getShaderParameter;
    WebGLRenderingContext.prototype.getShaderParameter = function (
      shader: WebGLShader,
      parameter: number,
    ) {
      if (parameter === this.COMPILE_STATUS) return false;
      return original.call(this, shader, parameter);
    };
  });
  await page.goto('/docs/plane-examples#mesh-gradient');
  const example = page.getByRole('figure', {
    name: 'Mesh gradient demo',
    exact: true,
  });
  const canvas = example.locator('canvas[data-mesh-gradient]');
  await expect(canvas).toHaveAttribute('data-renderer', 'canvas2d');
  const before = await gradientHash(canvas);
  await example.getByRole('button', { name: 'Orchid', exact: true }).click();
  await expect.poll(() => gradientHash(canvas)).not.toBe(before);
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('recovers to software rendering when WebGL restoration cannot reinitialize', async ({
  page,
}) => {
  const errors = await collectBrowserErrors(page);
  await page.addInitScript(() => {
    const original = WebGLRenderingContext.prototype.getShaderParameter;
    WebGLRenderingContext.prototype.getShaderParameter = function (
      shader: WebGLShader,
      parameter: number,
    ) {
      if (
        parameter === this.COMPILE_STATUS &&
        (window as Window & { failMeshRestore?: boolean }).failMeshRestore
      ) {
        return false;
      }
      return original.call(this, shader, parameter);
    };
  });
  await page.goto('/docs/plane-examples#mesh-gradient');
  const example = page.getByRole('figure', {
    name: 'Mesh gradient demo',
    exact: true,
  });
  const canvas = example.locator('canvas[data-mesh-gradient]');
  await expect(canvas).toHaveAttribute('data-renderer', 'webgl');
  await canvas.evaluate(async (node) => {
    const canvas = node as HTMLCanvasElement;
    const extension = canvas
      .getContext('webgl')!
      .getExtension('WEBGL_lose_context');
    if (!extension) throw new Error('Context-loss testing is unavailable');
    await new Promise<void>((resolve) => {
      canvas.addEventListener(
        'webglcontextlost',
        () => {
          (window as Window & { failMeshRestore?: boolean }).failMeshRestore =
            true;
          setTimeout(() => extension.restoreContext(), 50);
        },
        { once: true },
      );
      canvas.addEventListener('webglcontextrestored', () => resolve(), {
        once: true,
      });
      extension.loseContext();
    });
  });
  await expect(canvas).toHaveAttribute('data-renderer', 'canvas2d');
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('shows a terminal status when no canvas renderer is available', async ({
  page,
}) => {
  const errors = await collectBrowserErrors(page);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: unknown[]
    ) {
      if (type === '2d' || type.includes('webgl')) return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto('/docs/plane-examples#mesh-gradient');
  const example = page.getByRole('figure', {
    name: 'Mesh gradient demo',
    exact: true,
  });
  await expect(
    example.getByText('This browser could not render the gradient.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(example.locator('canvas[data-mesh-gradient]')).toHaveCount(0);
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  expect(errors).toEqual([]);
});
