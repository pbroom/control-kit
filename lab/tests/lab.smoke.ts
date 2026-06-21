import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const LAB_PAGES = [
  {
    key: 'color-plane',
    label: 'ColorPlane',
    panelText: 'Drive the current sample color.',
  },
  {
    key: 'input-primitive',
    label: 'Input Primitive',
    panelText: 'Choose what appears inside the scrub handle.',
  },
  {
    key: 'input-multi',
    label: 'Input Multi',
    panelText: 'Configure the selected color channel input.',
  },
  {
    key: 'checkbox',
    label: 'Checkbox',
    panelText:
      'Preview the compact checkbox row used throughout the properties panel.',
  },
  {
    key: 'slider',
    label: 'Slider',
    panelText:
      'Preview one ColorSlider instance and tune its slider-specific props.',
  },
  {
    key: 'tooltip',
    label: 'Tooltip',
    panelText: 'Tune the Radix initial hover delay',
  },
  {
    key: 'menu',
    label: 'Menu',
    panelText:
      'Tune the three-item menu shown above the reusable menu preview.',
  },
  {
    key: 'select',
    label: 'Select',
    panelText: 'Preview the UI3 menu trigger state.',
  },
  {
    key: 'toggle-button',
    label: 'Toggle Button',
    panelText: 'Preview selection separately from interaction feedback.',
  },
  {
    key: 'toggle-group',
    label: 'Toggle Group',
    panelText: 'Preview the toggle group icon layout.',
  },
] as const;

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
    const navButton = page
      .locator('button[aria-pressed]')
      .filter({ hasText: labPage.label });

    if (index > 0) {
      await navButton.click();
    }

    await expect(navButton).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('aside')).toContainText(labPage.panelText);
    await page.screenshot({
      path: path.join(
        snapshotDir,
        `${String(index + 1).padStart(2, '0')}-${labPage.key}.png`,
      ),
      fullPage: true,
    });
  }

  expect(browserErrors).toEqual([]);
});
