import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { LAB_PAGE_NAVIGATION } from '../src/routes/lab/lab-page-runtime.js';

const LAB_METRIC_ROW_ORDER_STORAGE_KEY =
  'control-kit:lab:performance-metric-row-order:v1';
const DEFAULT_METRIC_ROW_ORDER = [
  'resources',
  'long-tasks',
  'fcp',
  'lcp',
  'cls',
  'inp',
  'fps',
  'loading',
];
const DESKTOP_VIEWPORT = { height: 1000, width: 1440 };
const COMPACT_DESKTOP_VIEWPORT = { height: 998, width: 1182 };

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

async function getMetricRowOrder(metricsTable: Locator) {
  return metricsTable.evaluate((table) =>
    Array.from(table.querySelectorAll('[data-lab-performance-metric-row]')).map(
      (row) => row.getAttribute('data-metric-row-id'),
    ),
  );
}

function metricLabel(metricsTable: Locator, metricRowId: string) {
  return metricsTable.locator(
    `[data-metric-row-id="${metricRowId}"] [data-lab-performance-metric-label]`,
  );
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
    await expect(metricLabel(metricsTable, 'resources')).toHaveText(
      /^(Matched resources|Resources)$/,
    );
    await expect(metricsTable).toContainText('Route module fetches');
    await expect(metricLabel(metricsTable, 'long-tasks')).toHaveText(
      /^(Long tasks|Tasks)$/,
    );
    await expect(metricsTable).toContainText('Main-thread blocks observed');
    await expect(metricLabel(metricsTable, 'fcp')).toHaveText(
      /^(First contentful paint \(FCP\)|FCP)$/,
    );
    await expect(metricsTable).toContainText('Initial document paint');
    await expect(metricLabel(metricsTable, 'fps')).toHaveText(
      /^(Frame rate \(FPS\)|FPS)$/,
    );
    await expect(metricsTable).toContainText('requestAnimationFrame sampler');
    await expect(metricsTable.locator('tbody tr')).toHaveCount(8);
    await expect(metricsTable.locator('svg[role="img"]')).toHaveCount(6);
    expect(
      await metricsTable.evaluate((table) =>
        Array.from(table.querySelectorAll('svg[role="img"]')).map(
          (svg) => svg.querySelectorAll('path').length,
        ),
      ),
    ).toEqual([0, 0, 0, 0, 0, 0]);
    const metricRangeCharts = await metricsTable.evaluate((table) =>
      Array.from(table.querySelectorAll('svg[role="img"]')).map((svg) => {
        const markerLine = svg.querySelector(
          '[data-testid="lab-performance-metric-marker-line"]',
        );
        const markerDot = svg.querySelector(
          '[data-testid="lab-performance-metric-marker-dot"]',
        );
        const segments = Array.from(
          svg.querySelectorAll(
            '[data-testid="lab-performance-metric-range-segment"]',
          ),
        );

        return {
          ariaLabel: svg.getAttribute('aria-label') ?? '',
          markerDotX: Number(markerDot?.getAttribute('cx')),
          markerDotY: Number(markerDot?.getAttribute('cy')),
          markerLineCount: markerLine ? 1 : 0,
          markerLineX: Number(markerLine?.getAttribute('x1')),
          segmentCount: segments.length,
          segmentTones: segments.map((segment) =>
            segment.getAttribute('data-range-tone'),
          ),
        };
      }),
    );
    expect(
      metricRangeCharts.every(
        (chart) =>
          chart.segmentCount === 3 &&
          chart.segmentTones.includes('good') &&
          chart.segmentTones.includes('okay') &&
          chart.segmentTones.includes('poor') &&
          !chart.ariaLabel.includes('quality curve'),
      ),
    ).toBe(true);
    const fcpRangeChart = metricsTable.locator(
      '[data-metric-row-id="fcp"] svg[role="img"]',
    );
    await expect(fcpRangeChart).toHaveAttribute(
      'aria-label',
      /good .*needs improvement/,
    );
    const fcpRangeDetails = await fcpRangeChart.evaluate((svg) => {
      const markerLine = svg.querySelector(
        '[data-testid="lab-performance-metric-marker-line"]',
      );
      const markerDot = svg.querySelector(
        '[data-testid="lab-performance-metric-marker-dot"]',
      );
      const segments = Array.from(
        svg.querySelectorAll(
          '[data-testid="lab-performance-metric-range-segment"]',
        ),
      );

      return {
        markerDotX: Number(markerDot?.getAttribute('cx')),
        markerDotY: Number(markerDot?.getAttribute('cy')),
        markerLineX: Number(markerLine?.getAttribute('x1')),
        markerPosition: Number(markerLine?.getAttribute('data-position')),
        segments: segments.map((segment) => ({
          end: Number(segment.getAttribute('data-range-end')),
          start: Number(segment.getAttribute('data-range-start')),
          tone: segment.getAttribute('data-range-tone'),
        })),
      };
    });
    expect(fcpRangeDetails.segments).toEqual([
      { end: 1800, start: 0, tone: 'good' },
      { end: 3000, start: 1800, tone: 'okay' },
      { end: 5000, start: 3000, tone: 'poor' },
    ]);
    expect(fcpRangeDetails.markerPosition).toBeGreaterThanOrEqual(0);
    expect(fcpRangeDetails.markerPosition).toBeLessThanOrEqual(1);
    expect(
      Math.abs(fcpRangeDetails.markerDotX - fcpRangeDetails.markerLineX),
    ).toBeLessThanOrEqual(0.01);
    expect(fcpRangeDetails.markerDotY).toBe(10);
    await expect(
      metricsTable.locator('tbody tr').first().locator('th, td'),
    ).toHaveCount(4);
    const lcpRow = metricsTable.locator('[data-metric-row-id="lcp"]');
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
    await expect(timelineShell).toContainText('events');
    await expect(timelineShell).not.toContainText('elapsed');
    const timelineBars = performancePanel.getByTestId(
      'lab-performance-timeline-bar',
    );
    await expect(timelineBars.first()).toBeVisible();
    const timelineRows = await timelineShell.evaluate((shell) =>
      Array.from(
        shell.querySelectorAll('[data-lab-performance-timeline-row]'),
      ).map((row) => {
        const bar = row.querySelector(
          '[data-testid="lab-performance-timeline-bar"]',
        ) as HTMLElement | null;
        const timeCell = row.children[0] as HTMLElement | undefined;
        const actualDurationMs = Number(
          row.getAttribute('data-actual-duration-ms'),
        );
        const actualEndMs = Number(row.getAttribute('data-actual-end-ms'));
        const storyEndMs = Number(row.getAttribute('data-story-end-ms'));
        const storyStartMs = Number(row.getAttribute('data-story-start-ms'));
        const storyDurationMs = Number(
          row.getAttribute('data-story-duration-ms'),
        );
        const track = row.children[2] as HTMLElement | undefined;
        const verticalCapCount = track
          ? Array.from(track.children).filter((child) => {
              if (child === bar) {
                return false;
              }

              const rect = child.getBoundingClientRect();

              return rect.height > 8 && rect.width <= 2;
            }).length
          : 0;
        const barBox = bar?.getBoundingClientRect();

        return {
          actualDurationMs,
          actualEndMs,
          barHeight: barBox?.height ?? 0,
          barLeft: Number.parseFloat(bar?.style.left ?? ''),
          capCount: verticalCapCount,
          displayedTime: timeCell?.textContent?.trim() ?? '',
          computedStoryDurationMs: storyEndMs - storyStartMs,
          storyDurationMs,
          storyEndMs,
          storyStartMs,
        };
      }),
    );
    expect(timelineRows.length).toBeGreaterThan(1);
    expect(
      timelineRows.every(
        (row) =>
          Number.isFinite(row.barLeft) &&
          row.barLeft >= 0 &&
          row.barLeft <= 100,
      ),
    ).toBe(true);
    expect(
      timelineRows.every(
        (row) => row.displayedTime === `${Math.round(row.actualEndMs)}ms`,
      ),
    ).toBe(true);
    expect(
      timelineRows.every(
        (row) => row.storyDurationMs >= Math.max(1, row.actualDurationMs),
      ),
    ).toBe(true);
    expect(
      timelineRows.every(
        (row) =>
          Math.abs(row.storyDurationMs - row.computedStoryDurationMs) <= 1,
      ),
    ).toBe(true);
    expect(timelineRows.every((row) => row.barHeight <= 4)).toBe(true);
    expect(timelineRows.every((row) => row.capCount === 0)).toBe(true);
    expect(
      timelineRows
        .slice(1)
        .every(
          (row, index) =>
            Math.abs(row.storyStartMs - timelineRows[index]!.storyEndMs) <= 1,
        ),
    ).toBe(true);
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
      const labScrollColumn = page.locator('[data-lab-page-scroll]');
      const metricsShell = performancePanel.getByTestId(
        'lab-performance-metrics-shell',
      );
      const [performancePanelBox, propertiesPanelBox] = await Promise.all([
        performancePanel.boundingBox(),
        page.locator('aside').boundingBox(),
      ]);
      await expect(labScrollColumn).toHaveCount(1);
      expect(
        await labScrollColumn.evaluate(
          (node) => getComputedStyle(node).overflowY,
        ),
      ).toBe('auto');
      expect(performancePanelBox).not.toBeNull();
      expect(propertiesPanelBox).not.toBeNull();
      expect(
        await performancePanel.evaluate(
          (node) => getComputedStyle(node).borderRadius,
        ),
      ).toBe('24px');
      expect(performancePanelBox!.x).toBeGreaterThanOrEqual(12);
      expect(
        performancePanelBox!.x + performancePanelBox!.width,
      ).toBeLessThanOrEqual(propertiesPanelBox!.x + 1);
      const metricsTableBox = await metricsTable.boundingBox();
      const metricsShellBox = await metricsShell.boundingBox();
      const timelineFitBox = await timelineShell.boundingBox();
      expect(metricsTableBox).not.toBeNull();
      expect(metricsShellBox).not.toBeNull();
      expect(timelineFitBox).not.toBeNull();
      await expect(metricsShell).toHaveClass(
        /ck-lab-performance-metrics-scroll/,
      );
      expect(
        await metricsShell.evaluate(
          (node) => getComputedStyle(node).scrollbarColor,
        ),
      ).toBe('rgba(255, 255, 255, 0.1) rgba(0, 0, 0, 0)');
      expect(
        await metricsShell.evaluate(
          (node) => getComputedStyle(node).scrollbarGutter,
        ),
      ).toBe('stable');
      if (labPage.value === 'inputMulti') {
        await metricsShell.dispatchEvent('scroll');
        await expect(metricsShell).toHaveClass(
          /ck-lab-performance-metrics-scroll-active/,
        );
        await page.waitForTimeout(800);
        await expect(metricsShell).not.toHaveClass(
          /ck-lab-performance-metrics-scroll-active/,
        );
      }
      expect(performancePanelBox!.height).toBeGreaterThanOrEqual(128);
      expect(performancePanelBox!.height).toBeLessThanOrEqual(
        Math.max(metricsTableBox!.height, timelineFitBox!.height) + 64,
      );
      expect(metricsShellBox!.height).toBeGreaterThanOrEqual(
        metricsTableBox!.height - 4,
      );
      const viewport = page.viewportSize();
      expect(viewport).not.toBeNull();
      expect(
        viewport!.height -
          (performancePanelBox!.y + performancePanelBox!.height),
      ).toBeGreaterThanOrEqual(12);
      expect(propertiesPanelBox!.height).toBeGreaterThanOrEqual(998);
      expect(
        await page
          .locator('aside')
          .evaluate((node) => getComputedStyle(node).paddingLeft),
      ).toBe('0px');

      if (labPage.value === 'slider') {
        const resizeHandle = performancePanel.getByLabel(
          'Resize performance analysis panel',
          { exact: true },
        );
        await expect(resizeHandle).toBeVisible();
        const handleBox = await resizeHandle.boundingBox();
        expect(handleBox).not.toBeNull();

        await page.mouse.move(
          handleBox!.x + handleBox!.width / 2,
          handleBox!.y + 2,
        );
        await page.mouse.down();
        await page.mouse.move(
          handleBox!.x + handleBox!.width / 2,
          handleBox!.y + 260,
        );
        await page.mouse.up();

        const resizedPanelBox = await performancePanel.boundingBox();
        expect(resizedPanelBox).not.toBeNull();
        expect(resizedPanelBox!.height).toBeGreaterThanOrEqual(128);
        expect(resizedPanelBox!.height).toBeLessThanOrEqual(150);
        const clippedMetricsState = await metricsShell.evaluate((node) => {
          const style = getComputedStyle(node);

          return {
            clientHeight: node.clientHeight,
            overflowY: style.overflowY,
            scrollbarGutter: style.scrollbarGutter,
            scrollHeight: node.scrollHeight,
          };
        });
        expect(clippedMetricsState.overflowY).toBe('auto');
        expect(clippedMetricsState.scrollbarGutter).toBe('stable');
        expect(clippedMetricsState.scrollHeight).toBeGreaterThan(
          clippedMetricsState.clientHeight,
        );
        const resizedMetricsTableBox = await metricsTable.boundingBox();
        expect(resizedMetricsTableBox).not.toBeNull();
        expect(
          Math.abs(resizedMetricsTableBox!.width - metricsTableBox!.width),
        ).toBeLessThanOrEqual(1);
        await metricsShell.dispatchEvent('scroll');
        await expect(metricsShell).toHaveClass(
          /ck-lab-performance-metrics-scroll-active/,
        );
        const activeMetricsTableBox = await metricsTable.boundingBox();
        expect(activeMetricsTableBox).not.toBeNull();
        expect(
          Math.abs(
            activeMetricsTableBox!.width - resizedMetricsTableBox!.width,
          ),
        ).toBeLessThanOrEqual(1);
        expect(viewport).not.toBeNull();
        expect(
          viewport!.height - (resizedPanelBox!.y + resizedPanelBox!.height),
        ).toBeGreaterThanOrEqual(12);
        await expect(performancePanel).not.toContainText(
          'performance analysis panel',
        );
        await expect(performancePanel).not.toContainText(
          'Layout shift source: slider',
        );
      }
    }

    await page.screenshot({
      path: path.join(
        snapshotDir,
        `${String(index + 1).padStart(2, '0')}-${labPage.slug}.png`,
      ),
      fullPage: true,
    });

    if (testInfo.project.name === 'desktop' && labPage.value === 'tooltip') {
      const metricRows = metricsTable.locator(
        '[data-lab-performance-metric-row]',
      );
      await expect(metricRows).toHaveCount(DEFAULT_METRIC_ROW_ORDER.length);
      expect(await getMetricRowOrder(metricsTable)).toEqual(
        DEFAULT_METRIC_ROW_ORDER,
      );

      const [firstMetricRowBox, secondMetricRowBox] = await Promise.all([
        metricRows.nth(0).boundingBox(),
        metricRows.nth(1).boundingBox(),
      ]);
      expect(firstMetricRowBox).not.toBeNull();
      expect(secondMetricRowBox).not.toBeNull();

      const dragX = firstMetricRowBox!.x + firstMetricRowBox!.width / 2;
      const dragStartY = firstMetricRowBox!.y + firstMetricRowBox!.height / 2;
      const dragEndY = secondMetricRowBox!.y + secondMetricRowBox!.height / 2;
      await page.mouse.move(dragX, dragStartY);
      await page.mouse.down();
      await page.mouse.move(dragX, dragEndY, { steps: 8 });
      await page.mouse.up();

      const reorderedMetricRows = [
        'long-tasks',
        'resources',
        'fcp',
        'lcp',
        'cls',
        'inp',
        'fps',
        'loading',
      ];
      await expect
        .poll(() => getMetricRowOrder(metricsTable))
        .toEqual(reorderedMetricRows);

      await page.reload();
      await expect(page).toHaveURL(new RegExp(`/lab/${labPage.slug}$`));
      const reloadedMetricsTable = page
        .getByRole('region', {
          name: `Performance analysis for ${labPage.label}`,
          exact: true,
        })
        .getByRole('table', {
          name: 'Performance metrics',
          exact: true,
        });
      await expect
        .poll(() => getMetricRowOrder(reloadedMetricsTable))
        .toEqual(reorderedMetricRows);

      await page.evaluate(
        (storageKey) => window.localStorage.removeItem(storageKey),
        LAB_METRIC_ROW_ORDER_STORAGE_KEY,
      );
      await page.reload();
      await expect(page).toHaveURL(new RegExp(`/lab/${labPage.slug}$`));

      await page.setViewportSize(COMPACT_DESKTOP_VIEWPORT);
      await page.reload();
      await expect(page).toHaveURL(new RegExp(`/lab/${labPage.slug}$`));
      const compactMetricsTable = page
        .getByRole('region', {
          name: `Performance analysis for ${labPage.label}`,
          exact: true,
        })
        .getByRole('table', {
          name: 'Performance metrics',
          exact: true,
        });
      await expect(compactMetricsTable).toHaveAttribute(
        'data-lab-performance-label-mode',
        'abbreviated',
      );
      const compactMetricLabels = [
        ['resources', 'Resources'],
        ['long-tasks', 'Tasks'],
        ['fcp', 'FCP'],
        ['lcp', 'LCP'],
        ['cls', 'CLS'],
        ['inp', 'INP'],
        ['fps', 'FPS'],
        ['loading', 'Loading'],
      ];

      for (const [metricRowId, compactLabel] of compactMetricLabels) {
        const label = metricLabel(compactMetricsTable, metricRowId);
        await expect(label).toHaveCount(1);
        await expect(label).toHaveText(compactLabel);
      }

      await expect(
        compactMetricsTable.locator('[data-metric-row-id="fcp"] th'),
      ).toHaveAttribute('title', 'First contentful paint (FCP)');

      await page.setViewportSize(DESKTOP_VIEWPORT);
      await page.reload();
      await expect(page).toHaveURL(new RegExp(`/lab/${labPage.slug}$`));
    }
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
