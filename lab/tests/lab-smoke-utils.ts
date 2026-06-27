import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import {
  expect,
  type Locator,
  type Page,
  type TestInfo,
} from '@playwright/test';
import { LAB_PAGE_NAVIGATION } from '../src/routes/lab/lab-page-runtime.js';

export const LAB_METRIC_ROW_ORDER_STORAGE_KEY =
  'control-kit:lab:performance-metric-row-order:v1';
export const DEFAULT_METRIC_ROW_ORDER = [
  'resources',
  'long-tasks',
  'fcp',
  'lcp',
  'cls',
  'inp',
  'fps',
  'loading',
];
export const DESKTOP_VIEWPORT = { height: 1000, width: 1440 };
export const COMPACT_DESKTOP_VIEWPORT = { height: 998, width: 1182 };
export const LAB_COLLAPSED_PANEL_HANDLE_HEIGHT = 32;

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

export const LAB_PAGES = LAB_PAGE_NAVIGATION.map((labPage) => ({
  ...labPage,
  panelText: LAB_PAGE_PANEL_TEXT[labPage.value],
}));

function isIgnoredConsoleError(message: string) {
  return (
    message === 'Failed to load resource: net::ERR_NETWORK_IO_SUSPENDED' ||
    message === 'Failed to load resource: net::ERR_SOCKET_NOT_CONNECTED'
  );
}

export async function collectBrowserErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error' && !isIgnoredConsoleError(message.text())) {
      errors.push(`console: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    errors.push(`pageerror: ${error.message}`);
  });

  return errors;
}

export async function createSnapshotDir(testInfo: TestInfo) {
  const snapshotDir = path.resolve(
    process.cwd(),
    'output/lab-parity-snapshots',
    testInfo.project.name,
  );

  await mkdir(snapshotDir, { recursive: true });
  return snapshotDir;
}

export function metricLabel(metricsTable: Locator, metricRowId: string) {
  return metricsTable.locator(
    `[data-metric-row-id="${metricRowId}"] [data-lab-performance-metric-label]`,
  );
}

export async function getMetricRowOrder(metricsTable: Locator) {
  return metricsTable.evaluate((table) =>
    Array.from(table.querySelectorAll('[data-lab-performance-metric-row]')).map(
      (row) => row.getAttribute('data-metric-row-id'),
    ),
  );
}

export function performancePanelFor(page: Page, label: string) {
  return page.getByRole('region', {
    name: `Performance analysis for ${label}`,
    exact: true,
  });
}

export function performanceMetricsTable(performancePanel: Locator) {
  return performancePanel.getByRole('table', {
    name: 'Performance metrics',
    exact: true,
  });
}

export async function selectPerformancePanelView(
  performancePanel: Locator,
  viewLabel: 'Metrics' | 'Structure',
) {
  const viewTab = performancePanel.getByRole('tab', {
    name: viewLabel,
    exact: true,
  });

  await expect(viewTab).toBeVisible();
  await viewTab.click();
  await expect(viewTab).toHaveAttribute('aria-selected', 'true');
  await expect(
    performancePanel.getByRole('tabpanel', {
      name: viewLabel,
      exact: true,
    }),
  ).toBeVisible();
  await performancePanel.evaluate(
    (node) =>
      new Promise<void>((resolve) => {
        let lastHeight = Number.NaN;
        let stableFrames = 0;
        const startTime = window.performance.now();

        const checkHeight = () => {
          const height = node.getBoundingClientRect().height;
          const isStable =
            Number.isFinite(lastHeight) && Math.abs(height - lastHeight) < 0.5;

          stableFrames = isStable ? stableFrames + 1 : 0;
          lastHeight = height;

          if (
            stableFrames >= 3 ||
            window.performance.now() - startTime > 1000
          ) {
            resolve();
            return;
          }

          window.requestAnimationFrame(checkHeight);
        };

        window.requestAnimationFrame(checkHeight);
      }),
  );
}

export async function openLabRoot(page: Page) {
  await page.goto('/');
  await expect(page).toHaveURL(/\/lab\/color-plane$/);
  await expect(
    page.locator('main').getByText('control-kit', { exact: true }),
  ).toBeVisible();
}
