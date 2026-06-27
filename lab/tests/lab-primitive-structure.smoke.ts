import { expect, test } from '@playwright/test';
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
      checksum: 0,
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

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3] ?? 0;
    const brightness =
      (pixels[index] ?? 0) +
      (pixels[index + 1] ?? 0) +
      (pixels[index + 2] ?? 0);

    if (alpha > 0 && brightness > 32) {
      litPixels += 1;
    }

    checksum = (checksum + brightness * (index + 1) + alpha) % 1_000_000_007;
  }

  return {
    checksum,
    litPixels,
  };
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
  const htmlCanvasLabelsToggle = colorPlanePanel.getByTestId(
    'lab-performance-html-canvas-labels-toggle',
  );

  await expect(metricsTab).toBeVisible();
  await expect(metricsTab).toHaveAttribute('aria-selected', 'false');
  await expect(structureTab).toBeVisible();
  await expect(structureTab).toHaveAttribute('aria-selected', 'true');
  await expect(htmlCanvasLabelsToggle).toBeVisible();
  await expect(htmlCanvasLabelsToggle).toHaveAttribute('role', 'checkbox');
  await expect(htmlCanvasLabelsToggle).toHaveAttribute('aria-checked', 'false');
  await expect(htmlCanvasLabelsToggle).toHaveAttribute(
    'data-html-in-canvas-support',
    /^(supported|unsupported)$/,
  );
  const htmlInCanvasSupport = await htmlCanvasLabelsToggle.getAttribute(
    'data-html-in-canvas-support',
  );
  await expect(htmlCanvasLabelsToggle).toHaveText(
    htmlInCanvasSupport === 'supported'
      ? 'Use html-in-canvas'
      : 'Unsupported in this browser',
  );
  if (htmlInCanvasSupport === 'supported') {
    await expect(htmlCanvasLabelsToggle).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );
  } else {
    await expect(htmlCanvasLabelsToggle).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  }
  const htmlCanvasLabelsToggleStyle = await htmlCanvasLabelsToggle.evaluate(
    (element) => {
      const style = window.getComputedStyle(element);

      return {
        backgroundColor: style.backgroundColor,
        borderBottomWidth: style.borderBottomWidth,
        borderLeftWidth: style.borderLeftWidth,
        borderRightWidth: style.borderRightWidth,
        borderTopWidth: style.borderTopWidth,
        cursor: style.cursor,
      };
    },
  );
  expect(htmlCanvasLabelsToggleStyle).toEqual({
    backgroundColor: 'rgba(0, 0, 0, 0)',
    borderBottomWidth: '0px',
    borderLeftWidth: '0px',
    borderRightWidth: '0px',
    borderTopWidth: '0px',
    cursor: 'default',
  });
  await expect(
    colorPlanePanel.getByRole('tabpanel', { name: 'Structure', exact: true }),
  ).toBeVisible();
  await expect(
    colorPlanePanel.getByText('ColorPlane primitive', { exact: true }),
  ).toBeVisible();
  await expect(
    colorPlanePanel.locator('[data-primitive-layer="gamut-raster"]'),
  ).toBeVisible();

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
    colorPlanePanel.locator('[data-primitive-callout-layer="true"]'),
  ).toHaveCount(4);
  await expect(
    colorPlanePanel.locator('[data-primitive-layer] [aria-hidden="true"]'),
  ).toHaveCount(0);
  const structureShell = colorPlanePanel.getByTestId(
    'lab-primitive-structure-shell',
  );
  await expect(structureShell).toHaveAttribute(
    'data-primitive-structure-html-canvas-gate',
    'disabled',
  );
  await expect(structureShell).toHaveAttribute(
    'data-primitive-structure-label-renderer',
    'dom-overlay',
  );

  if (htmlInCanvasSupport === 'supported') {
    await htmlCanvasLabelsToggle.click();
    await expect(htmlCanvasLabelsToggle).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(structureShell).toHaveAttribute(
      'data-primitive-structure-html-canvas-gate',
      'enabled',
    );
    await expect(structureShell).toHaveAttribute(
      'data-primitive-structure-label-renderer',
      'html-in-canvas',
    );
    await expect(
      colorPlanePanel.getByTestId('lab-primitive-structure-html-canvas-layer'),
    ).toBeVisible();
    await expect(
      colorPlanePanel.locator('[data-primitive-html-canvas-label]'),
    ).toHaveCount(4);
  } else {
    await expect(structureShell).toHaveAttribute(
      'data-primitive-structure-label-renderer',
      'dom-overlay',
    );
    await expect(
      colorPlanePanel.getByTestId('lab-primitive-structure-html-canvas-layer'),
    ).toHaveCount(0);
    await expect(
      colorPlanePanel.getByTestId('lab-primitive-structure-callouts'),
    ).toBeVisible();
  }

  const canvas = colorPlanePanel.getByTestId('lab-primitive-structure-canvas');
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('role', 'img');
  await expect(canvas).toHaveAttribute('data-primitive-structure-axis', 'y');
  await expect(canvas).toHaveAttribute(
    'data-primitive-structure-geometry',
    'plane',
  );
  await expect(canvas).toHaveAttribute(
    'data-primitive-structure-guides',
    'callouts',
  );
  await expect(canvas).toHaveAttribute(
    'data-primitive-structure-motion',
    'static',
  );
  await expect(canvas).toHaveAttribute(
    'data-primitive-structure-palette',
    'flat',
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
