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
  await expect(thumb).toHaveAttribute('data-snap-transition', /x|y/);
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
  const corners: Array<[string, number, number, string, string]> = [
    ['top-left', box.x - beyond, box.y - beyond, '0%', '0%'],
    ['top-right', box.x + box.width + beyond, box.y - beyond, '100%', '0%'],
    ['bottom-left', box.x - beyond, box.y + box.height + beyond, '0%', '100%'],
    [
      'bottom-right',
      box.x + box.width + beyond,
      box.y + box.height + beyond,
      '100%',
      '100%',
    ],
  ];
  for (const [name, x, y, left, top] of corners) {
    const start = await thumbCenter(page);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(x, y, { steps: 8 });
    await page.mouse.up();
    // The spring settles the drawn position exactly on the corner (an
    // "any edge within 3px" check can pass mid-overshoot).
    await expect
      .poll(
        () =>
          thumb.evaluate((node) => [
            (node as HTMLElement).style.left,
            (node as HTMLElement).style.top,
          ]),
        { message: name },
      )
      .toEqual([left, top]);
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

test('the docs Snapping demo snaps, reports, and bypasses with Alt', async ({
  page,
}) => {
  const browserErrors = await collectBrowserErrors(page);
  await page.goto('/docs/plane#snapping');
  const demo = page.getByRole('figure', { name: 'Snapping demo', exact: true });
  await demo.scrollIntoViewIfNeeded();
  const plane = demo.locator('[data-slot="plane"]');
  const thumb = demo.locator('[data-slot="plane-thumb"]');
  const readout = demo.locator('[data-snapping-readout]');
  await expect(readout).toContainText('free');
  await expect(demo.locator('[data-snap-guide]')).toHaveCount(4);
  await expect(
    page.getByRole('figure', { name: 'Snapping demo code', exact: true }),
  ).toBeVisible();

  const bounds = await planeInputBounds(plane);
  const thumbBox = (await thumb.boundingBox())!;
  // 4px right of point A (0.25, 0.75).
  const nearA = {
    x: bounds.x + bounds.width * 0.25 + 4,
    y: bounds.y + bounds.height * 0.25,
  };
  await page.mouse.move(
    thumbBox.x + thumbBox.width / 2,
    thumbBox.y + thumbBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(nearA.x, nearA.y, { steps: 8 });
  await expect(thumb).toHaveAttribute('data-snapped', 'true');
  await expect(demo.locator('[data-snap-guide="2"]')).toHaveAttribute(
    'data-active',
    'true',
  );
  await page.mouse.up();
  await expect(readout).toHaveText('X 0.250 · Y 0.750 · point A (xy)');

  // Alt bypasses every target, including the grid.
  const snapped = (await thumb.boundingBox())!;
  await page.mouse.move(
    snapped.x + snapped.width / 2,
    snapped.y + snapped.height / 2,
  );
  await page.keyboard.down('Alt');
  try {
    await page.mouse.down();
    await page.mouse.move(nearA.x + 3, nearA.y + 2, { steps: 4 });
    await page.mouse.up();
  } finally {
    await page.keyboard.up('Alt');
  }
  await expect(readout).toContainText('free');
  await expect(thumb).not.toHaveAttribute('data-snapped');

  // Locking to X keeps Y while the grid quantizes X.
  await demo.getByRole('button', { name: 'X only', exact: true }).click();
  const lockedY = (await readout.textContent())?.split('·')[1];
  const locked = (await thumb.boundingBox())!;
  await page.mouse.move(
    locked.x + locked.width / 2,
    locked.y + locked.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width * 0.87,
    bounds.y + bounds.height * 0.9,
    { steps: 6 },
  );
  await page.mouse.up();
  await expect(readout).toContainText('X 0.875');
  expect((await readout.textContent())?.split('·')[1]).toBe(lockedY);
  expect(browserErrors).toEqual([]);
});

test('the docs Snapping demo thumb stays whole at every corner', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop pointer coverage');
  await page.goto('/docs/plane#snapping');
  const demo = page.getByRole('figure', { name: 'Snapping demo', exact: true });
  await demo.scrollIntoViewIfNeeded();
  await demo.getByRole('button', { name: 'Spring', exact: true }).click();
  const plane = demo.locator('[data-slot="plane"]');
  const thumb = demo.locator('[data-slot="plane-thumb"]');
  await expect(plane).toHaveCSS('overflow-x', 'visible');
  const box = (await plane.boundingBox())!;
  const corners: Array<[string, number, number, string, string]> = [
    ['top-left', box.x - 60, box.y - 60, '0%', '0%'],
    ['top-right', box.x + box.width + 60, box.y - 60, '100%', '0%'],
    ['bottom-left', box.x - 60, box.y + box.height + 60, '0%', '100%'],
    [
      'bottom-right',
      box.x + box.width + 60,
      box.y + box.height + 60,
      '100%',
      '100%',
    ],
  ];
  for (const [name, x, y, left, top] of corners) {
    const current = (await thumb.boundingBox())!;
    await page.mouse.move(
      current.x + current.width / 2,
      current.y + current.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(x, y, { steps: 8 });
    await page.mouse.up();
    // The spring settles the drawn position exactly on the corner.
    await expect
      .poll(
        () =>
          thumb.evaluate((node) => [
            (node as HTMLElement).style.left,
            (node as HTMLElement).style.top,
          ]),
        { message: name },
      )
      .toEqual([left, top]);
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
        if (ancestor.matches('[data-docs-example-preview]')) break;
      }
      return clips;
    });
    expect(clippedBy, name).toEqual([]);
  }
});

