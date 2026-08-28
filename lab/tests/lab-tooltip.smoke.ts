import { expect, test, type Locator } from '@playwright/test';
import { collectBrowserErrors } from './lab-smoke-utils.js';

async function tooltipGeometry(content: Locator) {
  return content.evaluate((element) => {
    const popup = element.getBoundingClientRect();
    const arrow = element.querySelector('svg')?.getBoundingClientRect();

    return arrow
      ? {
          arrow: {
            bottom: arrow.bottom,
            centerX: arrow.left + arrow.width / 2,
            centerY: arrow.top + arrow.height / 2,
            left: arrow.left,
            right: arrow.right,
            top: arrow.top,
          },
          popup: {
            bottom: popup.bottom,
            left: popup.left,
            top: popup.top,
          },
        }
      : null;
  });
}

test('connects tooltip pointers to top and right popups', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');

  const browserErrors = await collectBrowserErrors(page);
  await page.goto('/lab/tooltip');
  await page.getByRole('spinbutton', { name: 'Initial delay' }).fill('0');

  const rightTrigger = page.getByRole('button', {
    name: 'right',
    exact: true,
  });
  await rightTrigger.hover();

  const rightContent = page
    .locator('[data-slot="tooltip-content"]')
    .filter({ hasText: 'This tooltip opens to the right' });
  await expect(rightContent).toBeVisible();
  await expect(rightContent).toHaveAttribute('data-side', 'right');

  const rightGeometry = await tooltipGeometry(rightContent);
  expect(rightGeometry).not.toBeNull();
  expect(Math.abs(rightGeometry!.arrow.right - rightGeometry!.popup.left)).toBe(
    0,
  );
  expect(rightGeometry!.arrow.left).toBeLessThan(rightGeometry!.popup.left);

  await page.getByRole('checkbox', { name: 'High contrast' }).uncheck();
  const topTrigger = page.getByRole('button', { name: 'top', exact: true });
  await topTrigger.hover();

  const topContent = page
    .locator('[data-slot="tooltip-content"]')
    .filter({ hasText: 'This tooltip opens above the trigger' });
  await expect(topContent).toBeVisible();
  await expect(topContent).toHaveAttribute('data-side', 'top');
  await expect(topContent.locator('svg path')).toHaveCount(2);

  const topGeometry = await tooltipGeometry(topContent);
  expect(topGeometry).not.toBeNull();
  expect(Math.abs(topGeometry!.arrow.top - topGeometry!.popup.bottom)).toBe(0);
  expect(topGeometry!.arrow.bottom).toBeGreaterThan(topGeometry!.popup.bottom);

  expect(browserErrors).toEqual([]);
});
