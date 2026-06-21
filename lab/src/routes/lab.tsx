import { useCallback, useEffect, useState } from 'react';
import {
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

function appendVisitedPage(
  pages: readonly LabPageKey[],
  page: LabPageKey,
): readonly LabPageKey[] {
  return pages.includes(page) ? pages : [...pages, page];
}

export function LabPage() {
  const [activePage, setActivePage] = useState<LabPageKey>('plane');
  const [visitedPages, setVisitedPages] = useState<readonly LabPageKey[]>([
    'plane',
  ]);

  useEffect(() => {
    const preloadPages = () => {
      void preloadLabPages(
        LAB_PAGE_NAVIGATION.map((page) => page.value).filter(
          (page) => page !== activePage,
        ),
      );
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

  const handlePageChange = (page: LabPageKey) => {
    void preloadLabPage(page);
    setActivePage(page);
    setVisitedPages((pages) => appendVisitedPage(pages, page));
  };

  const handlePagePreload = useCallback((page: LabPageKey) => {
    void preloadLabPage(page);
  }, []);

  return (
    <LabPageFrame
      activePage={activePage}
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
