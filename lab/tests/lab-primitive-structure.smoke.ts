import { expect, type Locator, type Page, test } from '@playwright/test';
import {
  collectBrowserErrors,
  openLabRoot,
  performancePanelFor,
} from './lab-smoke-utils.js';

function sampleStructureCanvas(element: SVGElement | HTMLElement) {
  const webglCanvas = element as HTMLCanvasElement;
  const gl =
    webglCanvas.getContext('webgl2', {
      preserveDrawingBuffer: true,
    }) ??
    webglCanvas.getContext('webgl', {
      preserveDrawingBuffer: true,
    });

  if (!gl) {
    return {
      canvasHeight: webglCanvas.height,
      canvasWidth: webglCanvas.width,
      checksum: 0,
      litBounds: null,
      litPixels: 0,
    };
  }

  const pixels = new Uint8Array(webglCanvas.width * webglCanvas.height * 4);
  gl.readPixels(
    0,
    0,
    webglCanvas.width,
    webglCanvas.height,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    pixels,
  );

  let checksum = 0;
  let litPixels = 0;
  let maxX = -1;
  let maxY = -1;
  let minX = webglCanvas.width;
  let minY = webglCanvas.height;

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3] ?? 0;
    const brightness =
      (pixels[index] ?? 0) +
      (pixels[index + 1] ?? 0) +
      (pixels[index + 2] ?? 0);

    if (alpha > 0 && brightness > 32) {
      const pixelIndex = index / 4;
      const x = pixelIndex % webglCanvas.width;
      const y = Math.floor(pixelIndex / webglCanvas.width);

      litPixels += 1;
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
    }

    checksum = (checksum + brightness * (index + 1) + alpha) % 1_000_000_007;
  }

  return {
    canvasHeight: webglCanvas.height,
    canvasWidth: webglCanvas.width,
    checksum,
    litBounds:
      litPixels > 0
        ? {
            height: maxY - minY + 1,
            maxX,
            maxY,
            minX,
            minY,
            width: maxX - minX + 1,
          }
        : null,
    litPixels,
  };
}

async function findCanvasHoveredLayer(
  page: Page,
  canvas: Locator,
  shell: Locator,
) {
  const canvasBox = await canvas.boundingBox();
  expect(canvasBox).not.toBeNull();

  const samplePoints = [
    [0.42, 0.54],
    [0.48, 0.56],
    [0.36, 0.62],
    [0.52, 0.48],
    [0.44, 0.68],
  ];

  for (const [xRatio, yRatio] of samplePoints) {
    await page.mouse.move(
      canvasBox!.x + canvasBox!.width * xRatio,
      canvasBox!.y + canvasBox!.height * yRatio,
    );

    const hoveredLayer = await shell.getAttribute(
      'data-primitive-structure-hover-layer',
    );

    if (hoveredLayer) {
      return hoveredLayer;
    }
  }

  return null;
}

async function expectStructureGeometryClearsCalloutLabels(
  performancePanel: Locator,
) {
  const canvas = performancePanel.getByTestId('lab-primitive-structure-canvas');
  const [canvasBox, sample, labelLeft] = await Promise.all([
    canvas.boundingBox(),
    canvas.evaluate(sampleStructureCanvas),
    performancePanel
      .locator('[data-primitive-callout-label]')
      .evaluateAll((labels) =>
        Math.min(...labels.map((label) => label.getBoundingClientRect().left)),
      ),
  ]);

  expect(canvasBox).not.toBeNull();
  expect(sample.litBounds).not.toBeNull();

  const litRight =
    canvasBox!.x +
    ((sample.litBounds!.maxX + 1) / sample.canvasWidth) * canvasBox!.width;

  expect(labelLeft - litRight).toBeGreaterThanOrEqual(8);
}

