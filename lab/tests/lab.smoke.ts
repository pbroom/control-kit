import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { LAB_PAGE_NAVIGATION } from '../src/routes/lab/lab-page-runtime.js';

const LAB_PAGE_PANEL_TEXT = {
  plane: 'Drive the current sample color.',
  input: 'Choose what appears inside the scrub handle.',
  inputMulti: 'Configure the selected color channel input.',
  checkbox:
    'Preview the compact checkbox row used throughout the properties panel.',
  slider:
    'Preview one ColorSlider instance and tune its slider-specific props.',
  tooltip: 'Tune the Radix initial hover delay',
  menu: 'Tune the three-item menu shown above the reusable menu preview.',
  select: 'Preview the UI3 menu trigger state.',
  toggleButton: 'Preview selection separately from interaction feedback.',
  toggle: 'Preview the toggle group icon layout.',
} satisfies Record<(typeof LAB_PAGE_NAVIGATION)[number]['value'], string>;

const LAB_PAGES = LAB_PAGE_NAVIGATION.map((labPage) => ({
  ...labPage,
  panelText: LAB_PAGE_PANEL_TEXT[labPage.value],
}));

async function collectBrowserErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(`console: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    errors.push(`pageerror: ${error.message}`);
  });

  return errors;
}

test('mirrors the color-kit lab pages and properties panel', async ({
  page,
}, testInfo) => {
  const browserErrors = await collectBrowserErrors(page);
  const snapshotDir = path.resolve(
    process.cwd(),
    'output/lab-parity-snapshots',
    testInfo.project.name,
  );

  await mkdir(snapshotDir, { recursive: true });
  await page.goto('/');
  await expect(page).toHaveURL(/\/lab\/color-plane$/);
  await expect(
    page.locator('main').getByText('control-kit', { exact: true }),
  ).toBeVisible();

  const themeTrigger = page.getByLabel('Toggle theme', { exact: true });
  await themeTrigger.click();
  const themeMenu = page.locator(
    '[data-slot="dropdown-menu-content"][aria-label="Theme"]',
  );
  await expect(themeMenu).toBeVisible();
  await expect(
    themeMenu.getByRole('menuitemradio', { name: 'Light', exact: true }),
  ).toBeVisible();
  const [themeTriggerBox, themeMenuBox] = await Promise.all([
    themeTrigger.boundingBox(),
    themeMenu.boundingBox(),
  ]);
  expect(themeTriggerBox).not.toBeNull();
  expect(themeMenuBox).not.toBeNull();
  expect(themeMenuBox!.y).toBeGreaterThanOrEqual(
    themeTriggerBox!.y + themeTriggerBox!.height - 1,
  );
  expect(themeMenuBox!.x).toBeGreaterThanOrEqual(themeTriggerBox!.x - 1);
  expect(themeMenuBox!.x).toBeLessThanOrEqual(themeTriggerBox!.x + 1);
  await page.keyboard.press('Escape');
  await expect(themeMenu).toBeHidden();

  for (const [index, labPage] of LAB_PAGES.entries()) {
    const navLink = page.getByRole('link', {
      name: labPage.label,
      exact: true,
    });

    if (index > 0) {
      await navLink.click();
    }

    await expect(page).toHaveURL(new RegExp(`/lab/${labPage.slug}$`));
    await expect(navLink).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('aside')).toContainText(labPage.panelText);
    const performancePanel = page.getByRole('region', {
      name: `Performance analysis for ${labPage.label}`,
      exact: true,
    });
    await expect(performancePanel).toBeVisible();
    await expect(performancePanel).toContainText('FCP');
    await expect(performancePanel).toContainText('LCP');
    await expect(performancePanel).toContainText('CLS');
    await expect(performancePanel).toContainText('INP');
    await expect(performancePanel).toContainText('FPS');
    await expect(performancePanel).toContainText('Loading');
    await expect(performancePanel).toContainText('Timeline');
    await expect(performancePanel).toContainText('Route selected');
    await expect(
      performancePanel.getByTestId('lab-performance-timeline'),
    ).toBeVisible();

    if (testInfo.project.name === 'desktop') {
      const [performancePanelBox, propertiesPanelBox] = await Promise.all([
        performancePanel.boundingBox(),
        page.locator('aside').boundingBox(),
      ]);
      expect(performancePanelBox).not.toBeNull();
      expect(propertiesPanelBox).not.toBeNull();
      expect(
        performancePanelBox!.x + performancePanelBox!.width,
      ).toBeLessThanOrEqual(propertiesPanelBox!.x + 1);
      expect(propertiesPanelBox!.height).toBeGreaterThanOrEqual(998);
    }

    await page.screenshot({
      path: path.join(
        snapshotDir,
        `${String(index + 1).padStart(2, '0')}-${labPage.slug}.png`,
      ),
      fullPage: true,
    });
  }

  await page.goto('/lab/menu');
  await expect(page).toHaveURL(/\/lab\/menu$/);
  await expect(page.locator('aside')).toContainText(
    'Tune the three-item menu shown above the reusable menu preview.',
  );

  await page.goto('/lab/not-a-component');
  await expect(page).toHaveURL(/\/lab\/color-plane$/);
  await expect(page.locator('aside')).toContainText(
    'Drive the current sample color.',
  );

  expect(browserErrors).toEqual([]);
});
