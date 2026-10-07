import { expect, type Locator, type Page, test } from '@playwright/test';
import {
  collectBrowserErrors,
  openLabRoot,
  performancePanelFor,
} from './lab-smoke-utils.js';

const CALLOUT_LABEL_X = 70;

type NodeAttributes = {
  component: string | null;
  depth: string | null;
  id: string | null;
  parent: string | null;
  relation: string | null;
  slot: string | null;
};

async function readNodes(locator: Locator): Promise<NodeAttributes[]> {
  return locator.evaluateAll((items) =>
    items.map((item) => ({
      component: item.getAttribute('data-primitive-component'),
      depth: item.getAttribute('data-primitive-depth'),
      id: item.getAttribute('data-primitive-node'),
      parent: item.getAttribute('data-primitive-parent'),
      relation: item.getAttribute('data-primitive-relation'),
      slot: item.getAttribute('data-primitive-slot'),
    })),
  );
}

/** The figure's slab groups, in paint order, with their on-screen boxes. */
async function readSlabs(panel: Locator) {
  return panel
    .getByTestId('lab-primitive-structure-canvas')
    .locator('[data-structure-slab]')
    .evaluateAll((groups) =>
      groups.map((group) => {
        const top = group.querySelector('[data-structure-top]');
        const box = (top ?? group).getBoundingClientRect();

        return {
          bottom: box.bottom,
          d: top?.getAttribute('d') ?? '',
          height: box.height,
          key: group.getAttribute('data-structure-slab'),
          left: box.left,
          level: Number(group.getAttribute('data-structure-level')),
          node: group.getAttribute('data-structure-node'),
          ghost: group.getAttribute('data-structure-ghost') === 'true',
          origin: group.getAttribute('data-structure-origin'),
          painted: group.getAttribute('data-structure-painted') === 'true',
          right: box.right,
          top: box.top,
          width: box.width,
        };
      }),
    );
}

async function expectFigureDrawn(panel: Locator, minimumSlabs: number) {
  await expect
    .poll(async () => (await readSlabs(panel)).length)
    .toBeGreaterThanOrEqual(minimumSlabs);
}

/** Moves over the visible centre of each slab, topmost first, until one reports hover. */
async function hoverFigureLayer(page: Page, panel: Locator, shell: Locator) {
  const slabs = (await readSlabs(panel)).reverse();

  for (const slab of slabs) {
    await page.mouse.move(
      slab.left + slab.width / 2,
      slab.top + slab.height / 2,
    );
    const hovered = await shell.getAttribute(
      'data-primitive-structure-hover-layer',
    );

    if (hovered) {
      return hovered;
    }
  }

  return null;
}

async function expectStructureGeometryClearsCalloutLabels(panel: Locator) {
  const [slabs, labelLeft] = await Promise.all([
    readSlabs(panel),
    panel
      .locator('[data-primitive-callout-label]')
      .evaluateAll((labels) =>
        Math.min(...labels.map((label) => label.getBoundingClientRect().left)),
      ),
  ]);

  expect(slabs.length).toBeGreaterThan(0);
  expect(
    labelLeft - Math.max(...slabs.map((slab) => slab.right)),
  ).toBeGreaterThanOrEqual(8);
}

/** Labels trail on a spring; wait until they have come to rest. */
async function waitForLabelsToSettle(panel: Locator) {
  const read = () =>
    panel
      .locator('[data-primitive-callout-label]')
      .evaluateAll((labels) =>
        labels
          .map(
            (label) =>
              `${(label as HTMLElement).style.left}|${(label as HTMLElement).style.top}`,
          )
          .join(';'),
      );
  let previous = await read();

  await expect
    .poll(
      async () => {
        await panel.page().waitForTimeout(120);
        const current = await read();
        const stable = current === previous;
        previous = current;
        return stable;
      },
      { timeout: 4000 },
    )
    .toBe(true);
}

