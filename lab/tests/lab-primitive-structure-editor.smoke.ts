import { expect, type Locator, type Page, test } from '@playwright/test';
import {
  collectBrowserErrors,
  performancePanelFor,
} from './lab-smoke-utils.js';

type SavedFile = {
  demos: Record<
    string,
    {
      explode: number;
      frame: boolean;
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
type CommitReply = { body: unknown; status?: number };

/**
 * Intercepts every dev-server structure route: saves are recorded, status is
 * scripted, and commits are answered here, so tests never write the file or
 * run git.
 */
async function captureSaves(
  page: Page,
  options: {
    commit?: () => CommitReply;
    dirty?: () => boolean;
  } = {},
) {
  const saves: { raw: string; file: SavedFile }[] = [];
  const events: string[] = [];

  await page.route('**/__lab/structure-overrides/status', (route) => {
    events.push('status');
    return route.fulfill({
      body: JSON.stringify({ dirty: options.dirty?.() ?? false }),
      contentType: 'application/json',
      status: 200,
    });
  });
  await page.route('**/__lab/structure-overrides/commit', (route) => {
    events.push('commit');
    const reply = options.commit?.() ?? {
      body: { error: 'unexpected commit in test', ok: false },
      status: 500,
    };
    return route.fulfill({
      body: JSON.stringify(reply.body),
      contentType: 'application/json',
      status: reply.status ?? 200,
    });
  });
  await page.route('**/__lab/structure-overrides', async (route) => {
    const raw = route.request().postData() ?? '';
    events.push('save');
    saves.push({ file: JSON.parse(raw) as SavedFile, raw });
    await route.fulfill({
      body: '{"ok":true}',
      contentType: 'application/json',
      status: 200,
    });
  });

  return Object.assign(saves, { events });
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
  // Start from auto/zero whatever the working copy of the file holds.
  await editor.getByTestId('lab-primitive-structure-editor-reset').click();
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

  // Render frame (dev): outlines the render area and the auto-fit area,
  // without touching the framing or hit-testing.
  const canvas = panel.getByTestId('lab-primitive-structure-canvas');
  const frame = canvas.locator('[data-structure-frame]');
  const framedViewBox = await canvas.getAttribute('viewBox');
  const framedRoot = await slabOrigin(panel, 'control-field-root');
  const frameToggle = editor.getByRole('checkbox', { name: 'Render frame' });
  await expect(frameToggle).not.toBeChecked();
  await expect(frame).toHaveCount(0);
  await frameToggle.click();
  await expect(frameToggle).toBeChecked();
  await expect(frame).toHaveCount(1);
  await expect(frame.locator('[data-structure-frame-edge]')).toHaveCount(1);
  await expect(frame.locator('[data-structure-frame-fit]')).toHaveCount(1);
  await expect(frame).toHaveAttribute('pointer-events', 'none');
  await expect(canvas).toHaveAttribute('viewBox', framedViewBox!);
  expect(await slabOrigin(panel, 'control-field-root')).toBe(framedRoot);
  await expect
    .poll(() => saves.at(-1)?.file.demos.controlField?.frame)
    .toBe(true);
  expect(saves.at(-1)!.raw).toContain(
    '"route": "/lab/control-field",\n      "frame": true,\n      "explode": 0.75,\n      "framing"',
  );
  await frameToggle.click();
  await expect(frame).toHaveCount(0);
  await expect
    .poll(() => saves.at(-1)?.file.demos.controlField?.frame)
    .toBe(false);

  // The layer pad runs at half speed: a drag of N px moves the value half as
  // far as an absolute 1:1 drag would (pad range is ±the root's larger side).
  const readX = async () => Number(await xField.inputValue());
  const pad = editor.getByTestId('lab-primitive-structure-layer-pad');
  const padBox = (await pad.boundingBox())!;
  const thumbBox = (await pad
    .locator('[data-slot="plane-thumb"]')
    .boundingBox())!;
  const rootWidth = await page
    .locator('[data-lab-component-preview] [data-slot="control-field"]')
    .evaluate((element) => element.getBoundingClientRect().width);
  const range = Math.max(24, rootWidth);
  const dragPx = 30;
  const xBefore = await readX();
  const grabX = thumbBox.x + thumbBox.width / 2;
  const grabY = thumbBox.y + thumbBox.height / 2;
  await page.mouse.move(grabX, grabY);
  await page.mouse.down();
  await page.mouse.move(grabX + dragPx, grabY, { steps: 6 });
  await page.mouse.up();
  // The Plane maps its padding box (border excluded) to 0..1.
  const absoluteDelta = (dragPx / (padBox.width - 2)) * 2 * range;
  const delta = (await readX()) - xBefore;
  expect(delta).toBeGreaterThan(absoluteDelta * 0.4);
  expect(delta).toBeLessThan(absoluteDelta * 0.6);

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
  await editor.getByTestId('lab-primitive-structure-editor-reset').click();
  await expect.poll(() => slabOrigin(panel, 'plane-root')).not.toBeNull();
  await page.waitForTimeout(400);
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

test('commits the overrides file from the Structure section', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop editor coverage');
  let dirty = false;
  let commitReply: CommitReply = {
    body: {
      commit: 'abc1234',
      message: 'Update structure framing (Control Field)',
      ok: true,
    },
  };
  const saves = await captureSaves(page, {
    commit: () => {
      dirty = false;
      return commitReply;
    },
    dirty: () => dirty,
  });

  await page.goto(
    '/lab/control-field?structureEdit=1&structureLayer=control-field-input',
  );
  const editor = page
    .locator('#lab-properties-panel')
    .getByTestId('lab-primitive-structure-editor');
  const commit = editor.getByTestId('lab-primitive-structure-editor-commit');
  const status = editor.getByTestId('lab-primitive-structure-editor-status');

  // Nothing differs from HEAD: nothing to commit.
  await expect(commit).toBeDisabled();

  // An edit makes it committable; Commit flushes the save, then commits.
  dirty = true;
  const xField = editor
    .getByTestId('lab-primitive-structure-layer-x')
    .getByRole('textbox');
  await xField.click();
  await xField.press('ControlOrMeta+a');
  await xField.pressSequentially('12');
  await expect(commit).toBeDisabled(); // while the save is pending
  await expect(commit).toBeEnabled();
  await commit.click();
  await expect(status).toHaveText('Committed abc1234');
  const commitIndex = saves.events.indexOf('commit');
  expect(saves.events.slice(0, commitIndex)).toContain('save');
  expect(
    saves.at(-1)!.file.demos.controlField!.layers['control-field-input'],
  ).toEqual({ label: 'Input', mode: 'manual', x: 12, z: 0 });
  await expect(commit).toBeDisabled();

  // "Nothing to commit" and git errors show in the status line.
  dirty = true;
  commitReply = { body: { commit: null, ok: true } };
  await editor.getByTestId('lab-primitive-structure-editor-reset').click();
  await expect(commit).toBeEnabled();
  await commit.click();
  await expect(status).toHaveText('Nothing to commit');

  dirty = true;
  commitReply = {
    body: { error: 'HEAD is detached', ok: false },
    status: 409,
  };
  await xField.click();
  await xField.press('ControlOrMeta+a');
  await xField.pressSequentially('3');
  await expect(commit).toBeEnabled();
  await commit.click();
  await expect(status).toHaveText('HEAD is detached');
});

test('starts the render at the demo default explode and saves a new one', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop editor coverage');
  const saves = await captureSaves(page);
  // Serve the overrides module with Slider's default gap set to 0.3.
  await page.route('**/structure-overrides.json?*', async (route) => {
    const response = await route.fetch();
    const text = await response.text();
    await route.fulfill({
      body: text.replace(
        /("slider":\{"label":"Slider","route":"\/lab\/slider","frame":(?:true|false),"explode":)[\d.]+/,
        '$10.3',
      ),
      contentType: 'application/javascript',
      status: 200,
    });
  });

  await page.goto('/lab/slider?structureEdit=1');
  const panel = performancePanelFor(page, 'Slider');
  const render = panel.getByTestId('lab-primitive-structure-render');
  const editor = page
    .locator('#lab-properties-panel')
    .getByTestId('lab-primitive-structure-editor');
  const explodeField = editor
    .getByTestId('lab-primitive-structure-explode')
    .getByRole('textbox');
  const useCurrent = editor.getByTestId(
    'lab-primitive-structure-explode-use-current',
  );

  // The render starts from the file's default; the field shows it.
  await expect(render).toHaveAttribute(
    'data-primitive-structure-explode',
    '0.30',
  );
  await expect(explodeField).toHaveValue('0.3');
  await expect(useCurrent).toBeDisabled();

  // Changing the live gap does not save; "Use current" saves it.
  await render.focus();
  await page.keyboard.press('PageUp');
  await page.keyboard.press('PageUp');
  await expect(render).toHaveAttribute(
    'data-primitive-structure-explode',
    '0.70',
  );
  await page.waitForTimeout(400);
  expect(saves).toHaveLength(0);
  await expect(useCurrent).toBeEnabled();
  await useCurrent.click();
  await expect.poll(() => saves.at(-1)?.file.demos.slider?.explode).toBe(0.7);
  await expect(explodeField).toHaveValue('0.7');
  expect(saves.at(-1)!.raw).toContain(
    '"frame": false,\n      "explode": 0.7,\n      "framing"',
  );

  // Typing a default saves it and moves the render there.
  await explodeField.click();
  await explodeField.press('ControlOrMeta+a');
  await explodeField.pressSequentially('0.45');
  await explodeField.press('Enter');
  await expect.poll(() => saves.at(-1)?.file.demos.slider?.explode).toBe(0.45);
  await expect(render).toHaveAttribute(
    'data-primitive-structure-explode',
    '0.45',
  );

  // Reset demo restores 0.75.
  await editor.getByTestId('lab-primitive-structure-editor-reset').click();
  await expect.poll(() => saves.at(-1)?.file.demos.slider?.explode).toBe(0.75);
  await expect(explodeField).toHaveValue('0.75');
});
