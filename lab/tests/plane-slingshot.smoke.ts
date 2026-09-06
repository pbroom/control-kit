import { expect, test, type Locator, type Page } from '@playwright/test';
import { collectBrowserErrors } from './lab-smoke-utils.js';

async function openSlingshot(page: Page) {
  const browserErrors = await collectBrowserErrors(page);
  await page.goto('/docs/plane-examples');
  const example = page.getByRole('figure', {
    name: 'Slingshot color picker demo',
    exact: true,
  });
  const plane = example.getByRole('group', {
    name: 'Slingshot color picker',
    exact: true,
  });
  await plane.scrollIntoViewIfNeeded();
  await expect(plane).toHaveAttribute('data-slingshot-state', 'rest');
  return { browserErrors, example, plane };
}

async function pullPastRightEdge(page: Page, plane: Locator) {
  const thumb = plane.locator('[data-slot="plane-thumb"]');
  const planeBounds = await plane.boundingBox();
  const thumbBounds = await thumb.boundingBox();
  expect(planeBounds).not.toBeNull();
  expect(thumbBounds).not.toBeNull();

  await page.mouse.move(
    thumbBounds!.x + thumbBounds!.width / 2,
    thumbBounds!.y + thumbBounds!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    planeBounds!.x + planeBounds!.width + 72,
    thumbBounds!.y + thumbBounds!.height / 2,
    { steps: 8 },
  );
  return { planeBounds, thumb };
}

test('painted colors and edges match the Plane coordinates', async ({
  page,
}) => {
  const { browserErrors, plane } = await openSlingshot(page);
  const bounds = (await plane.boundingBox())!;
  const paintedBounds = await plane
    .locator('svg')
    .evaluate((svg: SVGSVGElement) => {
      const path = svg.querySelector('path')!;
      const box = path.getBBox();
      const matrix = path.getScreenCTM()!;
      const topLeft = new DOMPoint(box.x, box.y).matrixTransform(matrix);
      const bottomRight = new DOMPoint(
        box.x + box.width,
        box.y + box.height,
      ).matrixTransform(matrix);
      return {
        x: topLeft.x,
        y: topLeft.y,
        width: bottomRight.x - topLeft.x,
        height: bottomRight.y - topLeft.y,
      };
    });
  for (const coordinate of ['x', 'y', 'width', 'height'] as const) {
    expect(
      Math.abs(paintedBounds[coordinate] - bounds[coordinate]),
    ).toBeLessThan(1);
  }

  for (const position of [
    { x: 0.2, y: 0.75 },
    { x: 0.75, y: 0.2 },
    { x: 0.5, y: 0.5 },
  ]) {
    await plane.click({
      position: { x: bounds.width * position.x, y: bounds.height * position.y },
    });
    const colors = await plane.evaluate(async (element, point) => {
      const svg = element.querySelector('svg')!;
      const rect = svg.getBoundingClientRect();
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute('width', String(rect.width));
      clone.setAttribute('height', String(rect.height));
      const image = new Image();
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(rect.width);
      canvas.height = Math.ceil(rect.height);
      const context = canvas.getContext('2d')!;
      context.drawImage(image, 0, 0);
      const planeRect = element.getBoundingClientRect();
      const sample = Array.from(
        context.getImageData(
          planeRect.left - rect.left + planeRect.width * point.x,
          planeRect.top - rect.top + planeRect.height * point.y,
          1,
          1,
        ).data,
      ).slice(0, 3);
      const thumbColor = getComputedStyle(
        element.querySelector('[data-slot="plane-thumb"]')!,
      ).backgroundColor;
      return {
        sample,
        expected: thumbColor.match(/\d+/g)!.slice(0, 3).map(Number),
      };
    }, position);
    for (let channel = 0; channel < 3; channel++) {
      expect(
        Math.abs(colors.sample[channel] - colors.expected[channel]),
      ).toBeLessThanOrEqual(3);
    }
  }
  expect(browserErrors).toEqual([]);
});

