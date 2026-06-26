import { expect, test } from '@playwright/test';
import { collectBrowserErrors, openLabRoot } from './lab-smoke-utils.js';

test('suppresses properties scrollbar during crossfade transitions', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop crossfade coverage');
  const browserErrors = await collectBrowserErrors(page);

  await openLabRoot(page);
  await page.goto('/lab/menu');
  await expect(page).toHaveURL(/\/lab\/menu$/);
  await expect(page.locator('aside')).toContainText(
    'Tune the three-item menu shown above the reusable menu preview.',
  );

  const checkboxLink = page.getByRole('link', {
    name: 'Checkbox',
    exact: true,
  });
  await checkboxLink.hover();
  await checkboxLink.focus();
  await page.waitForTimeout(150);

  const transitionSamples = await page.evaluate(
    () =>
      new Promise<
        Array<{
          activeKey: string | null;
          hasExit: boolean;
          phase: 'before' | 'after';
          scrollAreaMatchesSuppression: boolean;
          scrollbarOpacity: number | null;
          slotOverflow: string | null;
        }>
      >((resolve) => {
        const samples: Array<{
          activeKey: string | null;
          hasExit: boolean;
          phase: 'before' | 'after';
          scrollAreaMatchesSuppression: boolean;
          scrollbarOpacity: number | null;
          slotOverflow: string | null;
        }> = [];

        const sample = (phase: 'before' | 'after') => {
          const scrollArea = document.querySelector(
            '.ck-lab-properties-scroll-area',
          );
          const scrollbar = scrollArea?.querySelector(
            '[data-slot="scroll-area-scrollbar"]',
          );
          const slot = scrollArea?.querySelector(
            '[data-testid="lab-properties-crossfade"]',
          );
          const exit = scrollArea?.querySelector(
            '[data-lab-crossfade-phase="exit"]',
          );
          const enter = scrollArea?.querySelector(
            '[data-lab-crossfade-phase="enter"]',
          );
          const scrollbarStyle = scrollbar ? getComputedStyle(scrollbar) : null;

          samples.push({
            activeKey: enter?.getAttribute('data-lab-crossfade-key') ?? null,
            hasExit: Boolean(exit),
            phase,
            scrollAreaMatchesSuppression:
              scrollArea?.matches(
                '.ck-lab-properties-scroll-area:has([data-lab-crossfade-phase="exit"])',
              ) ?? false,
            scrollbarOpacity: scrollbarStyle
              ? Number(scrollbarStyle.opacity)
              : null,
            slotOverflow: slot ? getComputedStyle(slot).overflow : null,
          });
        };

        sample('before');
        document
          .querySelector<HTMLAnchorElement>('a[href="/lab/checkbox"]')
          ?.click();
        let frame = 0;
        const sampleNextFrame = () => {
          sample('after');
          frame += 1;
          if (frame >= 10) {
            resolve(samples);
            return;
          }
          requestAnimationFrame(sampleNextFrame);
        };
        requestAnimationFrame(sampleNextFrame);
      }),
  );

  expect(
    transitionSamples.some((sample) => sample.activeKey === 'checkbox'),
  ).toBe(true);
  expect(
    transitionSamples
      .filter((sample) => sample.phase === 'after')
      .every((sample) => sample.slotOverflow === 'hidden'),
  ).toBe(true);
  expect(
    transitionSamples
      .filter((sample) => sample.hasExit)
      .every(
        (sample) =>
          sample.scrollbarOpacity === null ||
          (sample.scrollAreaMatchesSuppression &&
            sample.scrollbarOpacity <= 0.01),
      ),
  ).toBe(true);
  await expect(page).toHaveURL(/\/lab\/checkbox$/);
  await expect(page.locator('aside')).toContainText(
    'Preview the compact checkbox row used throughout the properties panel.',
  );
  expect(browserErrors).toEqual([]);
});
