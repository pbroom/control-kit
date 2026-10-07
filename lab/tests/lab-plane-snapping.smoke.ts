import { expect, test, type Page } from '@playwright/test';
import { collectBrowserErrors, planeInputBounds } from './lab-smoke-utils.js';

async function openPlane(page: Page) {
  await page.goto('/lab/plane');
  const plane = page.getByTestId('plane-demo');
  await expect(plane).toBeVisible();
  return {
    plane,
    thumb: page.getByTestId('plane-demo-thumb'),
    readout: page.getByTestId('plane-demo-readout'),
    snapReadout: page.getByTestId('plane-demo-snap'),
  };
}

async function setNumberField(page: Page, label: string, value: string) {
  const field = page.getByLabel(label, { exact: true });
  await field.fill(value);
  await field.press('Enter');
  await expect(field).toHaveValue(value);
}

async function thumbCenter(page: Page) {
  const box = await page.getByTestId('plane-demo-thumb').boundingBox();
  if (!box) throw new Error('The plane thumb has no bounds.');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test('snaps to magnetic guides, highlights them, and bypasses with Alt', async ({
  page,
}) => {
  const browserErrors = await collectBrowserErrors(page);
  const { plane, thumb, readout, snapReadout } = await openPlane(page);
  await expect(snapReadout).toHaveCount(0);
  await page
    .getByRole('checkbox', { name: 'Snap guides', exact: true })
    .click();
  await expect(snapReadout).toHaveText('Free');
  await expect(plane.locator('[data-plane-guide]')).toHaveCount(4);

  await plane.scrollIntoViewIfNeeded();
  const bounds = await planeInputBounds(plane);
  // 4px right of the upper-left guide point (0.25, 0.75): inside 8px.
  const nearPoint = {
    x: bounds.x + bounds.width * 0.25 + 4,
    y: bounds.y + bounds.height * 0.25,
  };
  const start = await thumbCenter(page);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(nearPoint.x, nearPoint.y, { steps: 8 });
  await expect(thumb).toHaveAttribute('data-snapped', 'true');
  await expect(thumb).toHaveAttribute('data-snapped-axis', 'both');
  await expect(plane.locator('[data-plane-guide="0"]')).toHaveAttribute(
    'data-active',
    'true',
  );
  await page.mouse.up();
  await expect(readout).toHaveText('X 0.25 · Y 0.75');
  await expect(snapReadout).toHaveText('Point upper-left · xy');

  // Holding Alt during the drag disables snapping.
  const snappedCenter = await thumbCenter(page);
  await page.mouse.move(snappedCenter.x, snappedCenter.y);
  await page.keyboard.down('Alt');
  try {
    await page.mouse.down();
    await page.mouse.move(nearPoint.x + 2, nearPoint.y + 1, { steps: 4 });
    await page.mouse.up();
  } finally {
    await page.keyboard.up('Alt');
  }
  await expect(thumb).not.toHaveAttribute('data-snapped');
  await expect(snapReadout).toHaveText('Free');
  await expect(readout).not.toHaveText('X 0.25 · Y 0.75');
  expect(browserErrors).toEqual([]);
});

test('quantizes to the grid with pointer and keyboard', async ({ page }) => {
  const browserErrors = await collectBrowserErrors(page);
  const { plane, thumb, readout, snapReadout } = await openPlane(page);
  await setNumberField(page, 'Grid X', '0.25');
  await expect(snapReadout).toBeVisible();

  await plane.scrollIntoViewIfNeeded();
  const bounds = await planeInputBounds(plane);
  await page.mouse.click(
    bounds.x + bounds.width * 0.33,
    bounds.y + bounds.height * 0.54,
  );
  await expect(readout).toHaveText('X 0.25 · Y 0.46');
  await expect(thumb).toHaveAttribute('data-snapped-axis', 'x');

  const xAxis = page.getByRole('slider', {
    name: 'Horizontal position',
    exact: true,
  });
  await expect(xAxis).toBeFocused();
  await expect(xAxis).toHaveAttribute('step', '0.25');
  await page.keyboard.press('ArrowRight');
  await expect(readout).toHaveText('X 0.50 · Y 0.46');
  await page.keyboard.press('Alt+ArrowRight');
  await expect
    .poll(async () => Number(await xAxis.inputValue()))
    .toBeCloseTo(0.501, 6);
  await expect(xAxis).toHaveAttribute('step', 'any');
  await page.keyboard.press('ArrowRight');
  await expect(readout).toHaveText('X 0.75 · Y 0.46');
  expect(browserErrors).toEqual([]);
});

test('locks drags to one axis', async ({ page }) => {
  const { plane, readout } = await openPlane(page);
  await page.getByLabel('Axis lock: X', { exact: true }).click();
  await plane.scrollIntoViewIfNeeded();
  const bounds = await planeInputBounds(plane);
  const start = await thumbCenter(page);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width * 0.8,
    bounds.y + bounds.height * 0.9,
    { steps: 6 },
  );
  await page.mouse.up();
  await expect(readout).toHaveText('X 0.80 · Y 0.50');
});