async function expectCalloutLinesAttachToLabels(panel: Locator) {
  await waitForLabelsToSettle(panel);
  const calloutGeometry = await panel
    .locator('[data-primitive-callout-line]')
    .evaluateAll(
      (paths, labelRail) =>
        paths.map((path) => {
          const values =
            path
              .getAttribute('d')
              ?.match(/-?\d+(?:\.\d+)?/g)
              ?.map(Number) ?? [];
          const [targetX = 0, targetY = 0, labelX = 0, labelY = 0] = values;

          return (
            targetX < labelX &&
            targetX >= 0 &&
            targetX <= 66 &&
            targetY >= 0 &&
            targetY <= 100 &&
            Math.abs(labelX - labelRail) < 0.5 &&
            Math.hypot(labelX - targetX, labelY - targetY) > 3
          );
        }),
      CALLOUT_LABEL_X,
    );

  expect(calloutGeometry.length).toBeGreaterThan(0);
  expect(calloutGeometry.every(Boolean)).toBe(true);
}

async function expectCalloutLabelsDoNotOverlap(panel: Locator) {
  await waitForLabelsToSettle(panel);
  const labelBoxes = await panel
    .locator('[data-primitive-callout-label]')
    .evaluateAll((labels) =>
      labels
        .map((label) => {
          const rect = label.getBoundingClientRect();

          return {
            bottom: rect.bottom,
            id: label.getAttribute('data-primitive-callout-label-text'),
            top: rect.top,
          };
        })
        .sort((left, right) => left.top - right.top),
    );

  for (let index = 0; index < labelBoxes.length - 1; index += 1) {
    expect(
      labelBoxes[index]!.bottom,
      `${labelBoxes[index]!.id} overlaps ${labelBoxes[index + 1]!.id}`,
    ).toBeLessThanOrEqual(labelBoxes[index + 1]!.top + 0.5);
  }
}

/**
 * What must not move when a part moves or appears: the frame and the root.
 * (Labels follow their parts, so they are not part of this.)
 */
async function readFraming(panel: Locator, rootNode: string) {
  const canvas = panel.getByTestId('lab-primitive-structure-canvas');
  const [viewBox, slabs] = await Promise.all([
    canvas.getAttribute('viewBox'),
    readSlabs(panel),
  ]);

  return {
    rootOrigin: slabs.find((slab) => slab.node === rootNode)?.origin ?? null,
    viewBox,
  };
}

/**
 * Samples every callout label's box on each animation frame for `ms`, and
 * reports whether any two ever intersected.
 */
async function sampleLabelOverlaps(panel: Locator, ms: number) {
  return panel.getByTestId('lab-primitive-structure-render').evaluate(
    (render, duration) =>
      new Promise<{ frames: number; overlaps: string[] }>((resolve) => {
        const overlaps: string[] = [];
        let frames = 0;
        const start = performance.now();
        const sample = () => {
          frames += 1;
          const boxes = Array.from(
            render.querySelectorAll<HTMLElement>(
              '[data-primitive-callout-label]',
            ),
          ).map((label) => {
            const text = label.firstElementChild ?? label;
            const rect = text.getBoundingClientRect();

            return {
              bottom: rect.bottom,
              id: label.getAttribute('data-primitive-callout-label'),
              left: rect.left,
              right: rect.right,
              top: rect.top,
            };
          });

          for (let i = 0; i < boxes.length; i += 1) {
            for (let j = i + 1; j < boxes.length; j += 1) {
              const a = boxes[i]!;
              const b = boxes[j]!;
              if (
                a.left < b.right - 0.5 &&
                b.left < a.right - 0.5 &&
                a.top < b.bottom - 0.5 &&
                b.top < a.bottom - 0.5
              ) {
                overlaps.push(`${a.id}/${b.id}@${frames}`);
              }
            }
          }

          if (performance.now() - start < duration) {
            requestAnimationFrame(sample);
          } else {
            resolve({ frames, overlaps });
          }
        };
        requestAnimationFrame(sample);
      }),
    ms,
  );
}

