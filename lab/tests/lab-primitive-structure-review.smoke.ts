import { expect, type Locator, type Page, test } from '@playwright/test';
import { openLabRoot, performancePanelFor } from './lab-smoke-utils.js';

/*
 * Regressions from review of the Structure tab (PR #96): popups that clip
 * or scroll their rows, tooltips that belong elsewhere, and a lost pointer
 * release.
 */

function slabs(panel: Locator, node: string, { ghost = false } = {}) {
  return panel
    .getByTestId('lab-primitive-structure-canvas')
    .locator(
      `[data-structure-node="${node}"]${ghost ? '[data-structure-ghost="true"]' : ':not([data-structure-ghost])'}`,
    );
}

async function topBox(group: Locator) {
  return group.locator('[data-structure-top]').first().boundingBox();
}

async function rowPaths(panel: Locator, node: string) {
  return slabs(panel, node).evaluateAll((groups) =>
    groups
      .map((group) =>
        group.querySelector('[data-structure-top]')?.getAttribute('d'),
      )
      .join('|'),
  );
}

async function openPage(page: Page, path: string, label: string) {
  await openLabRoot(page);
  await page.goto(path);
  const panel = performancePanelFor(page, label);
  await expect(
    panel.getByTestId('lab-primitive-structure-canvas'),
  ).toBeVisible();
  return panel;
}

test('draws only the visible rows of a scrolling popup, and follows its scroll', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop structure coverage');
  const panel = await openPage(page, '/lab/select', 'Select');
  const trigger = slabs(panel, 'select-trigger');
  await expect(trigger).toHaveCount(1);
  const closedTrigger = (await topBox(trigger))!;

  await page
    .locator('[data-lab-component-preview] [data-slot="dropdown-menu-trigger"]')
    .click();
  const rows = slabs(panel, 'active-option');
  await expect.poll(() => rows.count()).toBeGreaterThan(3);

  // The list holds ~100 options but shows a dozen or so; only those count,
  // so opening it does not shrink the figure.
  expect(await rows.count()).toBeLessThan(30);
  const openTrigger = (await topBox(trigger))!;
  expect(openTrigger.width).toBeGreaterThan(closedTrigger.width * 0.95);

  // Every row slab lies within the list's slab.
  const list = (await topBox(slabs(panel, 'select-content')))!;
  for (const row of await rows.all()) {
    const box = (await topBox(row))!;
    expect(box.x).toBeGreaterThanOrEqual(list.x - 1);
    expect(box.x + box.width).toBeLessThanOrEqual(list.x + list.width + 1);
  }

  // Scrolling the list moves its rows in the figure.
  const listbox = page.locator(
    '#' +
      (await page
        .locator(
          '[data-lab-component-preview] [data-slot="dropdown-menu-trigger"]',
        )
        .getAttribute('aria-controls')),
  );
  // Scroll the list itself (no pointer over it, so nothing but the scroll
  // can prompt a new measurement).
  await page.mouse.move(0, 0);
  await page.waitForTimeout(300);
  const before = await rowPaths(panel, 'active-option');
  const scrolled = await listbox.evaluate((popup) => {
    const scroller = [popup, ...popup.querySelectorAll('*')].find(
      (element) => element.scrollHeight > element.clientHeight + 4,
    );
    if (!scroller) return false;
    scroller.scrollTop += 600;
    return true;
  });
  expect(scrolled).toBe(true);
  await expect.poll(() => rowPaths(panel, 'active-option')).not.toBe(before);
  expect(await rows.count()).toBeLessThan(30);
});

test("shows only the preview trigger's own tooltip as its Content", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop structure coverage');
  const panel = await openPage(page, '/lab/tooltip', 'Tooltip');
  const content = slabs(panel, 'content');
  const contentGhost = slabs(panel, 'content', { ghost: true });
  await expect(contentGhost).toHaveCount(1);

  // A tooltip from another trigger opens near the preview: not ours.
  const otherTrigger = page
    .locator('[data-lab-component-preview] [data-slot="tooltip-trigger"]')
    .nth(1);
  await otherTrigger.hover();
  await expect(
    page.locator('[data-slot="tooltip-content"][data-open]'),
  ).toHaveCount(1);
  await page.waitForTimeout(300);
  await expect(content).toHaveCount(0);
  await expect(contentGhost).toHaveCount(1);

  // The preview's trigger: its popup becomes the Content layer.
  await page.mouse.move(0, 0);
  await page
    .locator('[data-lab-component-preview] [data-slot="tooltip-trigger"]')
    .first()
    .hover();
  await expect(content).toHaveCount(1);
});

test('a pointer release lost to a window blur does not freeze measuring', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop structure coverage');
  const panel = await openPage(page, '/lab/tabs', 'Tabs');
  const activeTab = slabs(panel, 'active-tab');
  await expect(activeTab).toHaveCount(1);
  const activeOrigin = () => activeTab.getAttribute('data-structure-origin');
  const tabs = page.locator(
    '[data-lab-component-preview] [data-slot="tabs-trigger"]',
  );

  // Selects a tab from the keyboard (no pointer release involved).
  const selectTab = async (index: number) => {
    await tabs.nth(index).focus();
    await page.keyboard.press('Enter');
    await expect(tabs.nth(index)).toHaveAttribute('aria-selected', 'true');
  };

  // A gesture starts, then the window loses focus before the release.
  await page.evaluate(() => {
    window.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, buttons: 1 }),
    );
    window.dispatchEvent(new Event('blur'));
  });
  const first = await activeOrigin();
  await selectTab(1);
  await expect.poll(activeOrigin).not.toBe(first);

  // Same when the release is lost without a blur: a buttonless move ends it.
  await page.evaluate(() => {
    window.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, buttons: 1 }),
    );
    window.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, buttons: 0 }),
    );
  });
  const second = await activeOrigin();
  await selectTab(2);
  await expect.poll(activeOrigin).not.toBe(second);
});

test('lists closed menu rows as not rendered, then measured once open', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop structure coverage');
  const panel = await openPage(page, '/lab/menu', 'Menu');
  const rowsEntry = panel.locator('[data-primitive-node="menu-items"]');

  await expect(rowsEntry).toContainText('not rendered');
  await expect(rowsEntry).not.toHaveAttribute('data-primitive-measured', /.+/);

  await page
    .locator('[data-lab-component-preview] [data-slot="dropdown-menu-trigger"]')
    .click();
  await expect(rowsEntry).not.toContainText('not rendered');
  await expect(rowsEntry).toHaveAttribute('data-primitive-measured', /\d+x\d+/);
});
