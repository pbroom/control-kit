import { useEffect, useState, type ComponentType } from 'react';
import type { LabPageKey } from '../lab/shared.js';

type DocsPageComponent = ComponentType;

const DOCS_PAGE_LOADERS = {
  checkbox: (loadAttempt: number) => {
    const modulePromise =
      loadAttempt === 0
        ? import('./checkbox-docs-page.js')
        : // A distinct module URL bypasses the browser's rejected-import cache.
          // @ts-expect-error Vite resolves query-suffixed local modules.
          import('./checkbox-docs-page.js?retry=1');

    return modulePromise.then((module) => ({
      default: module.CheckboxDocsPage,
    }));
  },
  colorPlane: (loadAttempt: number) => {
    const modulePromise =
      loadAttempt === 0
        ? import('./color-plane-docs-page.js')
        : // A distinct module URL bypasses the browser's rejected-import cache.
          // @ts-expect-error Vite resolves query-suffixed local modules.
          import('./color-plane-docs-page.js?retry=1');

    return modulePromise.then((module) => ({
      default: module.ColorPlaneDocsPage,
    }));
  },
  input: (loadAttempt: number) => {
    const modulePromise =
      loadAttempt === 0
        ? import('./input-docs-page.js')
        : // A distinct module URL bypasses the browser's rejected-import cache.
          // @ts-expect-error Vite resolves query-suffixed local modules.
          import('./input-docs-page.js?retry=1');

    return modulePromise.then((module) => ({
      default: module.InputDocsPage,
    }));
  },
  inputMulti: (loadAttempt: number) => {
    const modulePromise =
      loadAttempt === 0
        ? import('./input-multi-docs-page.js')
        : // A distinct module URL bypasses the browser's rejected-import cache.
          // @ts-expect-error Vite resolves query-suffixed local modules.
          import('./input-multi-docs-page.js?retry=1');

    return modulePromise.then((module) => ({
      default: module.InputMultiDocsPage,
    }));
  },
  plane: (loadAttempt: number) => {
    const modulePromise =
      loadAttempt === 0
        ? import('./plane-docs-page.js')
        : // A distinct module URL bypasses the browser's rejected-import cache.
          // @ts-expect-error Vite resolves query-suffixed local modules.
          import('./plane-docs-page.js?retry=1');

    return modulePromise.then((module) => ({
      default: module.PlaneDocsPage,
    }));
  },
  slider: (loadAttempt: number) => {
    const modulePromise =
      loadAttempt === 0
        ? import('./slider-docs-page.js')
        : // A distinct module URL bypasses the browser's rejected-import cache.
          // @ts-expect-error Vite resolves query-suffixed local modules.
          import('./slider-docs-page.js?retry=1');

    return modulePromise.then((module) => ({
      default: module.SliderDocsPage,
    }));
  },
  tabs: (loadAttempt: number) => {
    const modulePromise =
      loadAttempt === 0
        ? import('./tabs-docs-page.js')
        : // A distinct module URL bypasses the browser's rejected-import cache.
          // @ts-expect-error Vite resolves query-suffixed local modules.
          import('./tabs-docs-page.js?retry=1');

    return modulePromise.then((module) => ({
      default: module.TabsDocsPage,
    }));
  },
  toggle: (loadAttempt: number) => {
    const modulePromise =
      loadAttempt === 0
        ? import('./toggle-group-docs-page.js')
        : // A distinct module URL bypasses the browser's rejected-import cache.
          // @ts-expect-error Vite resolves query-suffixed local modules.
          import('./toggle-group-docs-page.js?retry=1');

    return modulePromise.then((module) => ({
      default: module.ToggleGroupDocsPage,
    }));
  },
  tooltip: (loadAttempt: number) => {
    const modulePromise =
      loadAttempt === 0
        ? import('./tooltip-docs-page.js')
        : // A distinct module URL bypasses the browser's rejected-import cache.
          // @ts-expect-error Vite resolves query-suffixed local modules.
          import('./tooltip-docs-page.js?retry=1');

    return modulePromise.then((module) => ({
      default: module.TooltipDocsPage,
    }));
  },
} satisfies Partial<
  Record<
    LabPageKey,
    (loadAttempt: number) => Promise<{ default: DocsPageComponent }>
  >
>;

export type DocsPageKey = keyof typeof DOCS_PAGE_LOADERS;

export function createRetryablePreloader<Module>(
  loader: (loadAttempt: number) => Promise<Module>,
) {
  let modulePromise: Promise<Module> | undefined;
  let loadAttempt = 0;

  return {
    clear() {
      modulePromise = undefined;
    },
    preload() {
      if (modulePromise) return modulePromise;

      const nextModulePromise = loader(loadAttempt).catch((error: unknown) => {
        if (modulePromise === nextModulePromise) {
          modulePromise = undefined;
          loadAttempt += 1;
        }
        throw error;
      });

      modulePromise = nextModulePromise;
      return nextModulePromise;
    },
  };
}

const DOCS_PAGE_PRELOADERS = Object.fromEntries(
  (Object.keys(DOCS_PAGE_LOADERS) as DocsPageKey[]).map((page) => [
    page,
    createRetryablePreloader(DOCS_PAGE_LOADERS[page]),
  ]),
) as Record<
  DocsPageKey,
  ReturnType<typeof createRetryablePreloader<{ default: DocsPageComponent }>>
>;

export function hasDocsPage(page: LabPageKey): page is DocsPageKey {
  return Object.hasOwn(DOCS_PAGE_LOADERS, page);
}

export function preloadDocsPage(page: DocsPageKey) {
  return DOCS_PAGE_PRELOADERS[page].preload();
}

function DocsPageFallback() {
  return (
    <div
      aria-label="Loading documentation"
      className="mx-auto flex min-h-[240px] w-full max-w-[760px] items-center justify-center text-sm text-white/45"
      role="status"
    >
      Loading documentation…
    </div>
  );
}

function DocsPageLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="mx-auto flex min-h-[240px] w-full max-w-[760px] flex-col items-center justify-center gap-3 text-center"
      role="alert"
    >
      <p className="text-sm text-white/60">Documentation failed to load.</p>
      <button
        className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        onClick={onRetry}
        type="button"
      >
        Retry documentation
      </button>
    </div>
  );
}

type DocsPageLoadState =
  | { page: DocsPageKey; status: 'loading' }
  | { page: DocsPageKey; status: 'error' }
  | {
      page: DocsPageKey;
      status: 'ready';
      component: DocsPageComponent;
    };

export function LazyDocsPage({ page }: { page: DocsPageKey }) {
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadState, setLoadState] = useState<DocsPageLoadState>({
    page,
    status: 'loading',
  });

  useEffect(() => {
    let isCurrent = true;

    setLoadState({ page, status: 'loading' });
    void preloadDocsPage(page).then(
      ({ default: component }) => {
        if (isCurrent) setLoadState({ page, status: 'ready', component });
      },
      () => {
        if (isCurrent) setLoadState({ page, status: 'error' });
      },
    );

    return () => {
      isCurrent = false;
    };
  }, [loadAttempt, page]);

  if (loadState.page !== page || loadState.status === 'loading') {
    return <DocsPageFallback />;
  }

  if (loadState.status === 'error') {
    return (
      <DocsPageLoadError
        onRetry={() => {
          DOCS_PAGE_PRELOADERS[page].clear();
          setLoadAttempt((attempt) => attempt + 1);
        }}
      />
    );
  }

  const DocsPage = loadState.component;

  return <DocsPage />;
}