test('relative drags still snap the resulting value', async ({ page }) => {
  const { plane, thumb, readout } = await openPlane(page);
  await page
    .getByRole('checkbox', { name: 'Snap guides', exact: true })
    .click();
  await page
    .getByRole('checkbox', { name: 'Relative drag', exact: true })
    .click();
  await plane.scrollIntoViewIfNeeded();
  const bounds = await planeInputBounds(plane);
  // Grab off-centre; the resulting value lands 3px from (0.75, 0.25).
  const start = await thumbCenter(page);
  const grab = { x: start.x + 5, y: start.y };
  await page.mouse.move(grab.x, grab.y);
  await page.mouse.down();
  await page.mouse.move(
    grab.x + bounds.width * 0.25 + 3,
    grab.y + bounds.height * 0.25,
    { steps: 10 },
  );
  await page.mouse.up();
  await expect(readout).toHaveText('X 0.75 · Y 0.25');
  await expect(thumb).toHaveAttribute('data-snapped', 'true');
});

test('animates snaps with CSS transitions or a spring', async ({ page }) => {
  const browserErrors = await collectBrowserErrors(page);
  const { plane, thumb, readout } = await openPlane(page);
  await page
    .getByRole('checkbox', { name: 'Snap guides', exact: true })
    .click();
  await page.getByLabel('Snap transition: CSS', { exact: true }).click();

  await plane.scrollIntoViewIfNeeded();
  const bounds = await planeInputBounds(plane);
  const start = await thumbCenter(page);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width * 0.75 - 4,
    bounds.y + bounds.height * 0.75,
    { steps: 8 },
  );
  await expect(thumb).toHaveAttribute('data-snap-transition', 'true');
  await expect(thumb).toHaveCSS('transition-duration', '0.12s');
  await page.mouse.up();
  await expect(readout).toHaveText('X 0.75 · Y 0.25');

  await page.getByLabel('Snap transition: Spring', { exact: true }).click();
  await plane.scrollIntoViewIfNeeded();
  const springBounds = await planeInputBounds(plane);
  const springStart = await thumbCenter(page);
  await page.mouse.move(springStart.x, springStart.y);
  await page.mouse.down();
  await page.mouse.move(
    springBounds.x + springBounds.width * 0.25 + 4,
    springBounds.y + springBounds.height * 0.25,
    { steps: 4 },
  );
  await page.mouse.up();
  // The logical value never lags; the drawn position settles onto it.
  await expect(readout).toHaveText('X 0.25 · Y 0.75');
  await expect
    .poll(() => thumb.evaluate((node) => (node as HTMLElement).style.left))
    .toBe('25%');
  await expect
    .poll(() => thumb.evaluate((node) => (node as HTMLElement).style.top))
    .toBe('25%');
  expect(browserErrors).toEqual([]);
});

test('snapped drags do not add Plane layout reads', async ({ page }) => {
  const browserErrors = await collectBrowserErrors(page);
  const { plane, thumb, readout } = await openPlane(page);
  await page
    .getByRole('checkbox', { name: 'Snap guides', exact: true })
    .click();
  await setNumberField(page, 'Grid Y', '0.1');

  await page.evaluate(() => {
    const planeNode = document.querySelector<HTMLElement>(
      '[data-testid="plane-demo"]',
    );
    if (!planeNode) throw new Error('Plane demo is unavailable');
    const profile = { planeBoundsReads: 0, pointerMoves: 0 };
    const original = planeNode.getBoundingClientRect.bind(planeNode);
    planeNode.getBoundingClientRect = () => {
      profile.planeBoundsReads += 1;
      return original();
    };
    planeNode.addEventListener('pointermove', () => {
      profile.pointerMoves += 1;
    });
    // Count from the press on: the lab's Structure view may still be
    // measuring after the panel changes above.
    window.addEventListener(
      'pointerdown',
      () => {
        profile.planeBoundsReads = 0;
      },
      { capture: true, once: true },
    );
    Object.assign(window, { __planeSnapProfile: profile });
  });

  await plane.scrollIntoViewIfNeeded();
  const bounds = await planeInputBounds(plane);
  const start = await thumbCenter(page);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width * 0.82,
    bounds.y + bounds.height * 0.28,
    { steps: 48 },
  );
  await page.mouse.up();
  await expect(readout).toHaveText('X 0.82 · Y 0.70');
  await expect(thumb).toHaveAttribute('data-snapped-axis', 'y');

  const profile = await page.evaluate(
    () =>
      (
        window as typeof window & {
          __planeSnapProfile: {
            planeBoundsReads: number;
            pointerMoves: number;
          };
        }
      ).__planeSnapProfile,
  );
  expect(profile.pointerMoves).toBeGreaterThanOrEqual(40);
  expect(profile.planeBoundsReads).toBeLessThanOrEqual(2);
  expect(browserErrors).toEqual([]);
});

