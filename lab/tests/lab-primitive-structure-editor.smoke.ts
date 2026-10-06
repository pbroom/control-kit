import { expect, type Locator, type Page, test } from '@playwright/test';
import {
  collectBrowserErrors,
  performancePanelFor,
} from './lab-smoke-utils.js';

type SavedFile = {
  demos: Record<
    string,
    {
      framing: { mode: string; panX: number; panY: number; zoom: number };
      layers: Record<
        string,
        { label: string; mode: string; x: number; z: number }
      >;
    }
  >;
  version: number;
};

async function slabOrigin(panel: Locator, node: string) {
  return panel
    .locator(`[data-structure-node="${node}"]`)
    .first()
    .getAttribute('data-structure-origin');
}

/** Intercepts the dev-server save so the committed file is never touched. */
async function captureSaves(page: Page) {
  const saves: { raw: string; file: SavedFile }[] = [];

  await page.route('**/__lab/structure-overrides', async (route) => {
    const raw = route.request().postData() ?? '';
    saves.push({ file: JSON.parse(raw) as SavedFile, raw });
    await route.fulfill({
      body: '{"ok":true}',
      contentType: 'application/json',
      status: 200,
    });
  });

  return saves;
}

test('edits a layer offset with the real primitives and saves the overrides file', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop editor coverage');
  const browserErrors = await collectBrowserErrors(page);
  const saves = await captureSaves(page);

  await page.goto(
    '/lab/control-field?structureEdit=1&structureLayer=control-field-input',
  );
  const panel = performancePanelFor(page, 'Control Field');
  const shell = panel.getByTestId('lab-primitive-structure-shell');
  // The editor is the Structure section of the properties panel.
  const editor = page
    .locator('#lab-properties-panel')
    .getByTestId('lab-primitive-structure-editor');

  await expect(editor).toBeVisible();
  await expect(shell).toHaveAttribute(
    'data-primitive-structure-selected-layer',
    'control-field-input',
  );
  await expect(editor).toBeInViewport();
  await expect(
    editor.locator('[data-structure-editor-layer="control-field-input"]'),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    editor.getByRole('textbox', { name: 'Zoom', exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => slabOrigin(panel, 'control-field-input'))
    .not.toBeNull();

  const inputBefore = await slabOrigin(panel, 'control-field-input');
  const rootBefore = await slabOrigin(panel, 'control-field-root');
  const viewBox = await panel
    .getByTestId('lab-primitive-structure-canvas')
    .getAttribute('viewBox');

  // Exact x through the ControlField: the layer switches to manual and moves.
  const xField = editor
    .getByTestId('lab-primitive-structure-layer-x')
    .getByRole('textbox');
  await xField.fill('40');
  await xField.press('Enter');
  await expect(
    editor
      .getByTestId('lab-primitive-structure-layer-mode')
      .getByRole('button', { name: 'Manual' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect
    .poll(() => slabOrigin(panel, 'control-field-input'))
    .not.toBe(inputBefore);
  // Only that part moved; the root and the frame stay put.
  expect(await slabOrigin(panel, 'control-field-root')).toBe(rootBefore);
  await expect(
    panel.getByTestId('lab-primitive-structure-canvas'),
  ).toHaveAttribute('viewBox', viewBox!);

  // The debounced save posts the whole file in canonical form.
  await expect
    .poll(
      () =>
        saves.at(-1)?.file.demos.controlField?.layers['control-field-input'],
    )
    .toEqual({ label: 'Input', mode: 'manual', x: 40, z: 0 });
  const saved = saves.at(-1)!;
  expect(saved.file.version).toBe(1);
  expect(saved.raw.endsWith('}\n')).toBe(true);
  expect(saved.raw).toBe(`${JSON.stringify(saved.file, null, 2)}\n`);
  expect(Object.keys(saved.file.demos.controlField!.layers)).toEqual([
    'control-field-root',
    'control-field-group',
    'control-field-scrub-area',
    'control-field-input',
    'control-field-affix',
    'control-field-steppers',
  ]);

  // Clicking a slab selects that layer everywhere: render, list, editor.
  const groupTop = panel
    .locator('[data-structure-node="control-field-group"] [data-structure-top]')
    .first();
  const groupBox = (await groupTop.boundingBox())!;
  await page.mouse.click(
    groupBox.x + groupBox.width * 0.5,
    groupBox.y + groupBox.height * 0.6,
  );
  await expect(shell).toHaveAttribute(
    'data-primitive-structure-selected-layer',
    /control-field-(group|root|input|scrub-area)/,
  );
  const clickedLayer = await shell.getAttribute(
    'data-primitive-structure-selected-layer',
  );
  await expect(
    editor.locator(`[data-structure-editor-layer="${clickedLayer}"]`),
  ).toHaveAttribute('aria-pressed', 'true');
  await editor
    .locator('[data-structure-editor-layer="control-field-input"]')
    .click();
  await expect(shell).toHaveAttribute(
    'data-primitive-structure-selected-layer',
    'control-field-input',
  );

  // Dragging on the render still opens the stack while editing.
  const render = panel.getByTestId('lab-primitive-structure-render');
  await render.focus();
  await page.keyboard.press('Home');
  const box = (await render.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height / 2 - 60, {
    steps: 5,
  });
  await page.mouse.up();
  expect(
    Number(await render.getAttribute('data-primitive-structure-explode')),
  ).toBeGreaterThan(0);

  // Reset puts every layer and the framing back on auto.
  await editor.getByTestId('lab-primitive-structure-editor-reset').click();
  await expect
    .poll(
      () =>
        saves.at(-1)?.file.demos.controlField?.layers['control-field-input'],
    )
    .toEqual({ label: 'Input', mode: 'auto', x: 0, z: 0 });
  expect(saves.at(-1)!.file.demos.controlField!.framing).toEqual({
    mode: 'auto',
    panX: 0,
    panY: 0,
    zoom: 1,
  });

  expect(browserErrors).toEqual([]);
});

test('manual framing zooms and pans the figure; auto ignores it', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop editor coverage');
  const saves = await captureSaves(page);

  await page.goto('/lab/plane?structureEdit=1');
  const panel = performancePanelFor(page, 'Plane');
  // The editor is the Structure section of the properties panel.
  const editor = page
    .locator('#lab-properties-panel')
    .getByTestId('lab-primitive-structure-editor');
  await expect(editor).toBeVisible();
  await expect.poll(() => slabOrigin(panel, 'plane-root')).not.toBeNull();
  const autoOrigin = await slabOrigin(panel, 'plane-root');

  const zoomField = editor
    .getByTestId('lab-primitive-structure-framing-zoom')
    .getByRole('textbox');
  await zoomField.click();
  await zoomField.press('ControlOrMeta+a');
  await zoomField.pressSequentially('1.5');
  await zoomField.press('Enter');
  await expect.poll(() => slabOrigin(panel, 'plane-root')).not.toBe(autoOrigin);
  await expect
    .poll(() => saves.at(-1)?.file.demos.plane?.framing)
    .toEqual({ mode: 'manual', panX: 0, panY: 0, zoom: 1.5 });

  await editor
    .getByTestId('lab-primitive-structure-framing-mode')
    .getByRole('button', { name: 'Auto' })
    .click();
  await expect.poll(() => slabOrigin(panel, 'plane-root')).toBe(autoOrigin);

  await editor.getByTestId('lab-primitive-structure-editor-reset').click();
  await expect.poll(() => saves.at(-1)?.file.demos.plane?.framing.zoom).toBe(1);
});
