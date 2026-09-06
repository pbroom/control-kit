import { expect, test, type Locator, type Page } from '@playwright/test';
import { collectBrowserErrors } from './lab-smoke-utils.js';

async function openSpringExample(page: Page) {
  await page.goto('/docs/plane-examples#spring-stiffness-damping');
  const example = page.getByRole('figure', {
    name: 'Spring stiffness × damping demo',
    exact: true,
  });
  await example.scrollIntoViewIfNeeded();
  return example;
}

async function setPlaneValue(page: Page, plane: Locator, x: number, y: number) {
  const bounds = await plane.boundingBox();
  if (!bounds) throw new Error('The spring plane has no bounds.');
  await page.mouse.click(
    bounds.x + bounds.width * x,
    bounds.y + bounds.height * (1 - y),
  );
}

test('spring plane updates a finite physical response by drag and keyboard', async ({
  page,
}) => {
  const errors = await collectBrowserErrors(page);
  const example = await openSpringExample(page);
  const plane = example.locator('[data-spring-plane]');
  const path = example.locator('[data-spring-chart-path]');
  const stiffness = example.getByRole('slider', {
    name: 'Spring stiffness',
    exact: true,
  });
  const damping = example.getByRole('slider', {
    name: 'Spring damping',
    exact: true,
  });
  const thumb = example.locator('[data-slot="plane-thumb"]');
  const initialPath = await path.getAttribute('d');
  const bounds = await plane.boundingBox();
  if (!bounds) throw new Error('The spring plane has no bounds.');

  await page.mouse.move(
    bounds.x + bounds.width * 0.2,
    bounds.y + bounds.height * 0.8,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width * 0.78,
    bounds.y + bounds.height * 0.22,
    { steps: 6 },
  );
  await page.mouse.up();

  await expect(path).not.toHaveAttribute('d', initialPath ?? '');
  expect(Number(await stiffness.inputValue())).toBeCloseTo(0.78, 1);
  expect(Number(await damping.inputValue())).toBeCloseTo(0.78, 1);
  await expect(thumb).not.toHaveAttribute('data-focus-visible', 'true');
  await expect(thumb).not.toHaveCSS('box-shadow', /rgb\(245, 211, 79\)/);

  const draggedPath = await path.getAttribute('d');
  await example.getByRole('button', { name: 'Replay', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(stiffness).toBeFocused();
  await expect(thumb).toHaveAttribute('data-focus-visible', 'true');
  await expect(thumb).toHaveCSS('box-shadow', /rgb\(245, 211, 79\)/);
  await stiffness.press('Home');
  await expect(stiffness).toHaveValue('0');
  await expect(path).not.toHaveAttribute('d', draggedPath ?? '');
  await damping.press('End');
  await expect(damping).toHaveValue('1');
  await expect(path).toHaveAttribute('data-response-regime', 'overdamped');

  const pathData = (await path.getAttribute('d')) ?? '';
  expect(pathData).not.toMatch(/NaN|Infinity/);
  expect(errors).toEqual([]);
});

test('spring thumb remains visible and interactive at every plane edge', async ({
  page,
}) => {
  const example = await openSpringExample(page);
  const plane = example.locator('[data-spring-plane]');
  const thumb = example.locator('[data-slot="plane-thumb"]');
  const stiffness = example.getByRole('slider', {
    name: 'Spring stiffness',
    exact: true,
  });
  const damping = example.getByRole('slider', {
    name: 'Spring damping',
    exact: true,
  });

  await stiffness.focus();
  await stiffness.press('Home');
  await damping.press('Home');

  const [planeBounds, thumbBounds] = await Promise.all([
    plane.boundingBox(),
    thumb.boundingBox(),
  ]);
  expect(planeBounds).not.toBeNull();
  expect(thumbBounds).not.toBeNull();
  expect(thumbBounds!.x).toBeLessThan(planeBounds!.x);
  expect(thumbBounds!.y + thumbBounds!.height).toBeGreaterThan(
    planeBounds!.y + planeBounds!.height,
  );

  await stiffness.press('End');
  await damping.press('End');
  const topRightThumbBounds = await thumb.boundingBox();
  expect(topRightThumbBounds).not.toBeNull();
  expect(topRightThumbBounds!.x + topRightThumbBounds!.width).toBeGreaterThan(
    planeBounds!.x + planeBounds!.width,
  );
  expect(topRightThumbBounds!.y).toBeLessThan(planeBounds!.y);

  const outsideCornerHit = await page.evaluate(
    ({ x, y }) =>
      document.elementFromPoint(x, y)?.closest('[data-slot="plane-thumb"]') !==
      null,
    {
      x: topRightThumbBounds!.x + topRightThumbBounds!.width - 2,
      y: topRightThumbBounds!.y + topRightThumbBounds!.height / 2,
    },
  );
  expect(outsideCornerHit).toBe(true);
});

test('under, critical, and overdamped settings remain finite', async ({
  page,
}) => {
  const example = await openSpringExample(page);
  const plane = example.locator('[data-spring-plane]');
  const path = example.locator('[data-spring-chart-path]');

  await setPlaneValue(page, plane, 0.99, 0.01);
  await expect(path).toHaveAttribute('data-response-regime', 'underdamped');
  expect(await path.getAttribute('d')).not.toMatch(/NaN|Infinity/);

  // stiffness 225, damping 30: c = 2 * sqrt(km), with mass fixed at 1.
  await setPlaneValue(page, plane, (225 - 50) / 450, (30 - 5) / 45);
  await expect(path).toHaveAttribute('data-response-regime', 'critical');
  expect(await path.getAttribute('d')).not.toMatch(/NaN|Infinity/);

  await setPlaneValue(page, plane, 0.01, 0.99);
  await expect(path).toHaveAttribute('data-response-regime', 'overdamped');
  expect(await path.getAttribute('d')).not.toMatch(/NaN|Infinity/);
});

test('replay keeps the vertical ball aligned with the chart response', async ({
  page,
}) => {
  await page.clock.install();
  const example = await openSpringExample(page);
  const plane = example.locator('[data-spring-plane]');
  const replay = example.getByRole('button', { name: 'Replay', exact: true });
  await setPlaneValue(page, plane, 0.99, 0.01);

  async function responsePositionMatches({
    maximum,
    minimum,
  }: {
    maximum?: number;
    minimum: number;
  }) {
    return example.evaluate(
      (node, bounds) => {
        const marker = node.querySelector('[data-spring-chart-marker]');
        const ball = node.querySelector<SVGCircleElement>('[data-spring-ball]');
        const track = node.querySelector<SVGGElement>('[data-spring-track]');
        const markerResponse = Number(
          marker?.getAttribute('data-current-response'),
        );
        const ballResponse = Number(
          ball?.getAttribute('data-current-response'),
        );
        if (!ball || !track) return false;
        const ballBounds = ball.getBoundingClientRect();
        const trackBounds = track.getBoundingClientRect();
        const markerBounds = marker?.getBoundingClientRect();

        return (
          markerBounds !== undefined &&
          ballResponse > bounds.minimum &&
          (bounds.maximum === undefined || ballResponse < bounds.maximum) &&
          Math.abs(markerResponse - ballResponse) < 0.00001 &&
          Math.abs(
            markerBounds.top +
              markerBounds.height / 2 -
              (ballBounds.top + ballBounds.height / 2),
          ) < 0.5 &&
          trackBounds.height > trackBounds.width &&
          ballBounds.left > markerBounds.right
        );
      },
      { maximum, minimum },
    );
  }

  await page.clock.pauseAt(Date.now() + 60_000);
  await replay.click();
  await page.clock.runFor(48);
  expect(await responsePositionMatches({ minimum: 0.15, maximum: 0.85 })).toBe(
    true,
  );
  await page.clock.runFor(80);
  expect(await responsePositionMatches({ minimum: 1.05 })).toBe(true);
});

test('copy writes the displayed spring configuration', async ({
  context,
  page,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const example = await openSpringExample(page);
  await example.getByRole('button', { name: 'Copy', exact: true }).click();
  await expect(
    example.getByRole('button', { name: 'Copied', exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe('{ stiffness: 257, damping: 31, mass: 1 }');
});

test('reduced motion settles immediately and replay stays settled', async ({
  page,
}) => {
  const errors = await collectBrowserErrors(page);
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const example = await openSpringExample(page);
  const replay = example.getByRole('button', { name: 'Replay', exact: true });
  const ball = example.locator('[data-spring-ball]');

  expect(
    Number(await ball.getAttribute('data-current-response')),
  ).toBeGreaterThan(0.99);
  await replay.click();
  expect(
    Number(await ball.getAttribute('data-current-response')),
  ).toBeGreaterThan(0.99);

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.pauseAt(Date.now() + 60_000);
  await replay.click();
  await page.clock.runFor(48);
  expect(Number(await ball.getAttribute('data-current-response'))).toBeLessThan(
    0.99,
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.runFor(1);
  expect(
    Number(await ball.getAttribute('data-current-response')),
  ).toBeGreaterThan(0.99);

  await page.goto('/docs/slider');
  expect(errors).toEqual([]);
});
