import { expect, test } from '@playwright/test';

const viewportByProject = {
  desktop: { width: 1375, height: 998 },
  mobile: { width: 390, height: 844 },
} as const;

test('keeps an expanded example footer scoped while its code scrolls', async ({
  page,
}, testInfo) => {
  const viewport =
    viewportByProject[testInfo.project.name as 'desktop' | 'mobile'];
  const scrollDocsTo = async (top: number) => {
    await page
      .locator('[data-docs-page-scroll]')
      .evaluate((container, nextTop) => {
        if (container.scrollHeight > container.clientHeight + 1) {
          container.scrollTo(0, nextTop);
        } else {
          window.scrollTo(0, nextTop);
        }
      }, top);
  };
  await page.setViewportSize(viewport);
  await page.goto('/docs/plane-examples');
  await page.addStyleTag({
    content: 'html { scroll-behavior: auto !important; }',
  });
  await expect(
    page.getByRole('heading', {
      name: 'Plane Examples',
      exact: true,
      level: 1,
    }),
  ).toBeVisible();

  const examples = page.locator('[data-docs-example]');
  const firstExample = examples.first();
  const secondExample = examples.nth(1);
  const firstCode = firstExample.locator('[data-docs-example-code]');
  const firstFooter = firstExample.locator('[data-docs-example-footer]');
  const firstToggle = firstFooter.locator('button[aria-controls]');

  await firstToggle.click();
  await expect(firstToggle).toHaveText('Hide code');
  const firstTop = await firstExample.evaluate((example) => {
    const container = document.querySelector<HTMLElement>(
      '[data-docs-page-scroll]',
    );
    const scrollTop =
      container && container.scrollHeight > container.clientHeight + 1
        ? container.scrollTop
        : window.scrollY;
    return example.getBoundingClientRect().top + scrollTop;
  });
  await scrollDocsTo(Math.max(0, firstTop - 20));

  const initialGeometry = await firstExample.evaluate((example) => {
    const source = example.querySelector<HTMLElement>(
      '[data-docs-example-source]',
    );
    const header = source?.firstElementChild as HTMLElement | null;
    const code = example.querySelector<HTMLElement>('[data-docs-example-code]');
    const footer = example.querySelector<HTMLElement>(
      '[data-docs-example-footer]',
    );
    if (!source || !header || !code || !footer) return null;

    return {
      codeBottom: code.getBoundingClientRect().bottom,
      footerBottom: footer.getBoundingClientRect().bottom,
      footerBorderTop: getComputedStyle(footer).borderTopWidth,
      footerPosition: getComputedStyle(footer).position,
      headerBorderBottom: getComputedStyle(header).borderBottomWidth,
      overflow: getComputedStyle(example).overflow,
      sourceBorderTop: getComputedStyle(source).borderTopWidth,
    };
  });
  expect(initialGeometry).not.toBeNull();
  expect(initialGeometry?.overflow).toBe('clip');
  expect(initialGeometry?.footerPosition).toBe('sticky');
  expect(initialGeometry?.footerBorderTop).toBe('0px');
  expect(initialGeometry?.sourceBorderTop).toBe('1px');
  expect(initialGeometry?.headerBorderBottom).toBe('1px');
  expect(initialGeometry?.codeBottom).toBeGreaterThan(viewport.height);
  expect(initialGeometry?.footerBottom).toBeCloseTo(viewport.height, 0);

  const firstBottom =
    firstTop +
    (await firstExample.evaluate(
      (example) => example.getBoundingClientRect().height,
    ));
  await scrollDocsTo(firstBottom - viewport.height + 80);

  const releasedGeometry = await firstExample.evaluate((example) => {
    const footer = example.querySelector<HTMLElement>(
      '[data-docs-example-footer]',
    );
    if (!footer) return null;
    return {
      exampleBottom: example.getBoundingClientRect().bottom,
      footerBottom: footer.getBoundingClientRect().bottom,
    };
  });
  expect(releasedGeometry).not.toBeNull();
  expect(releasedGeometry?.footerBottom).toBeLessThan(viewport.height - 20);
  expect(
    Math.abs(
      (releasedGeometry?.footerBottom ?? 0) -
        (releasedGeometry?.exampleBottom ?? 0),
    ),
  ).toBeLessThanOrEqual(2);

  await scrollDocsTo(firstBottom + 20);
  await expect(firstToggle).not.toBeInViewport();

  await secondExample.locator('button[aria-controls]').click();
  const secondTop = await secondExample.evaluate((example) => {
    const container = document.querySelector<HTMLElement>(
      '[data-docs-page-scroll]',
    );
    const scrollTop =
      container && container.scrollHeight > container.clientHeight + 1
        ? container.scrollTop
        : window.scrollY;
    return example.getBoundingClientRect().top + scrollTop;
  });
  await scrollDocsTo(secondTop - viewport.height / 2);

  const footerRects = await Promise.all([
    firstFooter.boundingBox(),
    secondExample.locator('[data-docs-example-footer]').boundingBox(),
  ]);
  const [firstRect, secondRect] = footerRects;
  expect(firstRect).not.toBeNull();
  expect(secondRect).not.toBeNull();
  const verticalOverlap = Math.max(
    0,
    Math.min(
      firstRect!.y + firstRect!.height,
      secondRect!.y + secondRect!.height,
    ) - Math.max(firstRect!.y, secondRect!.y),
  );
  expect(verticalOverlap).toBe(0);

  await scrollDocsTo(Math.max(0, firstTop - 20));
  await firstToggle.focus();
  await firstToggle.click();
  await expect(firstToggle).toBeFocused();
  await expect(firstToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(firstToggle).toHaveText('Show code');
  await expect(firstToggle).toBeInViewport();
  await expect(firstCode).toHaveCSS('overflow', 'hidden');
  expect(
    await firstCode.evaluate((code) => code.getBoundingClientRect().height),
  ).toBe(122);
});
