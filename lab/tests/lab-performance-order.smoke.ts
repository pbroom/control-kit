import { expect, test } from '@playwright/test';
import {
  collectBrowserErrors,
  COMPACT_DESKTOP_VIEWPORT,
  DEFAULT_METRIC_ROW_ORDER,
  DESKTOP_VIEWPORT,
  getMetricRowOrder,
  LAB_METRIC_ROW_ORDER_STORAGE_KEY,
  metricLabel,
  openLabRoot,
  performanceMetricsTable,
  performancePanelFor,
  selectPerformancePanelView,
} from './lab-smoke-utils.js';

test('persists metric row ordering and abbreviates labels on compact desktop', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop ordering coverage');
  const browserErrors = await collectBrowserErrors(page);

  await openLabRoot(page);
  await page.getByRole('link', { name: 'Tooltip', exact: true }).click();
  const performancePanel = performancePanelFor(page, 'Tooltip');
  await selectPerformancePanelView(performancePanel, 'Metrics');
  const metricsTable = performanceMetricsTable(performancePanel);
  const metricRows = metricsTable.locator('[data-lab-performance-metric-row]');
  await expect(metricRows).toHaveCount(DEFAULT_METRIC_ROW_ORDER.length);
  expect(await getMetricRowOrder(metricsTable)).toEqual(
    DEFAULT_METRIC_ROW_ORDER,
  );
  const fcpLabel = metricLabel(metricsTable, 'fcp');
  const fcpRow = metricsTable.locator('[data-metric-row-id="fcp"]');
  await expect(fcpRow).toHaveCSS('cursor', 'auto');
  await expect(fcpRow).toHaveCSS('user-select', 'auto');
  await expect(fcpRow).not.toHaveCSS('touch-action', 'none');
  const fcpLabelBox = await fcpLabel.boundingBox();
  expect(fcpLabelBox).not.toBeNull();
  await page.evaluate(() => window.getSelection()?.removeAllRanges());
  await page.mouse.move(fcpLabelBox!.x + 2, fcpLabelBox!.y + 8);
  await page.mouse.down();
  await page.mouse.move(
    fcpLabelBox!.x + fcpLabelBox!.width - 4,
    fcpLabelBox!.y + 9,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect
    .poll(() => getMetricRowOrder(metricsTable))
    .toEqual(DEFAULT_METRIC_ROW_ORDER);
  const selectedMetricText = await page.evaluate(() =>
    window.getSelection()?.toString(),
  );
  expect(selectedMetricText).toContain('contentful');
  await page.evaluate(() => window.getSelection()?.removeAllRanges());

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
  await expect(page).toHaveURL(/\/lab\/tooltip$/);
  const reloadedPerformancePanel = performancePanelFor(page, 'Tooltip');
  await selectPerformancePanelView(reloadedPerformancePanel, 'Metrics');
  const reloadedMetricsTable = performanceMetricsTable(
    reloadedPerformancePanel,
  );
  await expect
    .poll(() => getMetricRowOrder(reloadedMetricsTable))
    .toEqual(reorderedMetricRows);
  await page.evaluate(
    (storageKey) => window.localStorage.removeItem(storageKey),
    LAB_METRIC_ROW_ORDER_STORAGE_KEY,
  );
  await page.reload();
  await expect(page).toHaveURL(/\/lab\/tooltip$/);

  await page.setViewportSize(COMPACT_DESKTOP_VIEWPORT);
  await page.reload();
  await expect(page).toHaveURL(/\/lab\/tooltip$/);
  const compactPerformancePanel = performancePanelFor(page, 'Tooltip');
  await selectPerformancePanelView(compactPerformancePanel, 'Metrics');
  const compactMetricsTable = performanceMetricsTable(compactPerformancePanel);
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
  const compactColumnWidths = await compactMetricsTable
    .locator('tbody tr')
    .first()
    .evaluate((row) => {
      const [labelCell, attributionCell] = Array.from(row.children).map(
        (cell) => cell.getBoundingClientRect().width,
      );
      const tableWidth = row.closest('table')?.getBoundingClientRect().width;
      return {
        attribution: attributionCell ?? 0,
        label: labelCell ?? 0,
        table: tableWidth ?? 0,
      };
    });
  expect(compactColumnWidths.label).toBeLessThan(
    compactColumnWidths.table * 0.3,
  );
  expect(compactColumnWidths.attribution).toBeGreaterThan(
    compactColumnWidths.label,
  );
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.reload();
  await expect(page).toHaveURL(/\/lab\/tooltip$/);
  expect(browserErrors).toEqual([]);
});
