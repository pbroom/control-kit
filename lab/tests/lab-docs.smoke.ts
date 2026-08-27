import { expect, test } from '@playwright/test';
import { collectBrowserErrors } from './lab-smoke-utils.js';

test('recovers after a transient documentation module failure', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');

  let moduleRequests = 0;
  await page.route('**/src/routes/docs/plane-docs-page.tsx*', async (route) => {
    moduleRequests += 1;

    if (moduleRequests === 1) {
      await route.abort('failed');
      return;
    }

    await route.continue();
  });

  await page.goto('/docs/plane');
  await page.getByRole('button', { name: 'Retry documentation' }).click();

  await expect(
    page.getByRole('heading', { name: 'Plane', exact: true, level: 1 }),
  ).toBeVisible();
  expect(moduleRequests).toBe(2);
});

test('routes between Plane docs and Lab without exposing tabs on undocumented pages', async ({
  page,
}, testInfo) => {
  const browserErrors = await collectBrowserErrors(page);

  await page.goto('/lab/plane');

  const pageViewTabs = page.getByRole('tablist', {
    name: 'Page view',
    exact: true,
  });
  const docsTab = pageViewTabs.getByRole('tab', {
    name: 'Docs',
    exact: true,
  });
  const labTab = pageViewTabs.getByRole('tab', {
    name: 'Lab',
    exact: true,
  });

  await expect(pageViewTabs).toBeVisible();
  await expect(docsTab).toHaveAttribute('href', '/docs/plane');
  await expect(labTab).toHaveAttribute('href', '/lab/plane');
  await expect(labTab).toHaveAttribute('aria-selected', 'true');

  const labHorizontalAxis = page.getByRole('slider', {
    name: 'Horizontal position',
    exact: true,
  });
  await labHorizontalAxis.focus();
  await labHorizontalAxis.press('ArrowRight');
  await expect(page.getByTestId('plane-demo-readout')).toContainText('X 0.51');

  await docsTab.click();
  await expect(page).toHaveURL(/\/docs\/plane$/);
  await expect(docsTab).toHaveAttribute('aria-selected', 'true');
  await expect(
    page.getByRole('heading', { name: 'Plane', exact: true, level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByText('A composable two-dimensional input', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'API reference', exact: true }),
  ).toBeVisible();
  await expect(page.locator('pre[data-language="tsx"]')).toHaveCount(4);
  await expect(
    page.getByRole('region', { name: 'Plane component props table' }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'PlaneThumb component props table' }),
  ).toBeVisible();

  const pressBehaviorProp = page.locator('summary#plane-pressbehavior');
  await expect(pressBehaviorProp).toContainText('pressBehavior');
  await expect(pressBehaviorProp).toContainText("'auto' | 'none' | 'nearest'");
  expect(
    await pressBehaviorProp
      .locator(':scope > span')
      .evaluateAll((cells) =>
        cells.slice(0, 3).map((cell) => getComputedStyle(cell).fontSize),
      ),
  ).toEqual(['14px', '14px', '14px']);

  const hoverValueProp = page.locator('summary#plane-onhovervaluechange');
  await expect(hoverValueProp).toContainText('onHoverValueChange');
  await hoverValueProp.click();
  await expect(
    page.getByText(
      'Called with the normalized position while a mouse or hovering pen moves over the plane, and null when it leaves.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByText('data-hovered', { exact: true })).toBeVisible();

  const valueProp = page.locator('summary#planethumb-value');
  await expect(valueProp).toContainText('value');
  await expect(valueProp).toContainText('PlaneValue');
  await valueProp.click();
  await expect(
    page.getByText('The controlled normalized position.', { exact: true }),
  ).toBeVisible();
  const propTableCodeSizes = await page
    .locator('section[aria-label$="component props table"] code')
    .evaluateAll((nodes) =>
      nodes.map((node) => getComputedStyle(node).fontSize),
    );
  expect(propTableCodeSizes.length).toBeGreaterThan(0);
  expect([...new Set(propTableCodeSizes)]).toEqual(['14px']);
  const proseInlineCodeWeights = await page
    .locator('article.prose :not(pre) > code')
    .evaluateAll((nodes) =>
      nodes.map((node) => getComputedStyle(node).fontWeight),
    );
  expect(proseInlineCodeWeights.length).toBeGreaterThan(0);
  expect([...new Set(proseInlineCodeWeights)]).toEqual(['400']);

  const largeStepProp = page.locator('summary#planethumb-largestep');
  await expect(largeStepProp).toContainText('largeStep');
  await expect(largeStepProp).toContainText('0.1');
  const smallStepProp = page.locator('summary#planethumb-smallstep');
  await expect(smallStepProp).toContainText('smallStep');
  await expect(smallStepProp).toContainText('0.001');
  await expect(page.locator('summary#planethumb-xname')).toContainText('xName');
  await expect(page.locator('summary#planethumb-yname')).toContainText('yName');
  await expect(page.locator('summary#planethumb-form')).toContainText('form');

  expect(
    await page
      .getByRole('heading', { name: 'API reference', exact: true })
      .evaluate((element) => {
        const styles = getComputedStyle(element);
        return [styles.borderTopWidth, styles.borderBottomWidth];
      }),
  ).toEqual(['0px', '0px']);
  await expect(page.locator('[data-docs-markdown] hr')).toHaveCount(0);
  const dataAttributeSpacing = await page
    .locator('article.prose strong')
    .evaluateAll((nodes) =>
      nodes
        .filter((node) => node.textContent?.trim() === 'Data attributes')
        .map((node) => {
          const heading = node.parentElement;
          const tableWrapper = heading?.nextElementSibling;
          const headerCell = tableWrapper?.querySelector('th');
          const precedingContent = heading?.previousElementSibling;
          if (!heading || !headerCell || !precedingContent) return null;
          const textRect = (element: Element) => {
            const range = document.createRange();
            range.selectNodeContents(element);
            return range.getBoundingClientRect();
          };
          const headingRect = textRect(node);
          return {
            precedingToHeading:
              headingRect.top - textRect(precedingContent).bottom,
            headingToHeader: textRect(headerCell).top - headingRect.bottom,
          };
        }),
    );
  expect(dataAttributeSpacing).toHaveLength(2);
  for (const spacing of dataAttributeSpacing) {
    expect(spacing).not.toBeNull();
    if (!spacing) continue;
    expect(spacing.headingToHeader).toBeLessThan(spacing.precedingToHeading);
    expect(spacing.headingToHeader).toBeGreaterThanOrEqual(16);
  }
  await expect(page.locator('[data-docs-demo="basic"]')).toBeVisible();
  await expect(page.locator('[data-lab-component-preview]')).toHaveCount(0);
  await expect(page.getByTestId('lab-panel-toggle-controls')).toHaveCount(0);
  await expect(page.locator('[data-lab-properties-panel]')).toHaveCount(0);

  const docsPlane = page.getByRole('group', {
    name: 'Normalized position',
    exact: true,
  });
  const docsThumb = docsPlane.locator('[data-slot="plane-thumb"]');
  await docsPlane.scrollIntoViewIfNeeded();
  await docsPlane
    .getByRole('slider', { name: 'Horizontal position', exact: true })
    .press('End');
  await docsPlane
    .getByRole('slider', { name: 'Vertical position', exact: true })
    .press('Home');

  expect(
    await docsPlane.evaluate((element) => {
      const styles = getComputedStyle(element);
      return [styles.overflowX, styles.overflowY];
    }),
  ).toEqual(['visible', 'visible']);

  const [planeBox, thumbBox] = await Promise.all([
    docsPlane.boundingBox(),
    docsThumb.boundingBox(),
  ]);
  expect(planeBox).not.toBeNull();
  expect(thumbBox).not.toBeNull();
  expect(thumbBox!.x + thumbBox!.width).toBeGreaterThan(
    planeBox!.x + planeBox!.width,
  );
  expect(thumbBox!.y + thumbBox!.height).toBeGreaterThan(
    planeBox!.y + planeBox!.height,
  );

  expect(
    await page
      .locator('[data-docs-page-scroll]')
      .evaluate((element) => element.scrollWidth - element.clientWidth),
  ).toBe(0);

  const multiPlane = page.getByRole('group', {
    name: 'Mesh control points',
    exact: true,
  });
  const multiThumbs = multiPlane.locator('[data-slot="plane-thumb"]');
  await multiPlane.scrollIntoViewIfNeeded();
  await expect(multiThumbs).toHaveCount(4);
  await expect(
    multiPlane.getByRole('slider', {
      name: 'Control point 1, horizontal position',
      exact: true,
    }),
  ).toBeAttached();
  await expect(
    multiPlane.getByRole('slider', {
      name: 'Control point 4, vertical position',
      exact: true,
    }),
  ).toBeAttached();

  const [multiPlaneBox, firstThumbStyle, secondThumbStyle] = await Promise.all([
    multiPlane.boundingBox(),
    multiThumbs.nth(0).getAttribute('style'),
    multiThumbs.nth(1).getAttribute('style'),
  ]);
  expect(multiPlaneBox).not.toBeNull();
  await page.mouse.click(
    multiPlaneBox!.x + multiPlaneBox!.width * 0.1,
    multiPlaneBox!.y + multiPlaneBox!.height * 0.1,
  );
  await expect(multiThumbs.nth(0)).not.toHaveAttribute(
    'style',
    firstThumbStyle!,
  );
  await expect(multiThumbs.nth(1)).toHaveAttribute('style', secondThumbStyle!);

  const firstHorizontalAxis = multiPlane.getByRole('slider', {
    name: 'Control point 1, horizontal position',
    exact: true,
  });
  const firstVerticalAxis = multiPlane.getByRole('slider', {
    name: 'Control point 1, vertical position',
    exact: true,
  });
  const secondHorizontalAxis = multiPlane.getByRole('slider', {
    name: 'Control point 2, horizontal position',
    exact: true,
  });
  await expect(firstHorizontalAxis).toBeFocused();
  await expect(multiThumbs.nth(0)).not.toHaveAttribute('data-focus-visible');
  await page.keyboard.press('Tab');
  await expect(firstHorizontalAxis).toBeFocused();
  await expect(multiThumbs.nth(0)).toHaveAttribute(
    'data-focus-visible',
    'true',
  );
  await page.keyboard.press('ArrowUp');
  await expect(firstVerticalAxis).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(secondHorizontalAxis).toBeFocused();

  if (testInfo.project.name === 'mobile') {
    const [headingBox, lastPageLinkBox] = await Promise.all([
      page.getByRole('heading', { name: 'Plane', level: 1 }).boundingBox(),
      page
        .getByRole('link', { name: 'Toggle Group', exact: true })
        .boundingBox(),
    ]);
    expect(headingBox).not.toBeNull();
    expect(lastPageLinkBox).not.toBeNull();
    expect(headingBox!.y).toBeGreaterThanOrEqual(
      lastPageLinkBox!.y + lastPageLinkBox!.height,
    );
  }

  await docsTab.press('ArrowRight');
  await expect(labTab).toBeFocused();
  await labTab.press('Enter');
  await expect(page).toHaveURL(/\/lab\/plane$/);
  await expect(labTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('plane-demo-readout')).toContainText('X 0.51');

  await page.goBack();
  await expect(page).toHaveURL(/\/docs\/plane$/);
  await expect(docsTab).toHaveAttribute('aria-selected', 'true');
  await page.goForward();
  await expect(page).toHaveURL(/\/lab\/plane$/);
  await expect(labTab).toHaveAttribute('aria-selected', 'true');

  await page.goto('/docs/color-plane');
  await expect(page).toHaveURL(/\/lab\/color-plane$/);
  await expect(page.getByRole('tablist', { name: 'Page view' })).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'ColorPlane', exact: true }),
  ).toHaveAttribute('aria-current', 'page');

  expect(browserErrors).toEqual([]);
});
