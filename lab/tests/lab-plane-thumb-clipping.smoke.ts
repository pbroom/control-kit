import { expect, type Locator, type Page, test } from '@playwright/test';
import { openLabRoot } from './lab-smoke-utils.js';

/*
 * Thumbs are centred on their value, so at an edge or corner half of a thumb
 * lies outside its plane. Nothing may clip it: Planes stay overflow-visible
 * and clip only their surface content.
 */

type ClipReport = { clippedBy: string[]; thumb: string };

/**
 * For each thumb, the overflow-clipping ancestors (up to and including
 * `stopAt`, or the document) whose clip rect cuts into the thumb's box.
 */
async function clippedThumbs(thumbs: Locator, stopAt?: string) {
  return thumbs.evaluateAll(
    (elements, stopSelector) =>
      elements.map((thumb) => {
        const box = thumb.getBoundingClientRect();
        const clippedBy: string[] = [];
        const stop = stopSelector ? thumb.closest(stopSelector) : null;

        for (
          let ancestor = thumb.parentElement;
          ancestor && ancestor !== document.documentElement;
          ancestor = ancestor.parentElement
        ) {
          const style = getComputedStyle(ancestor);

          if (style.overflowX !== 'visible' || style.overflowY !== 'visible') {
            const clip = ancestor.getBoundingClientRect();
            const inside =
              box.left >= clip.left - 0.5 &&
              box.right <= clip.right + 0.5 &&
              box.top >= clip.top - 0.5 &&
              box.bottom <= clip.bottom + 0.5;

            if (!inside) {
              clippedBy.push(
                `${ancestor.tagName.toLowerCase()}.${String(ancestor.className).slice(0, 60)}`,
              );
            }
          }

          if (ancestor === stop) break;
        }

        return {
          clippedBy,
          thumb:
            thumb.getAttribute('aria-label') ??
            thumb.getAttribute('data-testid') ??
            thumb.querySelector('input')?.getAttribute('aria-label') ??
            'thumb',
        } satisfies ClipReport;
      }),
    stopAt,
  );
}

async function dragTo(page: Page, from: Locator, x: number, y: number) {
  const box = (await from.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 8 });
  await page.mouse.up();
}

test('the Plane demo thumb stays whole at every edge and corner', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop pointer coverage');
  await openLabRoot(page);
  await page.goto('/lab/plane');
  const plane = page.getByTestId('plane-demo');
  const thumb = page.getByTestId('plane-demo-thumb');
  await expect(plane).toHaveCSS('overflow-x', 'visible');
  await expect(plane).toHaveCSS('overflow-y', 'visible');
  const box = (await plane.boundingBox())!;
  const beyond = 60;
  const targets: Array<[string, number, number]> = [
    ['left', box.x - beyond, box.y + box.height / 2],
    ['right', box.x + box.width + beyond, box.y + box.height / 2],
    ['top', box.x + box.width / 2, box.y - beyond],
    ['bottom', box.x + box.width / 2, box.y + box.height + beyond],
    ['top-left', box.x - beyond, box.y - beyond],
    ['top-right', box.x + box.width + beyond, box.y - beyond],
    ['bottom-left', box.x - beyond, box.y + box.height + beyond],
    ['bottom-right', box.x + box.width + beyond, box.y + box.height + beyond],
  ];

  for (const [name, x, y] of targets) {
    await dragTo(page, thumb, x, y);
    const thumbBox = (await thumb.boundingBox())!;
    // The thumb really is at the edge: its centre on the plane's border box.
    const centreX = thumbBox.x + thumbBox.width / 2;
    const centreY = thumbBox.y + thumbBox.height / 2;
    const atEdge =
      Math.abs(centreX - box.x) < 3 ||
      Math.abs(centreX - (box.x + box.width)) < 3 ||
      Math.abs(centreY - box.y) < 3 ||
      Math.abs(centreY - (box.y + box.height)) < 3;
    expect(atEdge, `${name}: thumb reached the edge`).toBe(true);
    expect(await clippedThumbs(thumb), name).toEqual([
      { clippedBy: [], thumb: 'plane-demo-thumb' },
    ]);
  }
});

test('Plane example thumbs stay whole at the corners of their planes', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop keyboard coverage');
  test.setTimeout(90_000);
  await page.route('**/color-curves-portrait.jpg', (route) =>
    route.fulfill({
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"/>',
      contentType: 'image/svg+xml',
    }),
  );
  await page.goto('/docs/plane-examples');
  await expect(
    page.locator('[data-plane-examples-gallery] [data-docs-example]'),
  ).toHaveCount(37);
  await page.locator('[data-plane-examples-gallery]').scrollIntoViewIfNeeded();

  // Drive every top-level thumb to each corner from the keyboard and look
  // for overflow ancestors (up to the example frame) that cut into it.
  const failures = await page.evaluate(async () => {
    const frame = () =>
      new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    const press = (input: HTMLInputElement, key: string) => {
      input.focus();
      input.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }),
      );
    };
    const clippers = (thumb: Element) => {
      const box = thumb.getBoundingClientRect();
      const stop = thumb.closest('[data-docs-example]');
      const out: string[] = [];

      for (
        let ancestor = thumb.parentElement;
        ancestor && ancestor !== document.documentElement;
        ancestor = ancestor.parentElement
      ) {
        const style = getComputedStyle(ancestor);

        if (style.overflowX !== 'visible' || style.overflowY !== 'visible') {
          const clip = ancestor.getBoundingClientRect();

          if (
            box.left < clip.left - 0.5 ||
            box.right > clip.right + 0.5 ||
            box.top < clip.top - 0.5 ||
            box.bottom > clip.bottom + 0.5
          ) {
            out.push(
              `${ancestor.tagName.toLowerCase()}.${String(ancestor.className).slice(0, 60)}`,
            );
          }
        }

        if (ancestor === stop) break;
      }

      return out;
    };
    const failures: string[] = [];
    const examples = Array.from(
      document.querySelectorAll(
        '[data-plane-examples-gallery] [data-docs-example]',
      ),
    );

    for (const [exampleIndex, example] of examples.entries()) {
      example.scrollIntoView({ block: 'center' });
      await frame();
      const title =
        example.querySelector('h3')?.textContent ?? `example ${exampleIndex}`;
      const thumbs = Array.from(
        example.querySelectorAll(
          '[data-slot="plane"] > [data-slot="plane-thumb"]',
        ),
      );

      for (const thumb of thumbs) {
        const x = thumb.querySelector<HTMLInputElement>(
          'input[data-plane-axis="x"]',
        );
        const y = thumb.querySelector<HTMLInputElement>(
          'input[data-plane-axis="y"]',
        );

        if (!x || !y || x.disabled || thumb.getClientRects().length === 0) {
          continue;
        }

        for (const [xKey, yKey] of [
          ['End', 'End'],
          ['Home', 'Home'],
          ['End', 'Home'],
          ['Home', 'End'],
        ]) {
          press(x, xKey!);
          press(y, yKey!);
          await frame();
          await frame();
          const clipped = clippers(thumb);

          if (clipped.length > 0) {
            failures.push(
              `${title} / ${thumb.getAttribute('aria-label') ?? x.getAttribute('aria-label')} at ${xKey}/${yKey}: ${clipped.join(', ')}`,
            );
          }
        }
      }
    }

    return failures;
  });

  expect(failures).toEqual([]);
});
