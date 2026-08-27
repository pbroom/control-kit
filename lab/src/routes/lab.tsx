import { useCallback, useEffect, useState } from 'react';
import {
  LAB_PAGE_NAVIGATION,
  LazyActiveLabPage,
  preloadLabPage,
  preloadLabPages,
} from './lab/page-registry.js';
import {
  LazyDocsPage,
  hasDocsPage,
  preloadDocsPage,
} from './docs/docs-registry.js';
import {
  getPrimitivePagePath,
  type PrimitivePageView,
} from './lab/lab-page-runtime.js';
import { LabPageFrame, type LabPageKey } from './lab/shared.js';

type PreloadWindow = Window & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout: number },
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

type LabPageProps = {
  activePage: LabPageKey;
  onPageChange: (page: LabPageKey) => void;
  onViewChange: (view: PrimitivePageView) => void;
  view: PrimitivePageView;
};

function appendVisitedPage(
  pages: readonly LabPageKey[],
  page: LabPageKey,
): readonly LabPageKey[] {
  return pages.includes(page) ? pages : [...pages, page];
}

function ignorePreloadFailure(preloadPromise: Promise<unknown>) {
  void preloadPromise.catch(() => undefined);
}

export function LabPage({
  activePage,
  onPageChange,
  onViewChange,
  view,
}: LabPageProps) {
  const [visitedPages, setVisitedPages] = useState<readonly LabPageKey[]>(
    () => [activePage],
  );
  const renderedPages = appendVisitedPage(visitedPages, activePage);

  useEffect(() => {
    const preloadPages = () => {
      const inactivePages = LAB_PAGE_NAVIGATION.map(
        (page) => page.value,
      ).filter((page) => page !== activePage);

      ignorePreloadFailure(preloadLabPages(inactivePages));
    };
    const preloadWindow = window as PreloadWindow;

    if (preloadWindow.requestIdleCallback && preloadWindow.cancelIdleCallback) {
      const idleHandle = preloadWindow.requestIdleCallback(preloadPages, {
        timeout: 1500,
      });
      return () => preloadWindow.cancelIdleCallback?.(idleHandle);
    }

    const timeoutHandle = window.setTimeout(preloadPages, 150);
    return () => window.clearTimeout(timeoutHandle);
  }, [activePage]);

  useEffect(() => {
    setVisitedPages((pages) => appendVisitedPage(pages, activePage));
  }, [activePage]);

  const handlePageChange = useCallback(
    (page: LabPageKey) => {
      setVisitedPages((pages) => appendVisitedPage(pages, page));
      ignorePreloadFailure(preloadLabPage(page));
      onPageChange(page);
    },
    [onPageChange],
  );

  const handlePagePreload = useCallback((page: LabPageKey) => {
    ignorePreloadFailure(preloadLabPage(page));
    if (hasDocsPage(page)) ignorePreloadFailure(preloadDocsPage(page));
  }, []);
  const docsPage = hasDocsPage(activePage) ? activePage : null;

  return (
    <LabPageFrame
      activePage={activePage}
      getPageHref={(page) =>
        getPrimitivePagePath(
          page,
          view === 'docs' && hasDocsPage(page) ? 'docs' : 'lab',
        )
      }
      getViewHref={(nextView) => getPrimitivePagePath(activePage, nextView)}
      hasDocs={docsPage !== null}
      onPageChange={handlePageChange}
      onPagePreload={handlePagePreload}
      onViewChange={onViewChange}
      pages={LAB_PAGE_NAVIGATION}
      view={view}
      docs={docsPage ? <LazyDocsPage page={docsPage} /> : null}
    >
      {renderedPages.map((page) => (
        <LazyActiveLabPage
          key={page}
          activePage={page}
          isActive={page === activePage}
        />
      ))}
    </LabPageFrame>
  );
}
