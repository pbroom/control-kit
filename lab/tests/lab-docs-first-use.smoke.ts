import { expect, test } from '@playwright/test';
import { collectBrowserErrors } from './lab-smoke-utils.js';

for (const colorScheme of ['light', 'dark'] as const) {
  test(`keeps fresh ${colorScheme}-theme docs readable and clear of navigation`, async ({
    page,
  }) => {
    const browserErrors = await collectBrowserErrors(page);
    await page.emulateMedia({ colorScheme });
    await page.goto('/docs/plane');
    await expect(page.locator('html')).toHaveAttribute(
      'data-theme',
      colorScheme,
    );
    const heading = page.getByRole('heading', { name: 'Plane', level: 1 });
    await expect(heading).toBeVisible();
    const navigation = page.getByRole('navigation', { name: 'Lab pages' });
    const lastLink = navigation.getByRole('link').last();
    const headingBounds = await heading.boundingBox();
    const linkBounds = await lastLink.boundingBox();
    expect(headingBounds).not.toBeNull();
    expect(linkBounds).not.toBeNull();
    if (page.viewportSize()!.width < 640) {
      expect(headingBounds!.y).toBeGreaterThanOrEqual(
        linkBounds!.y + linkBounds!.height + 16,
      );
    } else {
      expect(headingBounds!.x).toBeGreaterThanOrEqual(
        linkBounds!.x + linkBounds!.width + 16,
      );
    }

    for (const text of [
      heading,
      page.getByRole('button', { name: 'Show code', exact: true }).first(),
    ]) {
      const contrast = await text.evaluate((element) => {
        const luminance = (color: string) => {
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 1;
          const context = canvas.getContext('2d')!;
          context.fillStyle = color;
          context.fillRect(0, 0, 1, 1);
          const channels = Array.from(
            context.getImageData(0, 0, 1, 1).data,
          ).slice(0, 3);
          const linear = channels.map((channel) => {
            const value = channel / 255;
            return value <= 0.04045
              ? value / 12.92
              : ((value + 0.055) / 1.055) ** 2.4;
          });
          return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
        };
        let surface: Element | null = element;
        let background = 'rgba(0, 0, 0, 0)';
        while (surface && background === 'rgba(0, 0, 0, 0)') {
          background = getComputedStyle(surface).backgroundColor;
          surface = surface.parentElement;
        }
        const foregroundLuminance = luminance(getComputedStyle(element).color);
        const backgroundLuminance = luminance(background);
        return (
          (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
          (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
        );
      });
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    }
    expect(browserErrors).toEqual([]);
  });
}
