import { expect, test } from '@playwright/test';
import { collectBrowserErrors } from './lab-smoke-utils.js';

const FOCUSED_PLANE_EXAMPLE_TITLES = [
  'Saturation × brightness/value',
  'Color grading controls — Circular controls (3-way color adjuster)',
  'Background-position',
  'Gradient center/origin',
  'Pattern/texture offset',
  'Drop-shadow offset',
  'Image crop focal point',
  'Anchor point inside a container',
  'Variable-font axis pairs, e.g. weight × width',
  'Tracking × line-height',
  'Bezier control-point editor',
  'Spring stiffness × damping',
  'Motion direction/intensity',
  'Force direction and magnitude',
  'Gravity vector',
  'Joystick/game controls',
  'Fluid-flow direction',
  'Particle emitter direction/spread',
  'XY synth pads',
  'Filter cutoff × resonance',
  'Timbre morphing between parameters',
  'Spatial-audio source positioning',
  'Color curves control',
  'Choosing an interpolation point between four states',
  'Familiar ↔ novel × safe ↔ adventurous',
  'Border radius × border width',
  'Elevation × blur',
  'Noise scale × intensity',
  'Minimap viewport position',
  'Canvas pan',
  'Relative position within a floor plan',
  'Light direction',
  'Camera orbit: azimuth × elevation',
  'Pitch × yaw',
  'Importance × urgency',
  'Literal ↔ creative × concise ↔ detailed',
] as const;