test('combines perpendicular guide lines and highlights both', async ({
  page,
}) => {
  const { plane, thumb, readout, snapReadout } = await openPlane(page);
  await page
    .getByRole('checkbox', { name: 'Snap guides', exact: true })
    .click();
  await plane.scrollIntoViewIfNeeded();
  const bounds = await planeInputBounds(plane);
  await page.mouse.move(
    bounds.x + bounds.width * 0.9,
    bounds.y + bounds.height * 0.9,
  );
  await page.mouse.down();
  // 4px right of and 3px below the centre, where the two lines cross.
  await page.mouse.move(
    bounds.x + bounds.width * 0.5 + 4,
    bounds.y + bounds.height * 0.5 + 3,
    { steps: 8 },
  );
  await expect(thumb).toHaveAttribute('data-snapped-axis', 'both');
  await expect(plane.locator('[data-plane-guide][data-active]')).toHaveCount(2);
  await page.mouse.up();
  await expect(readout).toHaveText('X 0.50 · Y 0.50');
  await expect(snapReadout).toHaveText('2 targets · xy');
});

test('snapped and spring-animated thumbs reach every corner unclipped', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop pointer coverage');
  const { plane, thumb } = await openPlane(page);
  await page
    .getByRole('checkbox', { name: 'Snap guides', exact: true })
    .click();
  await setNumberField(page, 'Grid X', '0.25');
  await setNumberField(page, 'Grid Y', '0.25');
  await page.getByLabel('Snap transition: Spring', { exact: true }).click();
  await expect(plane).toHaveCSS('overflow-x', 'visible');
  await expect(plane).toHaveCSS('overflow-y', 'visible');
  await plane.scrollIntoViewIfNeeded();
  const box = (await plane.boundingBox())!;
  const beyond = 60;
  const corners: Array<[string, number, number]> = [
    ['top-left', box.x - beyond, box.y - beyond],
    ['top-right', box.x + box.width + beyond, box.y - beyond],
    ['bottom-left', box.x - beyond, box.y + box.height + beyond],
    ['bottom-right', box.x + box.width + beyond, box.y + box.height + beyond],
  ];
  for (const [name, x, y] of corners) {
    const start = await thumbCenter(page);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(x, y, { steps: 8 });
    await page.mouse.up();
    // The spring settles the drawn position on the corner.
    await expect
      .poll(async () => {
        const thumbBox = (await thumb.boundingBox())!;
        const cx = thumbBox.x + thumbBox.width / 2;
        const cy = thumbBox.y + thumbBox.height / 2;
        return (
          Math.min(Math.abs(cx - box.x), Math.abs(cx - box.x - box.width)) <
            3 &&
          Math.min(Math.abs(cy - box.y), Math.abs(cy - box.y - box.height)) < 3
        );
      }, name)
      .toBe(true);
    const clippedBy = await thumb.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const clips: string[] = [];
      for (
        let ancestor = node.parentElement;
        ancestor && ancestor !== document.documentElement;
        ancestor = ancestor.parentElement
      ) {
        const style = getComputedStyle(ancestor);
        if (style.overflowX === 'visible' && style.overflowY === 'visible') {
          continue;
        }
        const clip = ancestor.getBoundingClientRect();
        if (
          rect.left < clip.left - 0.5 ||
          rect.right > clip.right + 0.5 ||
          rect.top < clip.top - 0.5 ||
          rect.bottom > clip.bottom + 0.5
        ) {
          clips.push(`${ancestor.tagName}.${String(ancestor.className)}`);
        }
      }
      return clips;
    });
    expect(clippedBy, name).toEqual([]);
  }
});