test('the docs demo thumb tracks the pointer while sliding along a guide line with CSS transitions', async ({
  page,
}) => {
  await page.goto('/docs/plane#snapping');
  const demo = page.getByRole('figure', { name: 'Snapping demo', exact: true });
  await demo.scrollIntoViewIfNeeded();
  // Lines and points only, with the default CSS snap transition.
  await demo.getByRole('checkbox', { name: 'Grid', exact: true }).click();
  await expect(
    demo.getByRole('button', { name: 'CSS', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  const plane = demo.locator('[data-slot="plane"]');
  const thumb = demo.locator('[data-slot="plane-thumb"]');
  const bounds = await planeInputBounds(plane);
  const start = (await thumb.boundingBox())!;
  // 2px below the y = 0.5 line, left of the x = 0.5 line.
  const lineY = bounds.y + bounds.height * 0.5 + 2;
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.1, lineY, { steps: 4 });
  await expect(thumb).toHaveAttribute('data-snapped-axis', 'y');
  // Let the y snap transition finish before sliding.
  await page.waitForTimeout(200);
  const misses: string[] = [];
  for (let i = 0; i <= 30; i += 1) {
    const pointerX = bounds.x + bounds.width * (0.1 + (0.3 * i) / 30);
    await page.mouse.move(pointerX, lineY);
    const drawn = await thumb.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        transition: node.getAttribute('data-snap-transition'),
      };
    });
    if (Math.abs(drawn.x - pointerX) > 1) {
      misses.push(
        `${i}: drawn ${drawn.x.toFixed(1)} vs ${pointerX.toFixed(1)}`,
      );
    }
    if (drawn.transition?.includes('x')) misses.push(`${i}: x transition`);
  }
  await page.mouse.up();
  expect(misses).toEqual([]);
});

test('the docs demo animates grid steps and line entry per jumped axis', async ({
  page,
}) => {
  await page.goto('/docs/plane#snapping');
  const demo = page.getByRole('figure', { name: 'Snapping demo', exact: true });
  await demo.scrollIntoViewIfNeeded();
  const plane = demo.locator('[data-slot="plane"]');
  const thumb = demo.locator('[data-slot="plane-thumb"]');
  const transitionOf = () =>
    thumb.evaluate((node) => {
      const style = getComputedStyle(node);
      return {
        axes: node.getAttribute('data-snap-transition'),
        property: style.transitionProperty,
        duration: style.transitionDuration,
      };
    });
  const bounds = await planeInputBounds(plane);
  const at = (x: number, y: number) => ({
    x: bounds.x + bounds.width * x,
    y: bounds.y + bounds.height * (1 - y),
  });

  // CSS mode with the default 0.125 grid: a step on x transitions left.
  const start = (await thumb.boundingBox())!;
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  const a = at(0.13, 0.2);
  await page.mouse.move(a.x, a.y, { steps: 4 });
  const b = at(0.26, 0.21);
  await page.mouse.move(b.x, b.y);
  const step = await transitionOf();
  expect(step.axes).toContain('x');
  expect(step.property).toContain('left');
  expect(step.duration).toBe('0.12s');
  await page.mouse.up();

  // Grid off: entering the y = 0.5 line transitions top only.
  await demo.getByRole('checkbox', { name: 'Grid', exact: true }).click();
  const thumbBox = (await thumb.boundingBox())!;
  await page.mouse.move(
    thumbBox.x + thumbBox.width / 2,
    thumbBox.y + thumbBox.height / 2,
  );
  await page.mouse.down();
  const free = at(0.15, 0.3);
  await page.mouse.move(free.x, free.y, { steps: 3 });
  const onLine = at(0.18, 0.51);
  await page.mouse.move(onLine.x, onLine.y);
  const entry = await transitionOf();
  expect(entry).toEqual({ axes: 'y', property: 'top', duration: '0.12s' });
  await page.mouse.up();
});

test('the docs demo springs a grid step: it lags, then settles', async ({
  page,
}) => {
  await page.goto('/docs/plane#snapping');
  const demo = page.getByRole('figure', { name: 'Snapping demo', exact: true });
  await demo.scrollIntoViewIfNeeded();
  await demo.getByRole('button', { name: 'Spring', exact: true }).click();
  const plane = demo.locator('[data-slot="plane"]');
  const thumb = demo.locator('[data-slot="plane-thumb"]');
  const bounds = await planeInputBounds(plane);
  const start = (await thumb.boundingBox())!;
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  // Settle on the 0.125 grid line, then step to 0.375 in one sample.
  await page.mouse.move(
    bounds.x + bounds.width * 0.13,
    bounds.y + bounds.height * 0.8,
    { steps: 4 },
  );
  await expect
    .poll(() => thumb.evaluate((node) => (node as HTMLElement).style.left))
    .toBe('12.5%');
  await page.mouse.move(
    bounds.x + bounds.width * 0.37,
    bounds.y + bounds.height * 0.8,
  );
  const drawn = await thumb.evaluate((node) =>
    Number.parseFloat((node as HTMLElement).style.left),
  );
  expect(drawn).toBeLessThan(37.5);
  await expect
    .poll(() => thumb.evaluate((node) => (node as HTMLElement).style.left))
    .toBe('37.5%');
  await page.mouse.up();
});
