import { expect, test } from '@playwright/test';
import {
  collectBrowserErrors,
  createSnapshotDir,
  LAB_PAGES,
  openLabRoot,
  performancePanelFor,
} from './lab-smoke-utils.js';

test('mirrors lab pages, routes, loading slots, and panel toggles', async ({
  page,
}, testInfo) => {
  const browserErrors = await collectBrowserErrors(page);
  const snapshotDir = await createSnapshotDir(testInfo);

  await openLabRoot(page);
  await expect(page.locator('.ck-lab-header-exit')).toHaveCount(0);

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
    const previewCrossfade = page.getByTestId('lab-preview-crossfade');
    const propertiesCrossfade = page.getByTestId('lab-properties-crossfade');
    await expect(previewCrossfade).toBeVisible();
    await expect(propertiesCrossfade).toBeVisible();
    await expect(
      previewCrossfade.locator('[data-lab-crossfade-phase="enter"]'),
    ).toHaveAttribute('data-lab-crossfade-key', labPage.value);
    await expect(
      propertiesCrossfade.locator('[data-lab-crossfade-phase="enter"]'),
    ).toHaveAttribute('data-lab-crossfade-key', labPage.value);
    await expect(
      page.getByRole('status', { name: 'Loading preview', exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('status', { name: 'Loading properties', exact: true }),
    ).toHaveCount(0);
    await expect(page.locator('aside')).toContainText(labPage.panelText);
    const performancePanel = performancePanelFor(page, labPage.label);
    await expect(performancePanel).toBeVisible();

    if (labPage.value === 'checkbox') {
      const previewCheckbox = page
        .locator('[data-lab-component-preview]')
        .getByRole('checkbox', {
          name: 'Checkbox',
          exact: true,
        });
      await expect(previewCheckbox).toBeVisible();
      const checkboxCursor = await previewCheckbox.evaluate((element) => {
        const label = element.querySelector('[data-slot="checkbox-label"]');

        return {
          label: label ? window.getComputedStyle(label).cursor : null,
          root: window.getComputedStyle(element).cursor,
        };
      });
      expect(checkboxCursor).toEqual({
        label: 'default',
        root: 'default',
      });
    }

    if (labPage.value === 'tabs') {
      const tabsStage = page.getByTestId('tabs-playground-stage');
      await expect(
        tabsStage.getByRole('tablist', { name: 'UI3 tabs', exact: true }),
      ).toBeVisible();
      await expect(
        tabsStage.getByRole('tab', { name: 'Layers', exact: true }),
      ).toHaveAttribute('aria-selected', 'true');
      await tabsStage.getByRole('tab', { name: 'Assets', exact: true }).click();
      await expect(
        tabsStage.getByRole('tab', { name: 'Assets', exact: true }),
      ).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByLabel('Tab label', { exact: true })).toBeVisible();
      await expect(
        page.getByRole('checkbox', { name: 'Leading icon', exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('checkbox', { name: 'Trailing icon', exact: true }),
      ).toBeVisible();
    }

    if (index === 0) {
      const panelToggleControls = page.getByTestId('lab-panel-toggle-controls');
      const propertiesToggle = page.getByTestId('lab-toggle-properties-panel');
      const performanceToggle = page.getByTestId(
        'lab-toggle-performance-panel',
      );
      const propertiesPanel = page.locator('[data-lab-properties-panel]');

      await expect(panelToggleControls).toBeVisible();
      await expect(propertiesToggle).toHaveAttribute('aria-pressed', 'true');
      await expect(performanceToggle).toHaveAttribute('aria-pressed', 'true');

      await performanceToggle.click();
      await expect(performancePanel).toHaveAttribute(
        'data-lab-performance-panel-collapsed',
        'true',
      );
      await expect(performanceToggle).toHaveAttribute('aria-pressed', 'false');
      await performanceToggle.click();
      await expect(performancePanel).toHaveAttribute(
        'data-lab-performance-panel-collapsed',
        'false',
      );
      await expect(performanceToggle).toHaveAttribute('aria-pressed', 'true');

      await propertiesToggle.click();
      await expect(propertiesPanel).toHaveAttribute(
        'data-lab-properties-panel-collapsed',
        'true',
      );
      await expect(propertiesToggle).toHaveAttribute('aria-pressed', 'false');
      await propertiesToggle.click();
      await expect(propertiesPanel).toHaveAttribute(
        'data-lab-properties-panel-collapsed',
        'false',
      );
      await expect(propertiesToggle).toHaveAttribute('aria-pressed', 'true');
    }

    await page.screenshot({
      path: `${snapshotDir}/${String(index + 1).padStart(2, '0')}-${labPage.slug}.png`,
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
