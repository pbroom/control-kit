import { useCallback, useEffect, useState } from 'react';
import {
  getLabPagePath,
  LAB_PAGE_NAVIGATION,
  LazyActiveLabPage,
  preloadLabPage,
  preloadLabPages,
} from './lab/page-registry.js';
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

export function LabPage({ activePage, onPageChange }: LabPageProps) {
  const [visitedPages, setVisitedPages] = useState<readonly LabPageKey[]>(
    () => [activePage],
  );

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
      ignorePreloadFailure(preloadLabPage(page));
      onPageChange(page);
    },
    [onPageChange],
  );

  const handlePagePreload = useCallback((page: LabPageKey) => {
    ignorePreloadFailure(preloadLabPage(page));
  }, []);

  return (
    <LabPageFrame
      activePage={activePage}
      getPageHref={getLabPagePath}
      onPageChange={handlePageChange}
      onPagePreload={handlePagePreload}
      pages={LAB_PAGE_NAVIGATION}
    >
      {visitedPages.map((page) => (
        <LazyActiveLabPage
          key={page}
          activePage={page}
          isActive={page === activePage}
        />
      ))}
    </LabPageFrame>
  );
}
