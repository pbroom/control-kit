import { expect, test } from '@playwright/test';
import {
  collectBrowserErrors,
  LAB_COLLAPSED_PANEL_HANDLE_HEIGHT,
  LAB_PAGES,
  openLabRoot,
  performanceMetricsTable,
  performancePanelFor,
  selectPerformancePanelView,
} from './lab-smoke-utils.js';

test.setTimeout(60_000);

test('keeps desktop performance panel layout, scrollbars, and resize behavior stable', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop layout coverage');
  const browserErrors = await collectBrowserErrors(page);

  await openLabRoot(page);

  for (const [index, labPage] of LAB_PAGES.entries()) {
    if (index > 0) {
      await page
        .getByRole('link', { name: labPage.label, exact: true })
        .click();
    }

    const performancePanel = performancePanelFor(page, labPage.label);
    await selectPerformancePanelView(performancePanel, 'Metrics');
    const metricsTable = performanceMetricsTable(performancePanel);
    const timelineShell = performancePanel.getByTestId(
      'lab-performance-timeline-shell',
    );
    const panelViewTabs = performancePanel.getByRole('tablist', {
      name: 'Performance panel views',
      exact: true,
    });
    const labScrollColumn = page.locator('[data-lab-page-scroll]');
    const metricsShell = performancePanel.getByTestId(
      'lab-performance-metrics-shell',
    );
    const performancePanelSurface = performancePanel.locator(
      '[data-lab-performance-panel-surface]',
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
    await expect(performancePanelSurface).toBeVisible();
    expect(
      await performancePanelSurface.evaluate(
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
    const panelViewTabsBox = await panelViewTabs.boundingBox();
    expect(metricsTableBox).not.toBeNull();
    expect(metricsShellBox).not.toBeNull();
    expect(timelineFitBox).not.toBeNull();
    expect(panelViewTabsBox).not.toBeNull();
    expect(panelViewTabsBox!.height).toBeGreaterThanOrEqual(28);
    await expect(metricsShell).toHaveClass(/ck-lab-performance-metrics-scroll/);
    await page.mouse.move(0, 0);
    await page.waitForTimeout(800);
    await expect(metricsShell).not.toHaveClass(
      /ck-lab-performance-metrics-scroll-active/,
    );
    expect(
      await metricsShell.evaluate(
        (node) => getComputedStyle(node).scrollbarColor,
      ),
    ).toBe('rgba(0, 0, 0, 0) rgba(0, 0, 0, 0)');
    expect(
      await metricsShell.evaluate(
        (node) => getComputedStyle(node).scrollbarGutter,
      ),
    ).toBe('stable');
    await page.mouse.move(
      metricsShellBox!.x + metricsShellBox!.width / 2,
      metricsShellBox!.y + 12,
    );
    await expect(metricsShell).not.toHaveClass(
      /ck-lab-performance-metrics-scroll-active/,
    );
    await page.mouse.move(
      metricsShellBox!.x + metricsShellBox!.width - 4,
      metricsShellBox!.y + 12,
    );
    await expect(metricsShell).toHaveClass(
      /ck-lab-performance-metrics-scroll-active/,
    );
    expect(
      await metricsShell.evaluate(
        (node) => getComputedStyle(node).scrollbarColor,
      ),
    ).toBe('rgba(255, 255, 255, 0.28) rgba(0, 0, 0, 0)');
    await page.mouse.move(
      metricsShellBox!.x + metricsShellBox!.width / 2,
      metricsShellBox!.y + 12,
    );
    await expect(metricsShell).not.toHaveClass(
      /ck-lab-performance-metrics-scroll-active/,
    );
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
      Math.max(metricsTableBox!.height, timelineFitBox!.height) +
        panelViewTabsBox!.height +
        72,
    );
    expect(metricsShellBox!.height).toBeGreaterThanOrEqual(
      metricsTableBox!.height - 4,
    );
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    expect(
      viewport!.height - (performancePanelBox!.y + performancePanelBox!.height),
    ).toBeGreaterThanOrEqual(12);
    expect(propertiesPanelBox!.height).toBeGreaterThanOrEqual(998);
    expect(
      await page
        .locator('aside')
        .evaluate((node) => getComputedStyle(node).paddingLeft),
    ).toBe('0px');

    if (labPage.value !== 'slider') {
      continue;
    }

    const resizeHandle = performancePanel.getByLabel(
      'Resize performance analysis panel',
      { exact: true },
    );
    await expect(resizeHandle).toBeVisible();
    await expect(resizeHandle).toHaveAttribute('aria-orientation', 'vertical');
    const targetOpenPanelHeight = Number(
      await resizeHandle.getAttribute('aria-valuemax'),
    );
    expect(targetOpenPanelHeight).toBeGreaterThan(128);
    const handleBox = await resizeHandle.boundingBox();
    expect(handleBox).not.toBeNull();
    expect(handleBox!.height).toBeGreaterThanOrEqual(
      LAB_COLLAPSED_PANEL_HANDLE_HEIGHT,
    );
    const resizeGrip = resizeHandle.locator(
      '[data-lab-performance-resize-grip]',
    );
    const gripBox = await resizeGrip.boundingBox();
    expect(gripBox).not.toBeNull();
    expect(gripBox!.height).toBeGreaterThanOrEqual(4);
    expect(gripBox!.width).toBeGreaterThanOrEqual(80);

    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2,
      handleBox!.y + 2,
    );
    await page.mouse.down();
    await page.mouse.up();
    await expect
      .poll(() => page.evaluate(() => document.body.style.cursor))
      .toBe('');
    await expect
      .poll(() => page.evaluate(() => document.body.style.userSelect))
      .toBe('');
    await page.mouse.down();
    await expect
      .poll(() =>
        resizeGrip.evaluate((node) => getComputedStyle(node).backgroundColor),
      )
      .toMatch(/(?:255, 255, 255|0\.6\))/);
    expect(
      await resizeGrip.evaluate(
        (node) => getComputedStyle(node).backgroundColor,
      ),
    ).not.toContain('82, 136, 219');
    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2,
      handleBox!.y - 220,
    );
    const rubberBandPanelBox = await performancePanel.boundingBox();
    expect(rubberBandPanelBox).not.toBeNull();
    expect(rubberBandPanelBox!.height).toBeGreaterThan(
      performancePanelBox!.height,
    );
    expect(rubberBandPanelBox!.height).toBeLessThan(
      performancePanelBox!.height + 120,
    );
    await page.mouse.up();
    await expect
      .poll(async () => (await performancePanel.boundingBox())?.height ?? 0)
      .toBeLessThan(rubberBandPanelBox!.height - 8);
    await expect(resizeHandle).toHaveAttribute(
      'aria-valuenow',
      String(targetOpenPanelHeight),
    );
    await expect
      .poll(async () => (await performancePanel.boundingBox())?.height ?? 0)
      .toBeLessThanOrEqual(targetOpenPanelHeight + 2);
    const snappedOpenPanelBox = await performancePanel.boundingBox();
    expect(snappedOpenPanelBox).not.toBeNull();
    expect(snappedOpenPanelBox!.height).toBeLessThanOrEqual(
      targetOpenPanelHeight + 2,
    );
    expect(snappedOpenPanelBox!.height).toBeGreaterThanOrEqual(
      targetOpenPanelHeight - 2,
    );

    const snappedHandleBox = await resizeHandle.boundingBox();
    expect(snappedHandleBox).not.toBeNull();
    await page.mouse.move(
      snappedHandleBox!.x + snappedHandleBox!.width / 2,
      snappedHandleBox!.y + 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      snappedHandleBox!.x + snappedHandleBox!.width / 2,
      snappedHandleBox!.y + 18,
    );
    await page.mouse.up();
    const smallDragPanelBox = await performancePanel.boundingBox();
    expect(smallDragPanelBox).not.toBeNull();
    expect(smallDragPanelBox!.height).toBeLessThan(
      performancePanelBox!.height - 4,
    );
    const shrunkenHandleBox = await resizeHandle.boundingBox();
    expect(shrunkenHandleBox).not.toBeNull();
    const minimumDragDistance = Math.max(0, smallDragPanelBox!.height - 136);
    await page.mouse.move(
      shrunkenHandleBox!.x + shrunkenHandleBox!.width / 2,
      shrunkenHandleBox!.y + 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      shrunkenHandleBox!.x + shrunkenHandleBox!.width / 2,
      shrunkenHandleBox!.y + minimumDragDistance,
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
      Math.abs(activeMetricsTableBox!.width - resizedMetricsTableBox!.width),
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

    const minimumHandleBox = await resizeHandle.boundingBox();
    expect(minimumHandleBox).not.toBeNull();
    await page.mouse.move(
      minimumHandleBox!.x + minimumHandleBox!.width / 2,
      minimumHandleBox!.y + 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      minimumHandleBox!.x + minimumHandleBox!.width / 2,
      minimumHandleBox!.y + 180,
    );
    await page.mouse.up();
    await expect(performancePanel).toHaveAttribute(
      'data-lab-performance-panel-collapsed',
      'true',
    );
    const collapsedPanelBox = await performancePanel.boundingBox();
    expect(collapsedPanelBox).not.toBeNull();
    expect(collapsedPanelBox!.height).toBeLessThanOrEqual(
      LAB_COLLAPSED_PANEL_HANDLE_HEIGHT,
    );
    await expect(resizeHandle).toBeVisible();
    const panelSurface = performancePanel.locator(
      '[data-lab-performance-panel-surface]',
    );
    const collapsedSurfaceState = await panelSurface.evaluate((node) => ({
      ariaHidden: node.getAttribute('aria-hidden'),
    }));
    expect(collapsedSurfaceState.ariaHidden).toBe('true');
    await expect
      .poll(() =>
        panelSurface.evaluate((node) => node.getBoundingClientRect().height),
      )
      .toBeLessThanOrEqual(1);
    await expect
      .poll(() =>
        panelSurface.evaluate((node) => Number(getComputedStyle(node).opacity)),
      )
      .toBeLessThanOrEqual(0.05);
    const collapsedScrollState = await labScrollColumn.evaluate((node) => ({
      clientHeight: node.clientHeight,
      scrollHeight: node.scrollHeight,
    }));
    expect(collapsedScrollState.scrollHeight).toBeLessThanOrEqual(
      collapsedScrollState.clientHeight + 1,
    );
    const collapsedDocumentScrollState = await page.evaluate(() => ({
      pageHeight: Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
      ),
      viewportHeight: window.innerHeight,
    }));
    expect(collapsedDocumentScrollState.pageHeight).toBeLessThanOrEqual(
      collapsedDocumentScrollState.viewportHeight + 1,
    );

    const collapsedHandleBox = await resizeHandle.boundingBox();
    expect(collapsedHandleBox).not.toBeNull();
    await page.mouse.move(
      collapsedHandleBox!.x + collapsedHandleBox!.width / 2,
      collapsedHandleBox!.y + 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      collapsedHandleBox!.x + collapsedHandleBox!.width / 2,
      collapsedHandleBox!.y - 40,
    );
    await page.mouse.up();
    await expect(performancePanel).toHaveAttribute(
      'data-lab-performance-panel-collapsed',
      'false',
    );
    await expect(resizeHandle).toHaveAttribute(
      'aria-valuenow',
      String(targetOpenPanelHeight),
    );
    await expect
      .poll(async () => (await performancePanel.boundingBox())?.height ?? 0)
      .toBeGreaterThanOrEqual(targetOpenPanelHeight - 2);
    const restoredPanelBox = await performancePanel.boundingBox();
    expect(restoredPanelBox).not.toBeNull();
    expect(restoredPanelBox!.height).toBeLessThanOrEqual(
      targetOpenPanelHeight + 2,
    );

    await resizeHandle.dblclick();
    await expect(performancePanel).toHaveAttribute(
      'data-lab-performance-panel-collapsed',
      'true',
    );
    await expect(resizeHandle).toHaveAttribute('aria-valuenow', '0');
    await expect
      .poll(async () => (await performancePanel.boundingBox())?.height ?? 0)
      .toBeLessThanOrEqual(LAB_COLLAPSED_PANEL_HANDLE_HEIGHT);
    await page.getByRole('link', { name: 'Input Multi', exact: true }).click();
    await expect(performancePanel).toHaveAttribute(
      'data-lab-performance-panel-collapsed',
      'true',
    );
    await expect
      .poll(async () => (await performancePanel.boundingBox())?.height ?? 0)
      .toBeLessThanOrEqual(LAB_COLLAPSED_PANEL_HANDLE_HEIGHT);
    await page.getByRole('link', { name: 'Slider', exact: true }).click();
    await expect(performancePanel).toHaveAttribute(
      'data-lab-performance-panel-collapsed',
      'true',
    );
    await expect(resizeHandle).toHaveAttribute('aria-valuenow', '0');
    await resizeHandle.dblclick();
    await expect(performancePanel).toHaveAttribute(
      'data-lab-performance-panel-collapsed',
      'false',
    );
    await expect(resizeHandle).toHaveAttribute(
      'aria-valuenow',
      String(targetOpenPanelHeight),
    );
    await expect
      .poll(async () => (await performancePanel.boundingBox())?.height ?? 0)
      .toBeGreaterThanOrEqual(targetOpenPanelHeight - 2);
    const doubleClickOpenHandleBox = await resizeHandle.boundingBox();
    expect(doubleClickOpenHandleBox).not.toBeNull();
    await page.mouse.move(
      doubleClickOpenHandleBox!.x + doubleClickOpenHandleBox!.width / 2,
      doubleClickOpenHandleBox!.y + 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      doubleClickOpenHandleBox!.x + doubleClickOpenHandleBox!.width / 2,
      doubleClickOpenHandleBox!.y + 40,
    );
    await page.mouse.up();
    const partialPanelBox = await performancePanel.boundingBox();
    expect(partialPanelBox).not.toBeNull();
    expect(partialPanelBox!.height).toBeGreaterThanOrEqual(128);
    expect(partialPanelBox!.height).toBeLessThan(targetOpenPanelHeight - 4);
    await resizeHandle.dblclick();
    await expect(performancePanel).toHaveAttribute(
      'data-lab-performance-panel-collapsed',
      'false',
    );
    await expect(resizeHandle).toHaveAttribute(
      'aria-valuenow',
      String(targetOpenPanelHeight),
    );
    await expect
      .poll(async () => (await performancePanel.boundingBox())?.height ?? 0)
      .toBeGreaterThanOrEqual(targetOpenPanelHeight - 2);
  }

  expect(browserErrors).toEqual([]);
});