test('renders the focused Plane examples with executable source', async ({
  page,
}) => {
  const browserErrors = await collectBrowserErrors(page);

  await page.goto('/lab/plane-examples');
  await expect(page).toHaveURL(/\/docs\/plane-examples$/);

  await page.goto('/lab/plane');
  await page
    .getByRole('navigation', { name: 'Lab pages' })
    .getByRole('link', { name: 'Plane Examples', exact: true })
    .click();
  await expect(page).toHaveURL(/\/docs\/plane-examples$/);

  await page.goto('/docs/plane-examples');

  await expect(page).toHaveURL(/\/docs\/plane-examples$/);
  await expect(
    page.getByRole('heading', {
      name: 'Plane Examples',
      exact: true,
      level: 1,
    }),
  ).toBeVisible();

  const navigation = page.getByRole('navigation', { name: 'Lab pages' });
  await expect(
    navigation.getByRole('link', { name: 'Plane Examples', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  const navigationSections = await navigation.locator('h2').allTextContents();
  expect(navigationSections.indexOf('Examples')).toBeLessThan(
    navigationSections.indexOf('Primitives'),
  );

  const gallery = page.locator('[data-plane-examples-gallery]');
  await expect(gallery).toHaveAttribute('data-plane-examples-count', '36');
  await expect(gallery.locator('h3')).toHaveText(FOCUSED_PLANE_EXAMPLE_TITLES);
  await expect(gallery.locator('[data-docs-example]')).toHaveCount(36);
  expect(
    await gallery
      .locator('[data-docs-example]')
      .evaluateAll((examples) =>
        examples.every((example) =>
          example.querySelector('[data-slot="plane"]'),
        ),
      ),
  ).toBe(true);
  expect(
    await gallery.locator('[data-slot="plane"]').evaluateAll((planes) =>
      planes.every((plane) =>
        getComputedStyle(plane)
          .backgroundOrigin.split(',')
          .every((origin) => origin.trim() === 'border-box'),
      ),
    ),
  ).toBe(true);
  await expect(gallery.locator('[data-docs-example-source]')).toHaveCount(36);
  await expect(
    gallery.getByRole('button', { name: 'Show code', exact: true }),
  ).toHaveCount(36);

  const firstExample = gallery.locator('[data-docs-example]').first();
  const firstPlane = firstExample.locator('[data-slot="plane"]');
  const firstThumb = firstExample.locator('[data-slot="plane-thumb"]');
  const firstReadout = firstExample.locator('output');
  const firstAxis = firstExample.getByRole('slider').first();
  const initialAxisValue = await firstAxis.inputValue();

  await expect(firstReadout).toHaveText(/^S \d+% V \d+%$/);
  expect(
    await firstReadout.evaluate(
      (readout) => getComputedStyle(readout).fontFamily,
    ),
  ).toBe(
    await page
      .locator('body')
      .evaluate((body) => getComputedStyle(body).fontFamily),
  );

  await firstAxis.focus();
  await firstAxis.press('ArrowRight');
  await expect(firstAxis).not.toHaveValue(initialAxisValue);
  await firstAxis.press('End');
  await expect(firstAxis).toHaveValue('1');
  expect(
    await firstPlane.evaluate((plane) => getComputedStyle(plane).overflow),
  ).toBe('visible');

  const planeBounds = await firstPlane.boundingBox();
  const thumbBounds = await firstThumb.boundingBox();
  expect(planeBounds).not.toBeNull();
  expect(thumbBounds).not.toBeNull();
  expect(thumbBounds!.x + thumbBounds!.width).toBeGreaterThan(
    planeBounds!.x + planeBounds!.width,
  );

  const threeWayExample = gallery.getByRole('figure', {
    name: 'Color grading controls — Circular controls (3-way color adjuster) demo',
    exact: true,
  });
  const colorBalance = threeWayExample.getByRole('region', {
    name: 'Color balance control',
    exact: true,
  });
  const toneControls = colorBalance.locator('[data-tone-control]');
  const toneLabels = colorBalance.locator('[data-tone-label]');
  const toneSliders = colorBalance.locator('[data-tone-slider]');

  await expect(toneControls).toHaveCount(3);
  await expect(toneLabels).toHaveText(['Highlights', 'Midtones', 'Shadows']);
  expect(
    await toneLabels.evaluateAll((labels) =>
      labels.map((label) => getComputedStyle(label).fontSize),
    ),
  ).toEqual(['13px', '13px', '13px']);
  await expect(toneSliders).toHaveCount(6);
  expect(
    await toneSliders.evaluateAll((sliders) =>
      sliders.every(
        (slider) =>
          slider instanceof HTMLInputElement &&
          slider.type === 'range' &&
          slider.getAttribute('aria-orientation') === 'horizontal',
      ),
    ),
  ).toBe(true);

  const saturationTracks = colorBalance.locator(
    '[data-tone-slider-track="saturation"]',
  );
  const luminanceTracks = colorBalance.locator(
    '[data-tone-slider-track="luminance"]',
  );
  await expect(saturationTracks).toHaveCount(3);
  await expect(luminanceTracks).toHaveCount(3);

  const initialSaturationBackgrounds = await saturationTracks.evaluateAll(
    (tracks) => tracks.map((track) => getComputedStyle(track).backgroundImage),
  );
  expect(initialSaturationBackgrounds[0]).not.toBe(
    initialSaturationBackgrounds[2],
  );
  expect(initialSaturationBackgrounds[1]).toBe(
    'linear-gradient(to right, rgb(75, 75, 75), rgb(112, 112, 112))',
  );
  expect(
    await luminanceTracks.evaluateAll((tracks) =>
      tracks.every(
        (track) =>
          getComputedStyle(track).backgroundImage ===
          'linear-gradient(to right, rgb(17, 17, 17), rgb(242, 242, 242))',
      ),
    ),
  ).toBe(true);

  const midtonesSaturationTrack = saturationTracks.nth(1);
  const initialMidtonesSaturationBackground =
    await midtonesSaturationTrack.evaluate(
      (track) => getComputedStyle(track).backgroundImage,
    );
  await colorBalance
    .getByRole('slider', {
      name: 'Midtones cyan to red balance',
      exact: true,
    })
    .press('End');
  await expect
    .poll(() =>
      midtonesSaturationTrack.evaluate(
        (track) => getComputedStyle(track).backgroundImage,
      ),
    )
    .toBe('linear-gradient(to right, rgb(75, 75, 75), rgb(91, 91, 190))');
  expect(
    await midtonesSaturationTrack.evaluate(
      (track) => getComputedStyle(track).backgroundImage,
    ),
  ).not.toBe(initialMidtonesSaturationBackground);

  const toneLayout = await toneControls.evaluateAll((controls) =>
    controls.map((control) => {
      const bounds = control.getBoundingClientRect();
      const plane = control
        .querySelector('[data-slot="plane"]')!
        .getBoundingClientRect();
      const sliders = Array.from(
        control.querySelectorAll('[data-tone-slider]'),
        (slider) => slider.getBoundingClientRect(),
      );

      return {
        bottom: bounds.bottom,
        left: bounds.left,
        top: bounds.top,
        planeBottom: plane.bottom,
        sliderTops: sliders.map((slider) => slider.top),
      };
    }),
  );
  expect(Math.max(...toneLayout.map(({ top }) => top))).toBeLessThanOrEqual(
    Math.min(...toneLayout.map(({ top }) => top)) + 1,
  );
  expect(toneLayout[0]!.left).toBeLessThan(toneLayout[1]!.left);
  expect(toneLayout[1]!.left).toBeLessThan(toneLayout[2]!.left);
  for (const tone of toneLayout) {
    expect(tone.sliderTops[0]).toBeGreaterThanOrEqual(tone.planeBottom);
    expect(tone.sliderTops[1]).toBeGreaterThan(tone.sliderTops[0]!);
    expect(tone.bottom).toBeGreaterThan(tone.sliderTops[1]!);
  }

  const midtonesLuminance = colorBalance.getByRole('slider', {
    name: 'Midtones luminance',
    exact: true,
  });
  await midtonesLuminance.press('End');
  await expect(midtonesLuminance).toHaveValue('100');
  await expect(colorBalance.locator('output')).toContainText(
    /Midtones \d+, saturation \d+, luminance 100/,
  );

  const firstCodeToggle = firstExample.getByRole('button', {
    name: 'Show code',
    exact: true,
  });
  await firstCodeToggle.click();
  await expect(
    firstExample.getByRole('button', { name: 'Hide code', exact: true }),
  ).toBeVisible();
  await expect(firstExample.locator('[data-docs-example-code]')).toContainText(
    '<Plane',
  );
  await expect(firstExample.locator('[data-docs-example-code]')).toContainText(
    'PlaneThumb',
  );

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(browserErrors).toEqual([]);
});

test('provides responsive on-page navigation for documentation headings', async ({
  page,
}, testInfo) => {
  const browserErrors = await collectBrowserErrors(page);

  await page.goto('/docs/plane');
  await expect(
    page.getByRole('heading', { name: 'Plane', exact: true, level: 1 }),
  ).toBeVisible();

  const outline = page.getByRole('navigation', { name: 'On this page' });

  if (testInfo.project.name === 'mobile') {
    await expect(outline).toBeHidden();
    expect(browserErrors).toEqual([]);
    return;
  }

  await expect(outline).toBeVisible();
  const outlineTitle = page
    .locator('[data-docs-on-this-page]')
    .getByText('On this page', { exact: true });
  const guideTitle = outline.getByText('Guide', { exact: true });
  await expect(guideTitle).toBeVisible();
  await expect(outline.getByText('API', { exact: true })).toBeVisible();
  expect(
    Math.abs(
      (await outlineTitle.boundingBox())!.x -
        (await guideTitle.boundingBox())!.x,
    ),
  ).toBeLessThan(0.5);
  await expect(
    outline.getByRole('link', { name: 'Anatomy', exact: true }),
  ).toBeVisible();
  await expect(
    outline.getByRole('link', { name: 'API reference', exact: true }),
  ).toBeVisible();
  await expect(
    outline.getByRole('link', { name: 'PlaneThumb', exact: true }),
  ).toHaveAttribute('data-depth', '3');
  await expect(
    outline
      .locator('[data-docs-outline-group="api"]')
      .getByRole('link', { name: 'API reference', exact: true }),
  ).toBeVisible();

  const primaryNavigation = page.getByRole('navigation', {
    name: 'Lab pages',
  });
  const primaryActiveLink = primaryNavigation.getByRole('link', {
    name: 'Plane',
    exact: true,
  });
  const primaryInactiveLink = primaryNavigation.getByRole('link', {
    name: 'Input Multi',
    exact: true,
  });
  const outlineActiveLink = outline.getByRole('link', {
    name: 'Anatomy',
    exact: true,
  });
  const outlineInactiveLink = outline.getByRole('link', {
    name: 'Usage guidelines',
    exact: true,
  });
  const linkStyle = (element: Element) => {
    const styles = getComputedStyle(element);
    return [styles.backgroundColor, styles.color, styles.fontWeight];
  };

  expect(await outlineActiveLink.evaluate(linkStyle)).toEqual(
    await primaryActiveLink.evaluate(linkStyle),
  );
  expect(await outlineInactiveLink.evaluate(linkStyle)).toEqual(
    await primaryInactiveLink.evaluate(linkStyle),
  );
  await outlineInactiveLink.hover();
  await page.waitForTimeout(200);
  const outlineHoverStyle = await outlineInactiveLink.evaluate(linkStyle);
  await primaryInactiveLink.hover();
  await page.waitForTimeout(200);
  expect(outlineHoverStyle).toEqual(
    await primaryInactiveLink.evaluate(linkStyle),
  );

  const apiReferenceLink = outline.getByRole('link', {
    name: 'API reference',
    exact: true,
  });
  await apiReferenceLink.click();
  await expect(page).toHaveURL(/\/docs\/plane#api-reference$/);
  await expect(apiReferenceLink).toHaveAttribute('aria-current', 'location');
  expect(
    await page.evaluate(() => {
      const scrollRoot = document.querySelector<HTMLElement>(
        '[data-docs-page-scroll]',
      );
      const heading = document.querySelector<HTMLElement>('#api-reference');
      if (!scrollRoot || !heading) return false;

      const rootRect = scrollRoot.getBoundingClientRect();
      const headingRect = heading.getBoundingClientRect();
      return (
        headingRect.top >= rootRect.top && headingRect.top < rootRect.bottom
      );
    }),
  ).toBe(true);
  expect(browserErrors).toEqual([]);
});

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

test('routes between Plane docs and Lab and exposes tabs only on documented pages', async ({
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

  const labPanel = page.locator('[data-lab-properties-panel]');
  const labPanelTitle = labPanel.getByRole('heading', {
    name: 'Plane',
    exact: true,
  });
  const labPanelDescription = labPanel.getByText(
    'Move a normalized 2D position with pointer or keyboard input.',
    { exact: true },
  );
  const labPanelTypeset = labPanel.locator('.typeset-lab');
  await expect(labPanelTypeset).toContainText('Plane');
  await expect(labPanelTypeset).toContainText(
    'Move a normalized 2D position with pointer or keyboard input.',
  );
  expect(
    await labPanelTitle.evaluate((element) => {
      const styles = getComputedStyle(element);
      return [
        styles.fontSize,
        styles.lineHeight,
        styles.fontWeight,
        styles.letterSpacing,
      ];
    }),
  ).toEqual(['14px', '20px', '500', '-0.35px']);
  expect(
    await labPanelDescription.evaluate((element) => {
      const styles = getComputedStyle(element);
      return [styles.fontSize, styles.lineHeight, styles.marginBlockStart];
    }),
  ).toEqual(['12px', '19.5px', '4px']);

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
  const docsArticle = page.locator('article.typeset.typeset-docs');
  await expect(docsArticle).toHaveCount(1);
  await expect(docsArticle).not.toHaveClass(/\bprose\b/);
  const docsTypography = await docsArticle.evaluate((article) => {
    const h1 = article.querySelector('h1');
    const h2 = article.querySelector('h2');
    const paragraph = article.querySelector('p');
    if (!h1 || !h2 || !paragraph) return null;

    const articleStyles = getComputedStyle(article);
    const headingStyles = getComputedStyle(h1);
    const sectionStyles = getComputedStyle(h2);
    const paragraphStyles = getComputedStyle(paragraph);
    return {
      articleFontSize: articleStyles.fontSize,
      headingFontFamily: headingStyles.fontFamily,
      headingFontSize: headingStyles.fontSize,
      paragraphLineHeight: paragraphStyles.lineHeight,
      sectionFontSize: sectionStyles.fontSize,
      sectionLineHeight: sectionStyles.lineHeight,
    };
  });
  expect(docsTypography).not.toBeNull();
  expect(docsTypography?.articleFontSize).toBe('16px');
  expect(docsTypography?.headingFontFamily).toContain('DM Sans');
  expect(docsTypography?.headingFontSize).toBe(
    testInfo.project.name === 'mobile' ? '32px' : '43.2px',
  );
  expect(docsTypography?.paragraphLineHeight).toBe('28px');
  expect(docsTypography?.sectionFontSize).toBe('21.12px');
  expect(docsTypography?.sectionLineHeight).toBe('25.344px');
  await expect(
    page.getByRole('heading', { name: 'API reference', exact: true }),
  ).toBeVisible();
  await expect(page.locator('pre[data-language="tsx"]')).toHaveCount(5);
  const codeBlocks = page.locator('[data-docs-code-block]');
  const copyButtons = page.getByRole('button', {
    name: 'Copy code',
    exact: true,
  });
  await expect(codeBlocks).toHaveCount(5);
  await expect(copyButtons).toHaveCount(5);
  expect(
    await codeBlocks.evaluateAll((blocks) =>
      blocks.every((block) => block.classList.contains('not-typeset')),
    ),
  ).toBe(true);
  const exampleSources = page.locator('[data-docs-example-source]');
  const exampleToggles = page.getByRole('button', {
    name: 'Show code',
    exact: true,
  });
  await expect(exampleSources).toHaveCount(2);
  await expect(exampleToggles).toHaveCount(2);
  const firstExampleSource = exampleSources.first();
  const firstExampleCode = firstExampleSource.locator(
    '[data-docs-example-code]',
  );
  const firstExampleToggle = firstExampleSource.locator(
    'button[aria-controls]',
  );
  await expect(firstExampleCode).toHaveAttribute('aria-hidden', 'true');
  expect(
    await firstExampleCode.evaluate((element) => {
      const styles = getComputedStyle(element);
      return {
        height: element.getBoundingClientRect().height,
        overflow: styles.overflow,
      };
    }),
  ).toEqual({ height: 122, overflow: 'hidden' });
  await firstExampleToggle.focus();
  await firstExampleToggle.press('Enter');
  await expect(firstExampleToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(firstExampleToggle).toHaveText('Hide code');
  await expect(firstExampleCode).toHaveAttribute('aria-hidden', 'false');
  expect(
    await firstExampleCode.evaluate(
      (element) => element.getBoundingClientRect().height,
    ),
  ).toBeGreaterThan(122);
  await expect(
    page.getByRole('button', { name: 'Hide code', exact: true }),
  ).toBeVisible();

  const anatomyCodeBlock = codeBlocks.nth(1);
  const anatomyCopyButton = copyButtons.nth(1);
  expect(
    await anatomyCodeBlock
      .locator('pre')
      .evaluate((element) =>
        parseFloat(getComputedStyle(element).paddingRight),
      ),
  ).toBeGreaterThanOrEqual(48);

  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await anatomyCopyButton.click();
  await expect(
    page.getByRole('button', { name: 'Copied code', exact: true }),
  ).toBeVisible();
  await expect(anatomyCodeBlock.getByRole('status')).toHaveText(
    'Code copied to clipboard.',
  );
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    `import { Plane, PlaneThumb } from '@color-kit/control-kit';

<Plane aria-label="Position">
  <PlaneThumb defaultValue={{ x: 0.5, y: 0.5 }} />
</Plane>;`,
  );
  await expect(anatomyCopyButton).toBeFocused();
  await expect(
    page.getByRole('region', { name: 'Plane component props table' }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'PlaneThumb component props table' }),
  ).toBeVisible();
  expect(
    await page
      .locator('section[aria-label$="component props table"]')
      .evaluateAll((tables) =>
        tables.every((table) => table.classList.contains('not-typeset')),
      ),
  ).toBe(true);

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
  await hoverValueProp.focus();
  await hoverValueProp.press('Enter');
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
  await valueProp.focus();
  await valueProp.press('Enter');
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
    .locator('article.typeset-docs :not(pre) > code')
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
    .locator('article.typeset-docs strong')
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
  const basicDocsDemo = page.locator('[data-docs-demo="basic"]');
  await expect(basicDocsDemo).toBeVisible();
  await expect(basicDocsDemo).toHaveClass(/not-typeset/);
  const markdownTables = page.locator('.docs-markdown-table');
  expect(await markdownTables.count()).toBeGreaterThan(0);
  expect(
    await markdownTables.evaluateAll((tables) =>
      tables.every((table) => table.classList.contains('typeset-scroll')),
    ),
  ).toBe(true);
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

  const nearestPointPressToggle = page.getByRole('checkbox', {
    name: 'Press empty space to move the nearest point.',
    exact: true,
  });
  await expect(nearestPointPressToggle).toBeChecked();

  if (testInfo.project.name === 'desktop') {
    const [multiPlaneBox, thumbStyles] = await Promise.all([
      multiPlane.boundingBox(),
      multiThumbs.evaluateAll((thumbs) =>
        thumbs.map((thumb) => thumb.getAttribute('style')),
      ),
    ]);
    expect(multiPlaneBox).not.toBeNull();
    expect(thumbStyles).toHaveLength(4);
    expect(thumbStyles).not.toContain(null);

    await nearestPointPressToggle.click();
    await expect(nearestPointPressToggle).not.toBeChecked();
    await page.mouse.move(
      multiPlaneBox!.x + multiPlaneBox!.width * 0.1,
      multiPlaneBox!.y + multiPlaneBox!.height * 0.1,
    );
    await page.mouse.down();
    await page.mouse.up();
    for (const [index, style] of thumbStyles.entries()) {
      await expect(multiThumbs.nth(index)).toHaveAttribute('style', style!);
    }

    await nearestPointPressToggle.click();
    await expect(nearestPointPressToggle).toBeChecked();
    await page.mouse.move(
      multiPlaneBox!.x + multiPlaneBox!.width * 0.1,
      multiPlaneBox!.y + multiPlaneBox!.height * 0.1,
    );
    await page.mouse.down();
    await page.mouse.up();
    await expect(multiThumbs.nth(0)).not.toHaveAttribute(
      'style',
      thumbStyles[0]!,
    );
    for (const [index, style] of thumbStyles.entries()) {
      if (index === 0) continue;
      await expect(multiThumbs.nth(index)).toHaveAttribute('style', style!);
    }

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
  }

  if (testInfo.project.name === 'mobile') {
    await page.evaluate(() => {
      window.scrollTo({ top: 0 });
      document.scrollingElement?.scrollTo({ top: 0 });
    });
    const [headingBox, lastPageLinkBox] = await Promise.all([
      page.getByRole('heading', { name: 'Plane', level: 1 }).boundingBox(),
      page
        .getByRole('link', { name: 'Toggle Group', exact: true })
        .boundingBox(),
    ]);
    expect(headingBox).not.toBeNull();
    expect(lastPageLinkBox).not.toBeNull();
    expect(headingBox!.y + 8).toBeGreaterThanOrEqual(
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
  await expect(page).toHaveURL(/\/docs\/color-plane$/);
  await expect(page.getByRole('tablist', { name: 'Page view' })).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Lab pages' })
      .getByRole('link', { name: 'ColorPlane', exact: true }),
  ).toHaveAttribute('aria-current', 'page');

  await page.goto('/docs/checkbox');
  await expect(page).toHaveURL(/\/docs\/checkbox$/);
  await expect(page.getByRole('tablist', { name: 'Page view' })).toBeVisible();

  await page.goto('/docs/menu');
  await expect(page).toHaveURL(/\/docs\/menu$/);
  await expect(page.getByRole('tablist', { name: 'Page view' })).toBeVisible();

  expect(browserErrors).toEqual([]);
});

test('renders and exercises the documented primitive and component pages', async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  test.skip(testInfo.project.name !== 'desktop');
  const browserErrors = await collectBrowserErrors(page);
  const pages = [
    {
      slug: 'checkbox',
      heading: 'Checkbox',
      lab: '/lab/checkbox',
      apiHeading: 'API reference',
      exampleCount: 4,
      format: 'component',
    },
    {
      slug: 'color-plane',
      heading: 'ColorPlane',
      lab: '/lab/color-plane',
      apiHeading: 'API reference',
      exampleCount: 4,
      format: 'component',
    },
    {
      slug: 'control-field',
      heading: 'Control Field',
      lab: '/lab/control-field',
      apiHeading: 'API reference',
      exampleCount: 6,
      format: 'component',
    },
    {
      slug: 'input-primitive',
      heading: 'Input Primitive',
      lab: '/lab/input-primitive',
      apiHeading: 'API reference',
      exampleCount: 1,
      format: 'primitive',
    },
    {
      slug: 'input-multi',
      heading: 'Input Multi',
      lab: '/lab/input-multi',
      apiHeading: 'API reference',
      exampleCount: 1,
      format: 'primitive',
    },
    {
      slug: 'menu',
      heading: 'Menu',
      lab: '/lab/menu',
      apiHeading: 'API reference',
      exampleCount: 4,
      format: 'component',
    },
    {
      slug: 'select',
      heading: 'Select',
      lab: '/lab/select',
      apiHeading: 'API reference',
      exampleCount: 4,
      format: 'component',
    },
    {
      slug: 'slider',
      heading: 'Slider',
      lab: '/lab/slider',
      apiHeading: 'API reference',
      exampleCount: 5,
      format: 'component',
    },
    {
      slug: 'tabs',
      heading: 'Tabs',
      lab: '/lab/tabs',
      apiHeading: 'API reference',
      exampleCount: 4,
      format: 'component',
    },
    {
      slug: 'toggle-button',
      heading: 'Toggle Button',
      lab: '/lab/toggle-button',
      apiHeading: 'API reference',
      exampleCount: 4,
      format: 'component',
    },
    {
      slug: 'toggle-group',
      heading: 'Toggle Group',
      lab: '/lab/toggle-group',
      apiHeading: 'API reference',
      exampleCount: 5,
      format: 'component',
    },
    {
      slug: 'tooltip',
      heading: 'Tooltip',
      lab: '/lab/tooltip',
      apiHeading: 'API reference',
      exampleCount: 5,
      format: 'component',
    },
  ] as const;

  for (const docsPage of pages) {
    await page.goto(`/docs/${docsPage.slug}`);
    await expect(page).toHaveURL(new RegExp(`/docs/${docsPage.slug}$`));
    await expect(
      page.getByRole('heading', {
        name: docsPage.heading,
        exact: true,
        level: 1,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', {
        name: docsPage.apiHeading,
        exact: true,
      }),
    ).toBeVisible();
    const isComponentDocs = docsPage.format === 'component';
    await expect(
      page.getByRole('heading', { name: 'Installation', exact: true }),
    ).toHaveCount(isComponentDocs ? 1 : 0);
    await expect(
      page.getByRole('heading', { name: 'Manual', exact: true }),
    ).toHaveCount(isComponentDocs ? 1 : 0);
    if (isComponentDocs) {
      const propTables = page.locator(
        'section[aria-label$="component props table"]',
      );
      expect(await propTables.count()).toBeGreaterThan(0);

      const firstProp = propTables.first().locator('summary').first();
      await firstProp.focus();
      await firstProp.press('Enter');
      const firstDetails = firstProp.locator('xpath=..');
      await expect(firstDetails).toHaveAttribute('open', '');
      await expect(
        firstDetails.getByText('Description', { exact: true }),
      ).toBeVisible();
      await expect(
        firstDetails.getByText('Type', { exact: true }),
      ).toBeVisible();
    }
    await expect(page.locator('[data-docs-example]')).toHaveCount(
      docsPage.exampleCount,
    );
    await expect(
      page.getByRole('button', { name: 'Show code', exact: true }),
    ).toHaveCount(docsPage.exampleCount);
    await expect(
      page
        .getByRole('tablist', { name: 'Page view', exact: true })
        .getByRole('tab', { name: 'Lab', exact: true }),
    ).toHaveAttribute('href', docsPage.lab);
  }

  await page.goto('/docs/color-plane');
  const colorThumb = page
    .getByLabel('Color plane demo', { exact: true })
    .getByRole('slider', { name: 'Lightness and chroma', exact: true });
  const initialColorX = await colorThumb.getAttribute('data-x');
  await colorThumb.press('ArrowRight');
  await expect(colorThumb).not.toHaveAttribute('data-x', initialColorX!);

  await page.goto('/docs/checkbox');
  const checkbox = page.getByRole('checkbox', { name: 'Show grid' });
  await expect(checkbox).toHaveAttribute('aria-checked', 'false');
  await checkbox.click();
  await expect(checkbox).toHaveAttribute('aria-checked', 'true');

  await page.goto('/docs/input-primitive');
  const primitiveInput = page.getByRole('spinbutton', { name: 'Opacity' });
  await primitiveInput.fill('55');
  await primitiveInput.press('Enter');
  await expect(primitiveInput).toHaveValue('55');

  await page.goto('/docs/control-field');
  const controlFieldDemo = page.getByLabel('Control Field demo', {
    exact: true,
  });
  const controlFieldGroup = controlFieldDemo.locator(
    '[data-slot="control-field-group"]',
  );
  const controlFieldInput = controlFieldDemo.locator(
    '[data-slot="control-field-input"]',
  );
  const controlFieldScrubArea = controlFieldDemo.locator(
    '[data-slot="control-field-scrub-area"]',
  );
  await expect(controlFieldScrubArea).toBeVisible();
  await expect(
    controlFieldDemo.locator('[data-slot="control-field-affix"]'),
  ).toHaveText('%');
  await expect(controlFieldDemo.getByRole('button')).toHaveCount(0);
  await expect(controlFieldGroup).toHaveCSS('height', '24px');
  await expect(controlFieldGroup).toHaveCSS('width', '128px');
  const scrubBounds = await controlFieldScrubArea.boundingBox();
  expect(scrubBounds).not.toBeNull();
  await page.mouse.move(
    scrubBounds!.x + scrubBounds!.width / 2,
    scrubBounds!.y + scrubBounds!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    scrubBounds!.x + scrubBounds!.width + 24,
    scrubBounds!.y,
    {
      steps: 4,
    },
  );
  await page.mouse.up();
  await expect(controlFieldInput).not.toHaveValue('42');
  await page.reload();
  const resetControlFieldInput = page
    .getByLabel('Control Field demo', { exact: true })
    .locator('[data-slot="control-field-input"]');
  await resetControlFieldInput.fill('* 2');
  await resetControlFieldInput.press('Enter');
  await expect(resetControlFieldInput).toHaveValue('84');

  await page.goto('/docs/input-multi');
  const multiInput = page.getByRole('spinbutton', {
    name: 'Horizontal position',
  });
  await multiInput.focus();
  await multiInput.press('ArrowUp');
  await expect(multiInput).toHaveValue('51');

  await page.goto('/docs/slider');
  const slider = page.getByRole('slider', { name: 'Lightness slider' });
  const initialSliderValue = await slider.getAttribute('aria-valuenow');
  await slider.press('ArrowRight');
  await expect(slider).not.toHaveAttribute(
    'aria-valuenow',
    initialSliderValue!,
  );

  await page.goto('/docs/tabs');
  const tabsDemo = page.getByLabel('Tabs demo', { exact: true });
  await tabsDemo.getByRole('tab', { name: 'Export', exact: true }).click();
  await expect(
    tabsDemo.getByRole('tabpanel', { name: 'Export', exact: true }),
  ).toContainText('output format');

  await page.goto('/docs/select');
  const selectDemo = page.getByLabel('Select demo', { exact: true });
  const selectTrigger = selectDemo.getByRole('button', {
    name: 'Medium',
    exact: true,
  });
  await selectTrigger.click();
  await page.getByRole('menuitemradio', { name: 'Large' }).click();
  await expect(
    selectDemo.getByRole('button', { name: 'Large', exact: true }),
  ).toBeVisible();

  await page.goto('/docs/menu');
  const menuDemo = page.getByLabel('Menu demo', { exact: true });
  const menuTrigger = menuDemo.getByRole('button', {
    name: 'Menu actions',
  });
  await menuTrigger.click();
  await page.getByRole('menuitem', { name: /Group selection/ }).click();
  await expect(menuTrigger).toHaveAccessibleName('Menu actions');
  await expect(
    page.getByRole('menuitem', { name: /Group selection/ }),
  ).toBeHidden();

  await page.goto('/docs/toggle-button');
  const toggleButtonDemo = page.getByLabel('Toggle button demo', {
    exact: true,
  });
  const favoriteToggle = toggleButtonDemo.getByRole('button', {
    name: 'Favorite',
    exact: true,
  });
  await expect(favoriteToggle).toHaveAttribute('aria-pressed', 'false');
  await favoriteToggle.click();
  await expect(favoriteToggle).toHaveAttribute('aria-pressed', 'true');

  await page.goto('/docs/toggle-group');
  const toggleGroupDemo = page.getByLabel('Toggle group demo', {
    exact: true,
  });
  const listToggle = toggleGroupDemo.getByRole('button', {
    name: 'List',
    exact: true,
  });
  await listToggle.click();
  await expect(listToggle).toHaveAttribute('aria-pressed', 'true');

  await page.goto('/docs/tooltip');
  await page
    .getByLabel('Tooltip demo', { exact: true })
    .getByRole('button', { name: 'Settings', exact: true })
    .focus();
  await expect(
    page
      .locator('[data-slot="tooltip-content"]')
      .filter({ hasText: 'Settings' }),
  ).toBeVisible();

  expect(browserErrors).toEqual([]);
});
