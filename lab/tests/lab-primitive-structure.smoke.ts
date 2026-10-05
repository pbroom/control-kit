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

async function expectCalloutLinesAttachToLabels(panel: Locator) {
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
            targetX >= 2 &&
            targetX <= 66 &&
            targetY >= 10 &&
            targetY <= 90 &&
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

  // The explode control opens the gap between layers.
  const gapReadout = colorPlanePanel.getByTestId(
    'lab-primitive-structure-gap-readout',
  );
  const gapBefore = await gapReadout.textContent();
  const raisedBefore = colorPlaneSlabs.at(-1)!.top;
  await colorPlanePanel
    .getByTestId('lab-primitive-structure-gap-control')
    .getByRole('slider')
    .focus();
  await page.keyboard.press('End');
  await expect(gapReadout).not.toHaveText(gapBefore ?? '');
  await expect
    .poll(async () => (await readSlabs(colorPlanePanel)).at(-1)!.top)
    .toBeLessThan(raisedBefore - 4);
  await page.keyboard.press('Home');
  await expect(gapReadout).toHaveText('gap 0.0px');

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
  const readout = panel.getByTestId('lab-primitive-structure-gap-readout');
  await panel
    .getByTestId('lab-primitive-structure-gap-control')
    .getByRole('slider')
    .focus();
  await page.keyboard.press('Home');
  // Eased, the gap needs ~0.5s to settle; reduced motion lands on it at once.
  await expect(readout).toHaveText('gap 0.0px', { timeout: 150 });
});
