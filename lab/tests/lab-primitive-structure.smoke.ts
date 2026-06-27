import { expect, test } from '@playwright/test';
import {
  collectBrowserErrors,
  openLabRoot,
  performancePanelFor,
} from './lab-smoke-utils.js';

test('renders the primitive structure tab as a nonblank orthographic view', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop WebGL coverage');
  const browserErrors = await collectBrowserErrors(page);

  await openLabRoot(page);

  const colorPlanePanel = performancePanelFor(page, 'ColorPlane');
  const structureTab = colorPlanePanel.getByRole('tab', {
    name: 'Structure',
    exact: true,
  });

  await expect(structureTab).toBeVisible();
  await structureTab.click();
  await expect(structureTab).toHaveAttribute('aria-selected', 'true');
  await expect(
    colorPlanePanel.getByRole('tabpanel', { name: 'Structure', exact: true }),
  ).toBeVisible();
  await expect(
    colorPlanePanel.getByText('ColorPlane primitive', { exact: true }),
  ).toBeVisible();
  await expect(
    colorPlanePanel.locator('[data-primitive-layer="gamut-raster"]'),
  ).toBeVisible();

  const canvas = colorPlanePanel.getByTestId('lab-primitive-structure-canvas');
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('role', 'img');
  const canvasBox = await canvas.boundingBox();
  expect(canvasBox).not.toBeNull();
  expect(canvasBox!.width).toBeGreaterThan(300);
  expect(canvasBox!.height).toBeGreaterThan(180);
  await expect
    .poll(() =>
      canvas.evaluate((element) => {
        const webglCanvas = element as HTMLCanvasElement;
        const gl =
          webglCanvas.getContext('webgl2', {
            preserveDrawingBuffer: true,
          }) ??
          webglCanvas.getContext('webgl', {
            preserveDrawingBuffer: true,
          });

        if (!gl) {
          return 0;
        }

        const pixels = new Uint8Array(
          webglCanvas.width * webglCanvas.height * 4,
        );
        gl.readPixels(
          0,
          0,
          webglCanvas.width,
          webglCanvas.height,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          pixels,
        );

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
        }

        return litPixels;
      }),
    )
    .toBeGreaterThan(1000);

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