async function dragRender(page: Page, panel: Locator, deltaY: number) {
  const box = (await panel
    .getByTestId('lab-primitive-structure-render')
    .boundingBox())!;
  const x = box.x + box.width * 0.85;
  const y = box.y + box.height / 2;

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + deltaY, { steps: 6 });
  await page.mouse.up();
}

async function readExplode(panel: Locator) {
  return Number(
    await panel
      .getByTestId('lab-primitive-structure-render')
      .getAttribute('data-primitive-structure-explode'),
  );
}

async function expectCalloutCount(panel: Locator, count: number) {
  for (const attribute of [
    'data-primitive-callout-line',
    'data-primitive-callout-hit',
    'data-primitive-callout-label',
    'data-primitive-callout-dot',
  ]) {
    await expect(panel.locator(`[${attribute}]`)).toHaveCount(count);
  }
}

test('renders the primitive structure tab as a measured isometric figure', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop figure coverage');
  const browserErrors = await collectBrowserErrors(page);

  await openLabRoot(page);
  await page.goto('/lab/color-plane');
  await expect(page).toHaveURL(/\/lab\/color-plane$/);

  const colorPlanePanel = performancePanelFor(page, 'ColorPlane');
  const metricsTab = colorPlanePanel.getByRole('tab', {
    name: 'Metrics',
    exact: true,
  });
  const structureTab = colorPlanePanel.getByRole('tab', {
    name: 'Structure',
    exact: true,
  });

  await expect(metricsTab).toHaveAttribute('aria-selected', 'false');
  await expect(structureTab).toHaveAttribute('aria-selected', 'true');
  await expect(
    colorPlanePanel.getByRole('tabpanel', { name: 'Structure', exact: true }),
  ).toBeVisible();
  await expect(
    colorPlanePanel.getByRole('tabpanel', { name: 'Structure', exact: true }),
  ).toHaveAttribute('tabindex', '0');
  await expect(
    colorPlanePanel.getByText('ColorPlane primitive', { exact: true }),
  ).toBeVisible();

  const structureShell = colorPlanePanel.getByTestId(
    'lab-primitive-structure-shell',
  );
  await expect(structureShell).toHaveAttribute(
    'data-primitive-structure-label-renderer',
    'svg-callouts',
  );
  await expect(structureShell).toHaveAttribute(
    'data-primitive-structure-schema',
    'node-tree',
  );

  const renderSurface = colorPlanePanel.getByTestId(
    'lab-primitive-structure-render',
  );
  await expect(renderSurface).toHaveAttribute(
    'data-primitive-structure-surface',
    'transparent',
  );
  await expect(renderSurface).toHaveAttribute(
    'data-primitive-structure-renderer',
    'svg',
  );
  expect(
    await renderSurface.evaluate((element) => {
      const style = window.getComputedStyle(element);

      return {
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        borderTopWidth: style.borderTopWidth,
      };
    }),
  ).toEqual({
    backgroundColor: 'rgba(0, 0, 0, 0)',
    backgroundImage: 'none',
    borderTopWidth: '0px',
  });

  const canvas = colorPlanePanel.getByTestId('lab-primitive-structure-canvas');
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('role', 'img');
  for (const [name, value] of [
    ['axis', 'z'],
    ['geometry', 'measured-dom'],
    ['layout', 'dom-rects'],
    ['layer-gap', 'adjustable'],
    ['guides', 'callouts'],
    ['interaction', 'hit-test'],
    ['motion', 'on-demand'],
    ['palette', 'hairline'],
  ] as const) {
    await expect(canvas).toHaveAttribute(
      `data-primitive-structure-${name}`,
      value,
    );
  }
  const canvasBox = await canvas.boundingBox();
  expect(canvasBox!.width).toBeGreaterThan(300);
  expect(canvasBox!.height).toBeGreaterThan(180);

  // Frame, raster and thumb are rendered; the overlay layers are off by default.
  await expectFigureDrawn(colorPlanePanel, 3);
  const colorPlaneSlabs = await readSlabs(colorPlanePanel);
  expect(colorPlaneSlabs.map((slab) => slab.node)).toEqual([
    'plane-frame',
    'gamut-raster',
    'active-thumb',
  ]);
  expect(colorPlaneSlabs.map((slab) => slab.level)).toEqual([0, 1, 2]);
  await expect(
    canvas.locator('[data-structure-node="gamut-raster"] path'),
  ).not.toHaveCount(0);

  await expectCalloutCount(colorPlanePanel, 3);
  await expect(
    colorPlanePanel.locator('[data-primitive-callout-layer="true"]'),
  ).toHaveCount(2);
  await expectCalloutLinesAttachToLabels(colorPlanePanel);
  await expectCalloutLabelsDoNotOverlap(colorPlanePanel);
  await expectStructureGeometryClearsCalloutLabels(colorPlanePanel);
  const labelMetrics = await colorPlanePanel
    .locator('[data-primitive-callout-label]')
    .evaluateAll((labels) =>
      labels.map((label) => {
        const style = window.getComputedStyle(label);

        return {
          borderRadius: style.borderRadius,
          fontSize: style.fontSize,
          height: Math.round(label.getBoundingClientRect().height),
          lineHeight: style.lineHeight,
          transitionDuration: style.transitionDuration,
        };
      }),
    );
  expect(
    labelMetrics.every(
      (label) =>
        label.borderRadius === '0px' &&
        label.height >= 20 &&
        label.fontSize === '10px' &&
        label.lineHeight === '12px' &&
        label.transitionDuration === '0.3s',
    ),
  ).toBe(true);

  expect(
    await readNodes(colorPlanePanel.locator('[data-primitive-node]')),
  ).toEqual([
    {
      component: 'Background',
      depth: '1',
      id: 'checkerboard-background',
      parent: 'plane-frame',
      relation: 'slot',
      slot: 'children',
    },
    {
      component: 'ColorPlane',
      depth: '1',
      id: 'gamut-raster',
      parent: 'plane-frame',
      relation: 'child',
      slot: 'children',
    },
    {
      component: 'Layer',
      depth: '1',
      id: 'overlay-boundaries',
      parent: 'plane-frame',
      relation: 'slot',
      slot: 'overlay',
    },
    {
      component: 'GamutBoundaryLayer',
      depth: '2',
      id: 'gamut-boundaries',
      parent: 'overlay-boundaries',
      relation: 'child',
      slot: 'overlay',
    },
    {
      component: 'FallbackPointsLayer',
      depth: '2',
      id: 'fallback-points',
      parent: 'overlay-boundaries',
      relation: 'child',
      slot: 'overlay',
    },
    {
      component: 'Thumb',
      depth: '1',
      id: 'active-thumb',
      parent: 'plane-frame',
      relation: 'implicit',
      slot: 'thumb',
    },
  ]);

  // Callout lines and labels do not steal hover; the figure does.
  await colorPlanePanel
    .locator('[data-primitive-callout-label="gamut-raster"]')
    .hover();
  await expect(structureShell).not.toHaveAttribute(
    'data-primitive-structure-hover-layer',
  );
  await colorPlanePanel.locator('[data-primitive-node="active-thumb"]').hover();
  await expect(structureShell).not.toHaveAttribute(
    'data-primitive-structure-hover-layer',
  );
  const hoveredLayer = await hoverFigureLayer(
    page,
    colorPlanePanel,
    structureShell,
  );
  expect(['plane-frame', 'gamut-raster', 'active-thumb']).toContain(
    hoveredLayer,
  );
  const mutedLayer =
    hoveredLayer === 'gamut-raster' ? 'active-thumb' : 'gamut-raster';
  await expect(
    colorPlanePanel.locator(
      `[data-primitive-callout-layer="true"][data-primitive-layer="${mutedLayer}"]`,
    ),
  ).toHaveClass(/opacity-35/);
  await page.mouse.move(0, 0);
  await expect(structureShell).not.toHaveAttribute(
    'data-primitive-structure-hover-layer',
  );

  // Idle figures do not animate.
  const idleMarkup = await canvas.innerHTML();
  await page.waitForTimeout(350);
  expect(await canvas.innerHTML()).toBe(idleMarkup);

  // Dragging on the render opens (up) and closes (down) the stack.
  const render = colorPlanePanel.getByTestId('lab-primitive-structure-render');
  await expect(render).toHaveAttribute('role', 'slider');
  await expect(render).toHaveAttribute(
    'aria-label',
    'Exploded structure; use Up/Down arrows to adjust spacing',
  );
  await expect(render).toHaveCSS('cursor', 'ns-resize');
  await expect(
    colorPlanePanel.getByTestId('lab-primitive-structure-gap-control'),
  ).toHaveCount(0);
  const explodeBefore = await readExplode(colorPlanePanel);
  const raisedBefore = colorPlaneSlabs.at(-1)!.top;
  await dragRender(page, colorPlanePanel, -60);
  expect(await readExplode(colorPlanePanel)).toBeGreaterThan(explodeBefore);
  await expect
    .poll(async () => (await readSlabs(colorPlanePanel)).at(-1)!.top)
    .toBeLessThan(raisedBefore - 4);
  const explodeOpened = await readExplode(colorPlanePanel);
  await dragRender(page, colorPlanePanel, 90);
  expect(await readExplode(colorPlanePanel)).toBeLessThan(explodeOpened);

  // Touch drags are ignored so the page can scroll.
  const explodeBeforeTouch = await readExplode(colorPlanePanel);
  await render.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width * 0.85;
    const init = { bubbles: true, pointerId: 7, pointerType: 'touch' };
    element.dispatchEvent(
      new PointerEvent('pointerdown', {
        ...init,
        clientX: x,
        clientY: rect.top + 200,
      }),
    );
    element.dispatchEvent(
      new PointerEvent('pointermove', {
        ...init,
        clientX: x,
        clientY: rect.top + 40,
      }),
    );
    element.dispatchEvent(
      new PointerEvent('pointerup', { ...init, clientX: x, clientY: 40 }),
    );
  });
  expect(await readExplode(colorPlanePanel)).toBe(explodeBeforeTouch);

  // Keyboard: arrows step, PageUp/PageDown step further, Home/End jump.
  await render.focus();
  await page.keyboard.press('Home');
  await expect(render).toHaveAttribute(
    'data-primitive-structure-explode',
    '0.00',
  );
  await page.keyboard.press('ArrowUp');
  await expect(render).toHaveAttribute(
    'data-primitive-structure-explode',
    '0.05',
  );
  await page.keyboard.press('PageUp');
  await expect(render).toHaveAttribute(
    'data-primitive-structure-explode',
    '0.25',
  );
  await page.keyboard.press('ArrowDown');
  await expect(render).toHaveAttribute(
    'data-primitive-structure-explode',
    '0.20',
  );
  await page.keyboard.press('PageDown');
  await expect(render).toHaveAttribute(
    'data-primitive-structure-explode',
    '0.00',
  );
  await expect(render).toHaveAttribute('aria-valuenow', '0');
  await page.keyboard.press('End');
  await expect(render).toHaveAttribute('aria-valuenow', '100');

  // Changing the gap: slabs move at once, labels trail on a spring and
  // never overlap on any frame, then settle and stay put.
  const labelTops = () =>
    colorPlanePanel
      .locator('[data-primitive-callout-label]')
      .evaluateAll((labels) =>
        labels.map((label) => (label as HTMLElement).style.top),
      );
  const settledOpen = await labelTops();
  await page.keyboard.press('Home');
  const closing = await sampleLabelOverlaps(colorPlanePanel, 1200);
  expect(closing.frames).toBeGreaterThan(10);
  expect(closing.overlaps).toEqual([]);
  const settledClosed = await labelTops();
  expect(settledClosed).not.toEqual(settledOpen);
  await page.waitForTimeout(250);
  expect(await labelTops()).toEqual(settledClosed);
  await page.keyboard.press('End');
  expect((await sampleLabelOverlaps(colorPlanePanel, 1200)).overlaps).toEqual(
    [],
  );
  await expectCalloutLabelsDoNotOverlap(colorPlanePanel);
  await expectCalloutLinesAttachToLabels(colorPlanePanel);

  await metricsTab.click();
  await expect(canvas).toHaveCount(0);
  await structureTab.click();
  await expectFigureDrawn(colorPlanePanel, 3);

  // ControlField: slabs match the rendered parts, and update when they change.
  await page.getByRole('link', { name: 'Control Field', exact: true }).click();
  await expect(page).toHaveURL(/\/lab\/control-field$/);
  const controlFieldPanel = performancePanelFor(page, 'Control Field');
  await expectFigureDrawn(controlFieldPanel, 4);
  const inputSize = await page
    .locator('[data-lab-component-preview] [data-slot="control-field-input"]')
    .evaluate((element) => {
      const rect = element.getBoundingClientRect();

      return `${Math.round(rect.width * 10) / 10}x${Math.round(rect.height * 10) / 10}`;
    });
  await expect(
    controlFieldPanel.locator('[data-primitive-node="control-field-input"]'),
  ).toHaveAttribute('data-primitive-measured', inputSize);
  expect(
    (await readSlabs(controlFieldPanel)).map((slab) => [slab.node, slab.level]),
  ).toEqual([
    ['control-field-root', 0],
    ['control-field-group', 1],
    ['control-field-scrub-area', 2],
    ['control-field-input', 2],
  ]);
  await expect(
    controlFieldPanel.locator(
      '[data-structure-node="control-field-input"] [data-structure-text]',
    ),
  ).toHaveCount(1);
  await expectCalloutLinesAttachToLabels(controlFieldPanel);
  await expectCalloutLabelsDoNotOverlap(controlFieldPanel);

  // Plane: moving the thumb re-measures it.
  await page.getByRole('link', { name: 'Plane', exact: true }).click();
  await expect(page).toHaveURL(/\/lab\/plane$/);
  const planePanel = performancePanelFor(page, 'Plane');
  await expectFigureDrawn(planePanel, 2);
  const thumbBefore = (await readSlabs(planePanel)).find(
    (slab) => slab.node === 'plane-thumb',
  )!.d;
  const planeFraming = await readFraming(planePanel, 'plane-root');
  await page
    .locator('[data-lab-component-preview] [data-slot="plane-thumb"] input')
    .first()
    .focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(
      async () =>
        (await readSlabs(planePanel)).find(
          (slab) => slab.node === 'plane-thumb',
        )?.d,
    )
    .not.toBe(thumbBefore);
  // Only the thumb moved: same frame, same root.
  expect(await readFraming(planePanel, 'plane-root')).toEqual(planeFraming);

  // Dragging the thumb moves its slab every frame of the drag (sampled
  // before release), without layout reads on the Plane root.
  const previewThumb = page.locator(
    '[data-lab-component-preview] [data-slot="plane-thumb"]',
  );
  const previewPlane = page.locator(
    '[data-lab-component-preview] [data-slot="plane"]',
  );
  const [planeBox, thumbBox] = await Promise.all([
    previewPlane.boundingBox(),
    previewThumb.boundingBox(),
  ]);
  const thumbSlab = async () =>
    (await readSlabs(planePanel)).find((slab) => slab.node === 'plane-thumb')!;
  const beforeDrag = await thumbSlab();
  await page.mouse.move(
    thumbBox!.x + thumbBox!.width / 2,
    thumbBox!.y + thumbBox!.height / 2,
  );
  await previewPlane.evaluate((plane) => {
    let reads = 0;
    const original = plane.getBoundingClientRect.bind(plane);
    plane.getBoundingClientRect = () => {
      reads += 1;
      return original();
    };
    // Count from the press on (a hover can still be settling before it).
    window.addEventListener(
      'pointerdown',
      () => {
        reads = 0;
      },
      { capture: true, once: true },
    );
    Object.assign(window, { __planeRootReads: () => reads });
  });
  await page.mouse.down();
  await page.mouse.move(
    planeBox!.x + planeBox!.width * 0.25,
    planeBox!.y + planeBox!.height * 0.3,
    { steps: 12 },
  );
  await page.waitForTimeout(60);
  const midDrag = await thumbSlab();
  const midDragReads = await page.evaluate(() =>
    (
      window as unknown as { __planeRootReads: () => number }
    ).__planeRootReads(),
  );
  await page.mouse.move(
    planeBox!.x + planeBox!.width * 0.15,
    planeBox!.y + planeBox!.height * 0.7,
    { steps: 12 },
  );
  await page.waitForTimeout(60);
  const laterDrag = await thumbSlab();
  await page.mouse.up();
  expect(midDrag.origin).not.toBe(beforeDrag.origin);
  expect(laterDrag.origin).not.toBe(midDrag.origin);
  // The Plane's own reads at drag start (it allows itself two); none of
  // ours while the drag runs.
  expect(midDragReads).toBeLessThanOrEqual(2);
  expect(await readFraming(planePanel, 'plane-root')).toEqual(planeFraming);

  await page.getByRole('link', { name: 'Checkbox', exact: true }).click();
  await expect(page).toHaveURL(/\/lab\/checkbox$/);
  const checkboxPanel = performancePanelFor(page, 'Checkbox');
  await expect(
    checkboxPanel.getByText('Checkbox primitive', { exact: true }),
  ).toBeVisible();
  await expectFigureDrawn(checkboxPanel, 4);
  await expectCalloutCount(checkboxPanel, 4);
  await expectCalloutLinesAttachToLabels(checkboxPanel);
  await expectCalloutLabelsDoNotOverlap(checkboxPanel);

  await page.getByRole('link', { name: 'Menu', exact: true }).click();
  await expect(page).toHaveURL(/\/lab\/menu$/);
  const menuPanel = performancePanelFor(page, 'Menu');
  await expect(
    menuPanel.getByText('Menu primitive', { exact: true }),
  ).toBeVisible();
  await expectFigureDrawn(menuPanel, 1);
  // Closed popups are drawn as ghosts at their expected place, so the frame
  // already covers the open menu and its submenu.
  const ghostNodes = async () =>
    Object.fromEntries(
      (await readSlabs(menuPanel))
        .filter((slab) => slab.node !== 'menu-items')
        .map((slab) => [slab.node, slab.ghost]),
    );
  expect(await ghostNodes()).toEqual({
    'menu-content': true,
    'menu-trigger': false,
    'submenu-content': true,
  });
  const menuFraming = await readFraming(menuPanel, 'menu-trigger');
  const menuTrigger = page.locator(
    '[data-lab-component-preview] [data-slot="dropdown-menu-trigger"]',
  );
  await menuTrigger.click();
  await expect.poll(ghostNodes).toEqual({
    'menu-content': false,
    'menu-trigger': false,
    'submenu-content': true,
  });
  // Open a submenu from the keyboard (first submenu row is second).
  const submenuRow = page
    .locator('[data-slot="dropdown-menu-sub-trigger"]')
    .first();
  await submenuRow.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(ghostNodes).toEqual({
    'menu-content': false,
    'menu-trigger': false,
    'submenu-content': false,
  });
  // Same viewBox, trigger and label rows as when closed.
  expect(await readFraming(menuPanel, 'menu-trigger')).toEqual(menuFraming);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect.poll(ghostNodes).toEqual({
    'menu-content': true,
    'menu-trigger': false,
    'submenu-content': true,
  });
  expect(await readFraming(menuPanel, 'menu-trigger')).toEqual(menuFraming);
  await expectCalloutLinesAttachToLabels(menuPanel);
  await expectCalloutLabelsDoNotOverlap(menuPanel);
  await expectStructureGeometryClearsCalloutLabels(menuPanel);

  await page.getByRole('link', { name: 'Tabs', exact: true }).click();
  await expect(page).toHaveURL(/\/lab\/tabs$/);
  const tabsPanel = performancePanelFor(page, 'Tabs');
  await expect(
    tabsPanel.getByText('A tablist shell containing repeated tab triggers', {
      exact: false,
    }),
  ).toBeVisible();
  await expectFigureDrawn(tabsPanel, 5);
  await expectCalloutCount(tabsPanel, 4);
  await expect(
    tabsPanel.locator('[data-primitive-callout-layer="true"]'),
  ).toHaveCount(3);
  expect(await readNodes(tabsPanel.locator('[data-primitive-node]'))).toEqual([
    {
      component: 'TabsList',
      depth: '1',
      id: 'tabs-list',
      parent: 'tabs-root',
      relation: 'child',
      slot: 'children',
    },
    {
      component: 'TabsTrigger',
      depth: '2',
      id: 'inactive-tabs',
      parent: 'tabs-list',
      relation: 'child',
      slot: 'trigger',
    },
    {
      component: 'TabsTrigger',
      depth: '2',
      id: 'active-tab',
      parent: 'tabs-list',
      relation: 'child',
      slot: 'trigger',
    },
    {
      component: 'TabsContent',
      depth: '1',
      id: 'tab-content',
      parent: 'tabs-root',
      relation: 'sibling',
      slot: 'content',
    },
    {
      component: 'TabsContent',
      depth: '1',
      id: 'inactive-tab-content',
      parent: 'tabs-root',
      relation: 'sibling',
      slot: 'content',
    },
  ]);
  // Icons and labels are drawn on the triggers as geometry.
  await expect(
    tabsPanel.locator(
      '[data-structure-node="active-tab"] [data-structure-icon]',
    ),
  ).toHaveCount(1);
  await expect(
    tabsPanel.locator(
      '[data-structure-node="active-tab"] [data-structure-text]',
    ),
  ).toHaveCount(1);
  await expectCalloutLinesAttachToLabels(tabsPanel);
  await expectCalloutLabelsDoNotOverlap(tabsPanel);
  const tabsShell = tabsPanel.getByTestId('lab-primitive-structure-shell');
  const hoveredTabsLayer = await hoverFigureLayer(page, tabsPanel, tabsShell);
  expect(['tabs-root', 'tabs-list', 'active-tab', 'inactive-tabs']).toContain(
    hoveredTabsLayer,
  );
  await page.mouse.move(0, 0);

  await page.getByRole('link', { name: 'Select', exact: true }).click();
  await expect(page).toHaveURL(/\/lab\/select$/);
  const selectPanel = performancePanelFor(page, 'Select');
  await expect(
    selectPanel.getByText('Select primitive', { exact: true }),
  ).toBeVisible();
  await expect(
    selectPanel.locator('[data-primitive-layer="select-content"]'),
  ).toBeVisible();
  await expectFigureDrawn(selectPanel, 1);

  expect(browserErrors).toEqual([]);
});

test('jumps the explode gap under reduced motion', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop figure coverage');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openLabRoot(page);
  await page.goto('/lab/slider');
  const panel = performancePanelFor(page, 'Slider');
  await expectFigureDrawn(panel, 3);
  await expect(
    panel.getByTestId('lab-primitive-structure-canvas'),
  ).toHaveAttribute('data-primitive-structure-motion', 'reduced');
  const render = panel.getByTestId('lab-primitive-structure-render');
  await render.focus();
  await page.keyboard.press('Home');
  // Eased, the stack needs ~0.5s to settle; reduced motion lands at once.
  await page.waitForTimeout(60);
  const labelTops = () =>
    panel
      .locator('[data-primitive-callout-label]')
      .evaluateAll((labels) =>
        labels.map((label) => (label as HTMLElement).style.top),
      );
  const settled = (await readSlabs(panel)).map((slab) => slab.top);
  // Labels jump to their solved rows too (no spring).
  const settledLabels = await labelTops();
  await page.waitForTimeout(400);
  expect((await readSlabs(panel)).map((slab) => slab.top)).toEqual(settled);
  expect(await labelTops()).toEqual(settledLabels);
});
