import { expect, test } from '@playwright/test';
import {
  collectBrowserErrors,
  LAB_PAGES,
  metricLabel,
  openLabRoot,
  performanceMetricsTable,
  performancePanelFor,
} from './lab-smoke-utils.js';

test('renders performance metrics, ranges, lcp attribution, and timeline', async ({
  page,
}, testInfo) => {
  const browserErrors = await collectBrowserErrors(page);

  await openLabRoot(page);

  for (const [index, labPage] of LAB_PAGES.entries()) {
    if (index > 0) {
      await page
        .getByRole('link', { name: labPage.label, exact: true })
        .click();
    }

    const performancePanel = performancePanelFor(page, labPage.label);
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

    const metricsTable = performanceMetricsTable(performancePanel);
    await expect(metricsTable).toBeVisible();
    const resourcesRow = metricsTable.locator(
      '[data-metric-row-id="resources"]',
    );
    await expect(metricLabel(metricsTable, 'resources')).toHaveText(
      /^(Matched resources|Resources)$/,
    );
    await expect(resourcesRow).toContainText(
      'Route module fetches - 0ms total',
    );
    await expect(metricLabel(metricsTable, 'long-tasks')).toHaveText(
      /^(Long tasks|Tasks)$/,
    );
    await expect(metricsTable).toContainText('Main-thread blocks observed');
    const loadingRow = metricsTable.locator('[data-metric-row-id="loading"]');
    await expect(loadingRow).toContainText(
      /(?:Component preview slot|No loading state observed)/,
    );
    await expect(loadingRow).toContainText(/\d+ms/);
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
        const segments = Array.from(
          svg.querySelectorAll(
            '[data-testid="lab-performance-metric-range-segment"]',
          ),
        );
        return {
          activeSegmentCount: segments.filter(
            (segment) => segment.getAttribute('data-active') === 'true',
          ).length,
          ariaLabel: svg.getAttribute('aria-label') ?? '',
          coloredSegmentCount: segments.filter(
            (segment) =>
              segment.getAttribute('fill') !== 'rgba(255,255,255,0.14)',
          ).length,
          markerDotCount: svg.querySelectorAll(
            '[data-testid="lab-performance-metric-marker-dot"]',
          ).length,
          markerLineCount: markerLine ? 1 : 0,
          markerLineX: Number(markerLine?.getAttribute('x1')),
          segmentCount: segments.length,
          segmentHeights: segments.map((segment) =>
            Number(segment.getAttribute('height')),
          ),
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
          chart.activeSegmentCount <= 1 &&
          chart.coloredSegmentCount === chart.activeSegmentCount &&
          chart.markerDotCount === 0 &&
          chart.segmentHeights.every((height) => height === 2) &&
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
      const segments = Array.from(
        svg.querySelectorAll(
          '[data-testid="lab-performance-metric-range-segment"]',
        ),
      );
      return {
        markerDotCount: svg.querySelectorAll(
          '[data-testid="lab-performance-metric-marker-dot"]',
        ).length,
        markerLineX: Number(markerLine?.getAttribute('x1')),
        markerPosition: Number(markerLine?.getAttribute('data-position')),
        segments: segments.map((segment) => ({
          active: segment.getAttribute('data-active') === 'true',
          end: Number(segment.getAttribute('data-range-end')),
          fill: segment.getAttribute('fill'),
          height: Number(segment.getAttribute('height')),
          start: Number(segment.getAttribute('data-range-start')),
          tone: segment.getAttribute('data-range-tone'),
        })),
      };
    });
    expect(fcpRangeDetails.segments).toEqual([
      {
        active: true,
        end: 1800,
        fill: '#34d399',
        height: 2,
        start: 0,
        tone: 'good',
      },
      {
        active: false,
        end: 3000,
        fill: 'rgba(255,255,255,0.14)',
        height: 2,
        start: 1800,
        tone: 'okay',
      },
      {
        active: false,
        end: 5000,
        fill: 'rgba(255,255,255,0.14)',
        height: 2,
        start: 3000,
        tone: 'poor',
      },
    ]);
    expect(fcpRangeDetails.markerPosition).toBeGreaterThanOrEqual(0);
    expect(fcpRangeDetails.markerPosition).toBeLessThanOrEqual(1);
    expect(fcpRangeDetails.markerDotCount).toBe(0);
    expect(Number.isFinite(fcpRangeDetails.markerLineX)).toBe(true);

    const fcpRangeTrigger = metricsTable.locator(
      '[data-metric-row-id="fcp"] [data-testid="lab-performance-metric-range-trigger"]',
    );
    await fcpRangeTrigger.hover();
    const fcpRangeCard = page.getByTestId('lab-performance-metric-range-card');
    await expect(fcpRangeCard).toBeVisible();
    const rangeCardSurface = await fcpRangeCard.evaluate((card) => {
      const style = getComputedStyle(card);
      return {
        backdropFilter: style.backdropFilter,
        backgroundColor: style.backgroundColor,
        borderRadius: style.borderRadius,
        borderTopColor: style.borderTopColor,
        boxShadow: style.boxShadow,
        width: card.getBoundingClientRect().width,
      };
    });
    expect(rangeCardSurface.width).toBeGreaterThanOrEqual(286);
    expect(rangeCardSurface.borderRadius).toBe('12px');
    expect(rangeCardSurface.backgroundColor).toMatch(/\/ 0\.03\)|0\.03\)/);
    expect(rangeCardSurface.borderTopColor).toMatch(/\/ 0\.08\)|0\.08\)/);
    expect(rangeCardSurface.boxShadow).toContain('rgba(255, 255, 255, 0.03)');
    expect(rangeCardSurface.backdropFilter).toContain('blur');
    await expect(fcpRangeCard).toContainText('First contentful paint (FCP)');
    await expect(fcpRangeCard).toContainText('Good');
    await expect(fcpRangeCard).toContainText('0ms - 1800ms');
    await expect(fcpRangeCard).toContainText('Needs improvement');
    await expect(fcpRangeCard).toContainText('1800ms - 3000ms');
    await expect(fcpRangeCard).toContainText('Poor');
    await expect(fcpRangeCard).toContainText('3000ms - 5000ms');
    await expect(
      fcpRangeCard.locator(
        '[data-testid="lab-performance-metric-range-card-row"]',
      ),
    ).toHaveCount(3);
    expect(
      await fcpRangeCard.evaluate((card) =>
        Array.from(
          card.querySelectorAll(
            '[data-lab-performance-metric-range-card-copy]',
          ),
        ).map((node) => {
          const element = node as HTMLElement;
          const style = getComputedStyle(element);
          return {
            overflowX: style.overflowX,
            textOverflow: style.textOverflow,
            text: element.textContent ?? '',
          };
        }),
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          overflowX: 'visible',
          text: 'First contentful paint (FCP)',
          textOverflow: 'clip',
        }),
        expect.objectContaining({
          overflowX: 'visible',
          text: 'Needs improvement',
          textOverflow: 'clip',
        }),
      ]),
    );
    await expect(fcpRangeCard.locator('[data-active="true"]')).toHaveCount(1);

    await expect(
      metricsTable.locator('tbody tr').first().locator('th, td'),
    ).toHaveCount(4);
    const lcpRow = metricsTable.locator('[data-metric-row-id="lcp"]');
    await expect(lcpRow).toContainText('LCP');
    await lcpRow
      .locator('[data-testid="lab-performance-metric-range-trigger"]')
      .hover();
    await expect(fcpRangeCard).toContainText('Largest contentful paint (LCP)');
    await expect(lcpRow.locator('td').last()).toContainText(/\d+ms/);
    const lcpText = await lcpRow.textContent();
    expect(lcpText).toMatch(/Largest preview element/);
    expect(lcpText).not.toMatch(/No preview LCP candidate|N\/A|Waiting/);
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
    await expect(
      performancePanel.getByTestId('lab-performance-timeline-bar').first(),
    ).toBeVisible();
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
              if (child === bar) return false;
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
        if (!timeCell || !labelCell) return false;
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
  }

  expect(browserErrors).toEqual([]);
});
