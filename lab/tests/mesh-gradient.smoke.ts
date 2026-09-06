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
  const initialColor = await example
    .getByLabel('Selected point color')
    .inputValue();

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
  await example.getByLabel('Selected point color').fill('#ff0000');
  await expect.poll(() => gradientHash(canvas)).not.toBe(beforeColor);

  for (const name of ['Flow', 'Grain']) {
    const before = await gradientHash(canvas);
    await example.getByRole('slider', { name, exact: true }).press('End');
    await expect.poll(() => gradientHash(canvas)).not.toBe(before);
  }
  await example
    .getByRole('button', { name: 'Hide points', exact: true })
    .click();
  await expect(thumb).toBeHidden();
  await example
    .getByRole('button', { name: 'Show points', exact: true })
    .click();
  await expect(thumb).toBeVisible();
  await example
    .getByRole('button', { name: 'Reset mesh', exact: true })
    .click();
  await expect(axis).toHaveValue(initialPosition);
  await expect(example.getByLabel('Selected point color')).toHaveValue(
    initialColor,
  );
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
