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
    await expect(page.locator('[data-lab-component-preview]')).toHaveCount(1);
    await expect(page.locator('aside')).toContainText(labPage.panelText);
    const performancePanel = page.getByRole('region', {
      name: `Performance analysis for ${labPage.label}`,
      exact: true,
    });
    await expect(performancePanel).toBeVisible();
    await expect(performancePanel).toContainText(
      'First contentful paint (FCP)',
    );
    await expect(performancePanel).toContainText(
      'Largest contentful paint (LCP)',
    );
    await expect(performancePanel).toContainText(
      'Cumulative layout shift (CLS)',
    );
    await expect(performancePanel).toContainText(
      'Interaction to next paint (INP)',
    );
    await expect(performancePanel).toContainText('Frame rate (FPS)');
    await expect(performancePanel).toContainText('Loading state');
    await expect(performancePanel).toContainText('Timeline');
    await expect(performancePanel).toContainText('Route selected');
    await expect(
      performancePanel.getByText('Performance Analysis', { exact: true }),
    ).toHaveCount(0);
    await expect(
      performancePanel.getByRole('table', {
        name: 'Performance matching metrics',
        exact: true,
      }),
    ).toHaveCount(0);
    const metricsTable = performancePanel.getByRole('table', {
      name: 'Performance metrics',
      exact: true,
    });
    await expect(metricsTable).toBeVisible();
    await expect(metricsTable).toContainText('Matched resources');
    await expect(metricsTable).toContainText('Route module fetches');
    await expect(metricsTable).toContainText('Long tasks');
    await expect(metricsTable).toContainText('Main-thread blocks observed');
    await expect(metricsTable).toContainText('Initial document paint');
    await expect(metricsTable).toContainText('requestAnimationFrame sampler');
    await expect(metricsTable.locator('tbody tr')).toHaveCount(8);
    await expect(metricsTable.locator('svg[role="img"]')).toHaveCount(6);
    expect(
      await metricsTable.evaluate((table) =>
        Array.from(table.querySelectorAll('svg[role="img"]')).map(
          (svg) => svg.querySelectorAll('path').length,
        ),
      ),
    ).toEqual([1, 1, 1, 1, 1, 1]);
    await expect(
      metricsTable.locator('tbody tr').first().locator('th, td'),
    ).toHaveCount(4);
    const lcpRow = metricsTable.locator('tbody tr', {
      hasText: 'Largest contentful paint (LCP)',
    });
    await expect(lcpRow).toContainText('LCP');
    const lcpText = await lcpRow.textContent();
    expect(lcpText).toMatch(/Largest preview element|No preview LCP candidate/);
    await expect(lcpRow).not.toContainText('properties panel');
    await expect(metricsTable).not.toContainText('Preview/properties');
    expect(
      await metricsTable.evaluate(
        (table) => table.querySelectorAll('th span.rounded-full').length,
      ),
    ).toBe(0);
    expect(
      await metricsTable
        .locator('tbody tr')
        .first()
        .locator('td')
        .last()
        .locator('span')
        .evaluate((node) => getComputedStyle(node).fontSize),
    ).toBe('12px');
    await expect(performancePanel.getByRole('columnheader')).toHaveCount(0);
    const timelineShell = performancePanel.getByTestId(
      'lab-performance-timeline-shell',
    );
    await expect(timelineShell).toBeVisible();
    await expect(
      performancePanel.getByTestId('lab-performance-timeline'),
    ).toBeVisible();
    await expect(
      performancePanel.getByTestId('lab-performance-timeline-bar').first(),
    ).toBeVisible();
    const timelineColumnsAreSeparated = await timelineShell.evaluate((shell) =>
      Array.from(
        shell.querySelectorAll(
          '[data-testid="lab-performance-timeline"] > div',
        ),
      ).map((row) => {
        const [timeCell, labelCell] = Array.from(row.children);
        if (!timeCell || !labelCell) {
          return false;
        }

        return (
          timeCell.getBoundingClientRect().right <=
          labelCell.getBoundingClientRect().left
        );
      }),
    );
    expect(timelineColumnsAreSeparated.length).toBeGreaterThan(0);
    expect(timelineColumnsAreSeparated.every(Boolean)).toBe(true);
    expect(
      await timelineShell.evaluate(
        (node) => getComputedStyle(node).borderWidth,
      ),
    ).toBe('0px');
    if (testInfo.project.name === 'desktop') {
      const timelineBox = await timelineShell.boundingBox();
      const viewport = page.viewportSize();

      expect(timelineBox).not.toBeNull();
      expect(viewport).not.toBeNull();
      expect(timelineBox!.width).toBeGreaterThanOrEqual(viewport!.width * 0.22);
    }

    if (labPage.value === 'inputMulti') {
      await performancePanel.getByTestId('lab-performance-timeline').hover();
      await page.waitForTimeout(200);
      await expect(performancePanel).not.toContainText('pointerover');
      await expect(performancePanel).toContainText('Route selected');
    }

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