test('stretches, launches inward, bounces, settles, and supports recapture', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === 'mobile',
    'Covered by the mobile cancel test.',
  );
  const { browserErrors, plane } = await openSlingshot(page);
  const outline = plane.locator('[data-plane-rubber-outline]');
  const basePath = await outline.locator('path').last().getAttribute('d');
  const { planeBounds, thumb } = await pullPastRightEdge(page, plane);

  await expect(plane).toHaveAttribute('data-slingshot-state', 'armed');
  await expect(plane).toHaveAttribute('data-pull-edge', 'right');
  await expect
    .poll(async () => Number(await outline.getAttribute('data-bend')))
    .toBeGreaterThan(20);
  expect(await outline.locator('path').last().getAttribute('d')).not.toBe(
    basePath,
  );
  const pinnedThumb = await thumb.boundingBox();
  expect(pinnedThumb).not.toBeNull();
  expect(
    Math.abs(
      pinnedThumb!.x +
        pinnedThumb!.width / 2 -
        (planeBounds!.x + planeBounds!.width),
    ),
  ).toBeLessThan(2);

  await page.mouse.up();
  await expect(plane).toHaveAttribute('data-slingshot-state', 'flying');
  await expect(outline).toHaveAttribute('data-bend', '0');
  await expect
    .poll(async () =>
      Number(await plane.getByRole('slider').first().inputValue()),
    )
    .toBeLessThan(0.9);

  const centerX = planeBounds!.x + planeBounds!.width / 2;
  const centerY = planeBounds!.y + planeBounds!.height / 2;
  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await expect(plane).toHaveAttribute('data-slingshot-state', 'dragging');
  await expect
    .poll(async () =>
      Number(await plane.getByRole('slider').first().inputValue()),
    )
    .toBeCloseTo(0.5, 1);
  await page.mouse.move(
    planeBounds!.x + planeBounds!.width * 0.66,
    planeBounds!.y + planeBounds!.height * 0.36,
  );
  await page.mouse.up();
  await expect(plane).toHaveAttribute('data-slingshot-state', 'rest');
  await expect
    .poll(async () =>
      Number(await plane.getByRole('slider').first().inputValue()),
    )
    .toBeCloseTo(0.66, 1);

  await pullPastRightEdge(page, plane);
  await page.mouse.up();
  await expect(plane).toHaveAttribute('data-slingshot-state', 'flying');
  await expect
    .poll(async () => Number(await plane.getAttribute('data-bounce-count')), {
      timeout: 4_000,
    })
    .toBeGreaterThan(0);
  await expect(plane).toHaveAttribute('data-slingshot-state', 'rest', {
    timeout: 7_000,
  });
  await page.waitForTimeout(150);
  await expect(plane).toHaveAttribute('data-slingshot-state', 'rest');
  expect(browserErrors).toEqual([]);
});

test('pointer cancellation releases tension without launching', async ({
  page,
}) => {
  const { browserErrors, plane } = await openSlingshot(page);
  const outline = plane.locator('[data-plane-rubber-outline]');
  await pullPastRightEdge(page, plane);
  const pointerId = Number(await plane.getAttribute('data-active-pointer'));
  expect(pointerId).toBeGreaterThan(0);

  await plane.dispatchEvent('pointercancel', {
    bubbles: true,
    button: 0,
    pointerId,
    pointerType: 'touch',
  });
  await page.mouse.up();
  await expect(plane).toHaveAttribute('data-slingshot-state', 'rest');
  await expect(outline).toHaveAttribute('data-bend', '0');
  await expect(plane).not.toHaveAttribute('data-active-pointer', /.+/);
  expect(browserErrors).toEqual([]);
});

test('keyboard remains standard and reduced motion skips the flight', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { browserErrors, plane } = await openSlingshot(page);
  const horizontalAxis = plane.getByRole('slider', {
    name: 'Color saturation',
    exact: true,
  });
  const initialValue = Number(await horizontalAxis.inputValue());
  await horizontalAxis.focus();
  await horizontalAxis.press('ArrowLeft');
  await expect
    .poll(async () => Number(await horizontalAxis.inputValue()))
    .toBeLessThan(initialValue);
  await expect(plane).toHaveAttribute('data-slingshot-state', 'rest');

  await pullPastRightEdge(page, plane);
  await page.mouse.up();
  await expect(plane).toHaveAttribute('data-slingshot-state', 'rest');
  await expect
    .poll(async () => Number(await horizontalAxis.inputValue()))
    .toBeLessThan(0.9);
  await page.waitForTimeout(150);
  await expect(plane).toHaveAttribute('data-slingshot-state', 'rest');
  expect(browserErrors).toEqual([]);
});