async function expectCalloutLinesAttachToLabels(performancePanel: Locator) {
  const calloutGeometry = await performancePanel
    .locator('[data-primitive-callout-line]')
    .evaluateAll((paths) =>
      paths.map((path) => {
        const values =
          path
            .getAttribute('d')
            ?.match(/-?\d+(?:\.\d+)?/g)
            ?.map(Number) ?? [];
        const targetX = values[0] ?? 0;
        const targetY = values[1] ?? 0;
        const labelX = values[2] ?? 0;
        const labelY = values[3] ?? 0;

        return {
          labelX,
          targetBeforeLabel: targetX < labelX,
          targetInBounds:
            targetX >= 4 && targetX <= 63 && targetY >= 10 && targetY <= 90,
          terminatesAtLabelRail: Math.abs(labelX - 68) < 0.5,
          hasLength: Math.hypot(labelX - targetX, labelY - targetY) > 4,
        };
      }),
    );

  expect(
    calloutGeometry.every(
      (entry) =>
        entry.targetBeforeLabel &&
        entry.targetInBounds &&
        entry.terminatesAtLabelRail &&
        entry.hasLength,
    ),
  ).toBe(true);
}

async function expectCalloutLabelsDoNotOverlap(performancePanel: Locator) {
  const labelBoxes = await performancePanel
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

test('renders the primitive structure tab as a nonblank orthographic view', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop WebGL coverage');
  const browserErrors = await collectBrowserErrors(page);

  await openLabRoot(page);

  const colorPlanePanel = performancePanelFor(page, 'ColorPlane');
  const metricsTab = colorPlanePanel.getByRole('tab', {
    name: 'Metrics',
    exact: true,
  });
  const structureTab = colorPlanePanel.getByRole('tab', {
    name: 'Structure',
    exact: true,
  });

  await expect(metricsTab).toBeVisible();
  await expect(metricsTab).toHaveAttribute('aria-selected', 'false');
  await expect(structureTab).toBeVisible();
  await expect(structureTab).toHaveAttribute('aria-selected', 'true');
  await expect(
    colorPlanePanel.getByTestId('lab-performance-html-canvas-labels-toggle'),
  ).toHaveCount(0);
  await expect(
    colorPlanePanel.getByText('Unsupported in this browser', { exact: true }),
  ).toHaveCount(0);
  await expect(
    colorPlanePanel.getByText('Use html-in-canvas', { exact: true }),
  ).toHaveCount(0);
  await expect(
    colorPlanePanel.getByRole('tabpanel', { name: 'Structure', exact: true }),
  ).toBeVisible();
  await expect(
    colorPlanePanel.getByText('ColorPlane primitive', { exact: true }),
  ).toBeVisible();
  await expect(
    colorPlanePanel.locator('[data-primitive-layer="gamut-raster"]'),
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
  expect(
    await structureShell.getAttribute(
      'data-primitive-structure-html-canvas-gate',
    ),
  ).toBeNull();

  const renderSurface = colorPlanePanel.getByTestId(
    'lab-primitive-structure-render',
  );
  await expect(renderSurface).toHaveAttribute(
    'data-primitive-structure-surface',
    'transparent',
  );
  const renderSurfaceStyle = await renderSurface.evaluate((element) => {
    const style = window.getComputedStyle(element);

    return {
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      borderTopWidth: style.borderTopWidth,
    };
  });
  expect(renderSurfaceStyle).toEqual({
    backgroundColor: 'rgba(0, 0, 0, 0)',
    backgroundImage: 'none',
    borderTopWidth: '0px',
  });
  await expect(
    colorPlanePanel.getByText('Y Axis Exploded', { exact: true }),
  ).toHaveCount(0);
  await expect(
    colorPlanePanel.getByTestId('lab-primitive-structure-callouts'),
  ).toBeVisible();
  await expect(
    colorPlanePanel.locator('[data-primitive-callout-line]'),
  ).toHaveCount(4);
  await expect(
    colorPlanePanel.locator('[data-primitive-callout-hit]'),
  ).toHaveCount(4);
  await expect(
    colorPlanePanel.locator('[data-primitive-callout-label]'),
  ).toHaveCount(4);
  await expect(
    colorPlanePanel.locator('[data-primitive-callout-dot]'),
  ).toHaveCount(4);
  await expect(
    colorPlanePanel.locator('[data-primitive-callout-layer="true"]'),
  ).toHaveCount(3);
  await expect(
    colorPlanePanel.locator('[data-primitive-layer] [aria-hidden="true"]'),
  ).toHaveCount(0);
  await expectCalloutLinesAttachToLabels(colorPlanePanel);
  const renderLabelMetrics = await colorPlanePanel
    .locator('[data-primitive-callout-label]')
    .evaluateAll((labels) =>
      labels.map((label) => {
        const rect = label.getBoundingClientRect();
        const style = window.getComputedStyle(label);

        return {
          borderRadius: style.borderRadius,
          fontSize: style.fontSize,
          height: Math.round(rect.height),
          lineHeight: style.lineHeight,
          paddingBottom: style.paddingBottom,
          paddingTop: style.paddingTop,
          transitionDuration: style.transitionDuration,
        };
      }),
    );
  expect(
    renderLabelMetrics.every(
      (label) =>
        label.borderRadius === '0px' &&
        label.height >= 20 &&
        label.fontSize === '10px' &&
        label.lineHeight === '12px' &&
        label.paddingBottom === '0px' &&
        label.paddingTop === '0px' &&
        label.transitionDuration === '0.3s',
    ),
  ).toBe(true);
  const calloutTransitionDurations = await colorPlanePanel
    .locator('[data-primitive-callout]')
    .evaluateAll((callouts) =>
      callouts.map((callout) => getComputedStyle(callout).transitionDuration),
    );
  expect(
    calloutTransitionDurations.every((duration) => duration === '0.3s'),
  ).toBe(true);
  await expectCalloutLabelsDoNotOverlap(colorPlanePanel);

  const colorPlaneRenderNodes = await colorPlanePanel
    .locator('[data-primitive-callout-layer="true"]')
    .evaluateAll((items) =>
      items.map((item) => ({
        component: item.getAttribute('data-primitive-component'),
        depth: item.getAttribute('data-primitive-depth'),
        id: item.getAttribute('data-primitive-node'),
        parent: item.getAttribute('data-primitive-parent'),
        relation: item.getAttribute('data-primitive-relation'),
        slot: item.getAttribute('data-primitive-slot'),
      })),
    );
  expect(colorPlaneRenderNodes).toEqual([
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
      component: 'Thumb',
      depth: '1',
      id: 'active-thumb',
      parent: 'plane-frame',
      relation: 'implicit',
      slot: 'thumb',
    },
  ]);
  const colorPlaneStructureNodes = await colorPlanePanel
    .locator('[data-primitive-node]')
    .evaluateAll((items) =>
      items.map((item) => ({
        component: item.getAttribute('data-primitive-component'),
        depth: item.getAttribute('data-primitive-depth'),
        id: item.getAttribute('data-primitive-node'),
        parent: item.getAttribute('data-primitive-parent'),
        relation: item.getAttribute('data-primitive-relation'),
        slot: item.getAttribute('data-primitive-slot'),
      })),
    );
  expect(colorPlaneStructureNodes).toEqual([
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
      id: 'p3-boundary',
      parent: 'overlay-boundaries',
      relation: 'child',
      slot: 'overlay',
    },
    {
      component: 'GamutBoundaryLayer',
      depth: '2',
      id: 'srgb-boundary',
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

  const canvas = colorPlanePanel.getByTestId('lab-primitive-structure-canvas');
  const gamutLinePoint = await colorPlanePanel
    .locator('[data-primitive-callout-hit="gamut-raster"]')
    .evaluate((path) => {
      const line = path as SVGPathElement;
      const svg = line.ownerSVGElement;
      const rect = svg?.getBoundingClientRect();
      const point = line.getPointAtLength(line.getTotalLength() * 0.82);

      if (!rect) {
        return null;
      }

      return {
        x: rect.left + (point.x / 100) * rect.width,
        y: rect.top + (point.y / 100) * rect.height,
      };
    });
  expect(gamutLinePoint).not.toBeNull();
  await page.mouse.move(gamutLinePoint!.x, gamutLinePoint!.y);
  await page.mouse.move(0, 0);
  await expect(structureShell).not.toHaveAttribute(
    'data-primitive-structure-hover-layer',
  );
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

  const hoveredColorPlaneLayer = await findCanvasHoveredLayer(
    page,
    canvas,
    structureShell,
  );
  expect([
    'plane-frame',
    'gamut-raster',
    'overlay-boundaries',
    'active-thumb',
  ]).toContain(hoveredColorPlaneLayer);
  await expect(structureShell).toHaveAttribute(
    'data-primitive-structure-hover-layer',
    hoveredColorPlaneLayer!,
  );
  const mutedColorPlaneLayer =
    hoveredColorPlaneLayer === 'gamut-raster' ? 'active-thumb' : 'gamut-raster';
  await expect(
    colorPlanePanel.locator(
      `[data-primitive-callout-layer="true"][data-primitive-layer="${mutedColorPlaneLayer}"]`,
    ),
  ).toHaveClass(/opacity-35/);
  if (hoveredColorPlaneLayer !== 'plane-frame') {
    await expect(
      colorPlanePanel.locator(
        `[data-primitive-callout-layer="true"][data-primitive-layer="${hoveredColorPlaneLayer}"]`,
      ),
    ).toHaveClass(/opacity-100/);
  }
  await page.mouse.move(0, 0);
  await expect(structureShell).not.toHaveAttribute(
    'data-primitive-structure-hover-layer',
  );
  await expect(
    colorPlanePanel.getByTestId('lab-primitive-structure-html-canvas-layer'),
  ).toHaveCount(0);

  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('role', 'img');
  await expect(canvas).toHaveAttribute('data-primitive-structure-axis', 'y');
  await expect(canvas).toHaveAttribute(
    'data-primitive-structure-geometry',
    'plane-grid',
  );
  await expect(canvas).toHaveAttribute(
    'data-primitive-structure-layout',
    '24-grid',
  );
  await expect(canvas).toHaveAttribute(
    'data-primitive-structure-layer-gap',
    'uniform',
  );
  await expect(canvas).toHaveAttribute(
    'data-primitive-structure-guides',
    'callouts',
  );
  await expect(canvas).toHaveAttribute(
    'data-primitive-structure-interaction',
    'raycast',
  );
  await expect(canvas).toHaveAttribute(
    'data-primitive-structure-motion',
    'static',
  );
  await expect(canvas).toHaveAttribute(
    'data-primitive-structure-palette',
    'layer-colors',
  );
  const canvasBox = await canvas.boundingBox();
  expect(canvasBox).not.toBeNull();
  expect(canvasBox!.width).toBeGreaterThan(300);
  expect(canvasBox!.height).toBeGreaterThan(180);
  await expect
    .poll(async () => (await canvas.evaluate(sampleStructureCanvas)).litPixels)
    .toBeGreaterThan(1000);
  const firstSample = await canvas.evaluate(sampleStructureCanvas);
  await page.waitForTimeout(350);
  const secondSample = await canvas.evaluate(sampleStructureCanvas);
  expect(secondSample.checksum).toBe(firstSample.checksum);
  expect(firstSample.litBounds).not.toBeNull();
  await metricsTab.click();
  await expect(metricsTab).toHaveAttribute('aria-selected', 'true');
  await expect(
    colorPlanePanel.getByRole('tabpanel', { name: 'Metrics', exact: true }),
  ).toBeVisible();
  await structureTab.click();
  await expect(structureTab).toHaveAttribute('aria-selected', 'true');
  await expect(
    colorPlanePanel.getByRole('tabpanel', { name: 'Structure', exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => (await canvas.evaluate(sampleStructureCanvas)).litPixels)
    .toBeGreaterThan(1000);
  const roundTripSample = await canvas.evaluate(sampleStructureCanvas);
  expect(roundTripSample.litBounds).not.toBeNull();
  expect(roundTripSample.litBounds!.width).toBeGreaterThan(
    firstSample.litBounds!.width * 0.85,
  );
  expect(roundTripSample.litBounds!.width).toBeLessThan(
    firstSample.litBounds!.width * 1.2,
  );
  expect(roundTripSample.litBounds!.height).toBeGreaterThan(
    firstSample.litBounds!.height * 0.85,
  );
  expect(roundTripSample.litBounds!.height).toBeLessThan(
    firstSample.litBounds!.height * 1.2,
  );

  await page.getByRole('link', { name: 'Checkbox', exact: true }).click();
  await expect(page).toHaveURL(/\/lab\/checkbox$/);
  const checkboxPanel = performancePanelFor(page, 'Checkbox');
  await expect(
    checkboxPanel.getByText('Checkbox primitive', { exact: true }),
  ).toBeVisible();
  await expect(
    checkboxPanel.locator('[data-primitive-callout-line]'),
  ).toHaveCount(4);
  await expect(
    checkboxPanel.locator('[data-primitive-callout-label]'),
  ).toHaveCount(4);
  await expect(
    checkboxPanel.locator('[data-primitive-callout-dot]'),
  ).toHaveCount(4);
  await expectCalloutLinesAttachToLabels(checkboxPanel);
  await expectCalloutLabelsDoNotOverlap(checkboxPanel);

  await page.getByRole('link', { name: 'Menu', exact: true }).click();
  await expect(page).toHaveURL(/\/lab\/menu$/);
  const menuPanel = performancePanelFor(page, 'Menu');
  await expect(
    menuPanel.getByText('Menu primitive', { exact: true }),
  ).toBeVisible();
  await expectCalloutLinesAttachToLabels(menuPanel);
  await expectCalloutLabelsDoNotOverlap(menuPanel);
  await expectStructureGeometryClearsCalloutLabels(menuPanel);

  await page.getByRole('link', { name: 'Tabs', exact: true }).click();
  await expect(page).toHaveURL(/\/lab\/tabs$/);
  const tabsPanel = performancePanelFor(page, 'Tabs');
  await expect(
    tabsPanel.getByText('Tabs primitive', { exact: true }),
  ).toBeVisible();
  await expect(
    tabsPanel.getByText('A tablist shell containing repeated tab triggers', {
      exact: false,
    }),
  ).toBeVisible();

  const tabsStructureShell = tabsPanel.getByTestId(
    'lab-primitive-structure-shell',
  );
  const tabsCanvas = tabsPanel.getByTestId('lab-primitive-structure-canvas');
  await expect(tabsPanel.locator('[data-primitive-callout-line]')).toHaveCount(
    5,
  );
  await expect(tabsPanel.locator('[data-primitive-callout-hit]')).toHaveCount(
    5,
  );
  await expect(tabsPanel.locator('[data-primitive-callout-label]')).toHaveCount(
    5,
  );
  await expect(tabsPanel.locator('[data-primitive-callout-dot]')).toHaveCount(
    5,
  );
  await expect(
    tabsPanel.locator('[data-primitive-callout-layer="true"]'),
  ).toHaveCount(4);
  for (const layerId of [
    'tabs-list',
    'active-tab',
    'inactive-tabs',
    'tab-content',
    'inactive-tab-content',
  ]) {
    await expect(
      tabsPanel.locator(`[data-primitive-layer="${layerId}"]`),
    ).toBeVisible();
  }
  const tabsStructureNodes = await tabsPanel
    .locator('[data-primitive-node]')
    .evaluateAll((items) =>
      items.map((item) => ({
        component: item.getAttribute('data-primitive-component'),
        depth: item.getAttribute('data-primitive-depth'),
        id: item.getAttribute('data-primitive-node'),
        parent: item.getAttribute('data-primitive-parent'),
        relation: item.getAttribute('data-primitive-relation'),
        slot: item.getAttribute('data-primitive-slot'),
        text: item.textContent?.trim() ?? '',
      })),
    );
  expect(tabsStructureNodes).toEqual([
    {
      component: 'TabsList',
      depth: '1',
      id: 'tabs-list',
      parent: 'tabs-root',
      relation: 'child',
      slot: 'children',
      text: 'TabsList<tabslist>Shared segmented shell that groups the tab triggers.',
    },
    {
      component: 'TabsTrigger',
      depth: '2',
      id: 'inactive-tabs',
      parent: 'tabs-list',
      relation: 'child',
      slot: 'trigger',
      text: 'TabsTrigger<tabstrigger>Peer trigger surface that participates in roving focus.',
    },
    {
      component: 'TabsTrigger',
      depth: '2',
      id: 'active-tab',
      parent: 'tabs-list',
      relation: 'child',
      slot: 'trigger',
      text: 'TabsTrigger<tabstrigger>Selected trigger surface with active-state styling.',
    },
    {
      component: 'TabsContent',
      depth: '1',
      id: 'tab-content',
      parent: 'tabs-root',
      relation: 'sibling',
      slot: 'content',
      text: 'TabsContent<tabscontent>Selected panel content associated with the active tab value.',
    },
    {
      component: 'TabsContent',
      depth: '1',
      id: 'inactive-tab-content',
      parent: 'tabs-root',
      relation: 'sibling',
      slot: 'content',
      text: 'TabsContent<tabscontent>Inactive panel content kept as a sibling in the Tabs composition.',
    },
  ]);
  await expect(tabsCanvas).toHaveAttribute(
    'data-primitive-structure-geometry',
    'plane-grid',
  );
  await expect(tabsCanvas).toHaveAttribute(
    'data-primitive-structure-layout',
    '24-grid',
  );
  await expect(tabsCanvas).toHaveAttribute(
    'data-primitive-structure-layer-gap',
    'uniform',
  );
  await expect(tabsCanvas).toHaveAttribute(
    'data-primitive-structure-interaction',
    'raycast',
  );
  await expect(tabsCanvas).toHaveAttribute(
    'data-primitive-structure-palette',
    'layer-colors',
  );
  await expectCalloutLinesAttachToLabels(tabsPanel);
  await expectCalloutLabelsDoNotOverlap(tabsPanel);
  await expect
    .poll(
      async () => (await tabsCanvas.evaluate(sampleStructureCanvas)).litPixels,
    )
    .toBeGreaterThan(1000);
  const tabsFirstSample = await tabsCanvas.evaluate(sampleStructureCanvas);
  await page.waitForTimeout(350);
  const tabsSecondSample = await tabsCanvas.evaluate(sampleStructureCanvas);
  expect(tabsSecondSample.checksum).toBe(tabsFirstSample.checksum);

  const hoveredTabsLayer = await findCanvasHoveredLayer(
    page,
    tabsCanvas,
    tabsStructureShell,
  );
  expect([
    'tabs-root',
    'tabs-list',
    'active-tab',
    'inactive-tabs',
    'tab-content',
  ]).toContain(hoveredTabsLayer);
  await expect(tabsStructureShell).toHaveAttribute(
    'data-primitive-structure-hover-layer',
    hoveredTabsLayer!,
  );
  const mutedTabsLayer =
    hoveredTabsLayer === 'inactive-tabs' ? 'active-tab' : 'inactive-tabs';
  await expect(
    tabsPanel.locator(
      `[data-primitive-callout-layer="true"][data-primitive-layer="${mutedTabsLayer}"]`,
    ),
  ).toHaveClass(/opacity-35/);

  await page.getByRole('link', { name: 'Select', exact: true }).click();
  await expect(page).toHaveURL(/\/lab\/select$/);
  const selectPanel = performancePanelFor(page, 'Select');
  await expect(
    selectPanel.getByText('Select primitive', { exact: true }),
  ).toBeVisible();
  await expect(
    selectPanel.locator('[data-primitive-layer="select-trigger"]'),
  ).toBeVisible();

  expect(browserErrors).toEqual([]);
});
