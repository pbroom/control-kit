import LayoutAlignBottomIcon from '@hugeicons/core-free-icons/LayoutAlignBottomIcon';
import LayoutAlignRightIcon from '@hugeicons/core-free-icons/LayoutAlignRightIcon';
import LayoutBottomIcon from '@hugeicons/core-free-icons/LayoutBottomIcon';
import LayoutRightIcon from '@hugeicons/core-free-icons/LayoutRightIcon';
import {
  HugeiconsIcon,
  type IconSvgElement as HugeIconSvgElement,
} from '@hugeicons/react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@color-kit/control-kit';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThemeSwitcher } from '../../components/theme-switcher.js';
import {
  LabPageSlotProvider,
  useLabPageSlotContent,
} from './lab-page-slots.js';
import { LabPerformanceAnalysisPanel } from './performance-analysis.js';
import type { LabPageKey } from './shared.js';

const LAB_PANEL_SCROLL_AREA_CLASS =
  'ck-lab-properties-scroll-area h-full w-full min-w-0 max-w-full overflow-hidden [&>[data-radix-scroll-area-viewport]]:w-full [&>[data-radix-scroll-area-viewport]]:min-w-0 [&>[data-radix-scroll-area-viewport]]:max-w-full [&>[data-radix-scroll-area-viewport]]:overflow-x-hidden [&>[data-radix-scroll-area-viewport]>div]:!block [&>[data-radix-scroll-area-viewport]>div]:!w-full [&>[data-radix-scroll-area-viewport]>div]:!min-w-0 [&>[data-radix-scroll-area-viewport]>div]:!max-w-full';
const LAB_PAGE_CONTENT_CROSSFADE_MS = 72;

type LabPageCrossfadeItem = {
  content: ReactNode;
  id: number;
  key: LabPageKey;
};

function LabPageCrossfadeSlot({
  activePage,
  activeClassName,
  className = 'relative',
  exitingClassName,
  fallback,
  content,
  testId,
}: {
  activePage: LabPageKey;
  activeClassName: string;
  className?: string;
  exitingClassName: string;
  fallback: ReactNode;
  content: ReactNode;
  testId: string;
}) {
  const nextItemIdRef = useRef(1);
  const resolvedContent = content ?? fallback;
  const previousActiveItemRef = useRef<Pick<
    LabPageCrossfadeItem,
    'content' | 'key'
  > | null>(null);
  const [exitingItems, setExitingItems] = useState<
    readonly LabPageCrossfadeItem[]
  >([]);

  useLayoutEffect(() => {
    const previousActiveItem = previousActiveItemRef.current;

    if (previousActiveItem && previousActiveItem.key !== activePage) {
      setExitingItems((currentItems) => [
        ...currentItems,
        {
          ...previousActiveItem,
          id: nextItemIdRef.current,
        },
      ]);
      nextItemIdRef.current += 1;
    }

    previousActiveItemRef.current = {
      content: resolvedContent,
      key: activePage,
    };
  }, [activePage, resolvedContent]);

  useEffect(() => {
    if (exitingItems.length === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setExitingItems([]);
    }, LAB_PAGE_CONTENT_CROSSFADE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [exitingItems.length]);

  return (
    <div
      className={className}
      data-lab-crossfade-slot={testId}
      data-testid={testId}
    >
      {exitingItems.map((item, index) => (
        <div
          aria-hidden
          className={[
            exitingClassName,
            'ck-lab-page-crossfade-exit pointer-events-none',
          ]
            .filter(Boolean)
            .join(' ')}
          data-lab-crossfade-key={item.key}
          data-lab-crossfade-phase="exit"
          key={`${testId}-${item.key}-${item.id}-${index}`}
          style={
            {
              '--ck-lab-page-crossfade-duration': `${LAB_PAGE_CONTENT_CROSSFADE_MS}ms`,
            } as CSSProperties
          }
        >
          {item.content}
        </div>
      ))}
      <div
        className={[activeClassName, 'ck-lab-page-crossfade-enter']
          .filter(Boolean)
          .join(' ')}
        data-lab-crossfade-key={activePage}
        data-lab-crossfade-phase="enter"
        key={activePage}
        style={
          {
            '--ck-lab-page-crossfade-duration': `${LAB_PAGE_CONTENT_CROSSFADE_MS}ms`,
          } as CSSProperties
        }
      >
        {resolvedContent}
      </div>
    </div>
  );
}

function PagesPanel({
  activePage,
  getPageHref,
  onPageChange,
  onPagePreload,
  pages,
}: {
  activePage: LabPageKey;
  getPageHref: (page: LabPageKey) => string;
  onPageChange: (page: LabPageKey) => void;
  onPagePreload?: (page: LabPageKey) => void;
  pages: readonly LabPageNavigationItem[];
}) {
  return (
    <div className="absolute left-4 top-4 z-20 w-[190px]">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 items-center rounded-lg px-1 py-1 font-[var(--font-brand)] text-[15px] font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-[#5288db]">
          <span className="truncate">control-kit</span>
        </div>
        <div className="ml-auto [&_[data-slot=button]]:size-8 [&_[data-slot=button]]:min-h-8 [&_[data-slot=button]]:rounded-xl [&_[data-slot=button]]:text-white/65 [&_[data-slot=button]]:hover:bg-white/8 [&_[data-slot=button]]:hover:text-white">
          <ThemeSwitcher />
        </div>
      </div>
      <div className="mt-3 space-y-0.5">
        {pages.map((page) => {
          const isActive = activePage === page.value;
          return (
            <a
              key={page.value}
              href={getPageHref(page.value)}
              className="ck-lab-page-link flex w-full items-center rounded-lg px-1 py-1.5 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#5288db]"
              aria-current={isActive ? 'page' : undefined}
              onClick={(event) => {
                if (!shouldHandlePageLinkInApp(event)) {
                  return;
                }

                event.preventDefault();
                onPageChange(page.value);
              }}
              onFocus={() => onPagePreload?.(page.value)}
              onPointerEnter={() => onPagePreload?.(page.value)}
            >
              {page.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}

export type LabPageNavigationItem = {
  value: LabPageKey;
  label: string;
};

function shouldHandlePageLinkInApp(event: ReactMouseEvent<HTMLAnchorElement>) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.shiftKey
  );
}

export type LabPanelTooltipProviderProps = {
  delayDuration: number;
  skipDelayDuration: number;
};

export type LabPageFrameProps = {
  activePage: LabPageKey;
  getPageHref: (page: LabPageKey) => string;
  onPageChange: (page: LabPageKey) => void;
  onPagePreload?: (page: LabPageKey) => void;
  pages: readonly LabPageNavigationItem[];
  children: ReactNode;
};

function LabPagePreviewFallback() {
  return (
    <div
      role="status"
      aria-label="Loading preview"
      className="pointer-events-none flex h-[220px] w-[320px] max-w-[min(320px,calc(100vw-3rem))] items-center justify-center rounded-[18px] border border-white/8 bg-[#101010] shadow-[0_18px_45px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.04)]"
    >
      <div className="flex w-[72%] flex-col items-center gap-3">
        <div className="h-16 w-16 animate-pulse rounded-2xl bg-white/[0.08]" />
        <div className="h-2.5 w-full animate-pulse rounded-full bg-white/[0.08]" />
        <div className="h-2.5 w-2/3 animate-pulse rounded-full bg-white/[0.05]" />
      </div>
    </div>
  );
}

function LabPagePropertiesFallback() {
  return (
    <div role="status" aria-label="Loading properties" className="space-y-6">
      <section className="space-y-3">
        <div className="h-4 w-28 animate-pulse rounded-full bg-white/[0.12]" />
        <div className="space-y-2">
          <div className="h-2.5 w-full animate-pulse rounded-full bg-white/[0.07]" />
          <div className="h-2.5 w-4/5 animate-pulse rounded-full bg-white/[0.05]" />
        </div>
      </section>
      <section className="space-y-3">
        <div className="h-3 w-20 animate-pulse rounded-full bg-white/[0.08]" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-7 animate-pulse rounded-lg bg-white/[0.06]" />
          <div className="h-7 animate-pulse rounded-lg bg-white/[0.06]" />
        </div>
        <div className="h-8 animate-pulse rounded-lg bg-white/[0.06]" />
      </section>
      <section className="space-y-3 border-t border-white/8 pt-6">
        <div className="h-3 w-24 animate-pulse rounded-full bg-white/[0.08]" />
        <div className="space-y-2.5">
          <div className="h-4 w-3/4 animate-pulse rounded-full bg-white/[0.05]" />
          <div className="h-4 w-2/3 animate-pulse rounded-full bg-white/[0.05]" />
        </div>
      </section>
    </div>
  );
}

type LabPanelToggleButtonProps = {
  'aria-controls': string;
  icon: HugeIconSvgElement;
  isPressed: boolean;
  label: string;
  onClick: () => void;
  testId: string;
};

function LabPanelToggleButton({
  'aria-controls': ariaControls,
  icon: Icon,
  isPressed,
  label,
  onClick,
  testId,
}: LabPanelToggleButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-controls={ariaControls}
          aria-label={label}
          aria-pressed={isPressed}
          className={[
            'flex h-8 w-8 items-center justify-center rounded-[10px] border border-transparent bg-transparent outline-none transition-[background-color,border-color,color,box-shadow]',
            'hover:bg-white/[0.07] hover:text-white/88 focus-visible:ring-2 focus-visible:ring-[#5288db] active:bg-white/[0.10] active:text-white',
            isPressed ? 'text-white/92' : 'text-white/38 hover:text-white/62',
          ]
            .filter(Boolean)
            .join(' ')}
          data-testid={testId}
          onClick={onClick}
        >
          <HugeiconsIcon
            aria-hidden
            className="h-4 w-4"
            icon={Icon}
            size={16}
            strokeWidth={1.8}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="left">{label}</TooltipContent>
    </Tooltip>
  );
}

function LabPanelToggleControls({
  isPerformancePanelCollapsed,
  isPropertiesPanelCollapsed,
  onTogglePerformancePanel,
  onTogglePropertiesPanel,
}: {
  isPerformancePanelCollapsed: boolean;
  isPropertiesPanelCollapsed: boolean;
  onTogglePerformancePanel: () => void;
  onTogglePropertiesPanel: () => void;
}) {
  const PropertiesIcon = isPropertiesPanelCollapsed
    ? LayoutAlignRightIcon
    : LayoutRightIcon;
  const PerformanceIcon = isPerformancePanelCollapsed
    ? LayoutAlignBottomIcon
    : LayoutBottomIcon;

  return (
    <TooltipProvider delayDuration={350} skipDelayDuration={120}>
      <div
        aria-label="Panel visibility controls"
        className="pointer-events-auto absolute top-4 right-4 z-40 flex gap-2 lg:right-[calc(var(--lab-properties-panel-width)+0.75rem)]"
        data-testid="lab-panel-toggle-controls"
        role="toolbar"
      >
        <LabPanelToggleButton
          aria-controls="lab-performance-panel"
          icon={PerformanceIcon}
          isPressed={!isPerformancePanelCollapsed}
          label={
            isPerformancePanelCollapsed
              ? 'Show performance panel'
              : 'Hide performance panel'
          }
          onClick={onTogglePerformancePanel}
          testId="lab-toggle-performance-panel"
        />
        <LabPanelToggleButton
          aria-controls="lab-properties-panel"
          icon={PropertiesIcon}
          isPressed={!isPropertiesPanelCollapsed}
          label={
            isPropertiesPanelCollapsed
              ? 'Show properties panel'
              : 'Hide properties panel'
          }
          onClick={onTogglePropertiesPanel}
          testId="lab-toggle-properties-panel"
        />
      </div>
    </TooltipProvider>
  );
}

function LabPageFrameContent({
  activePage,
  getPageHref,
  onPageChange,
  onPagePreload,
  pages,
  children,
}: LabPageFrameProps) {
  const { panelTooltipProviderProps, preview, properties } =
    useLabPageSlotContent();
  const [isPropertiesPanelCollapsed, setIsPropertiesPanelCollapsed] =
    useState(false);
  const [isPerformancePanelCollapsed, setIsPerformancePanelCollapsed] =
    useState(false);
  const isLabPageLoading = preview === null;
  const togglePropertiesPanel = useCallback(() => {
    setIsPropertiesPanelCollapsed((isCollapsed) => !isCollapsed);
  }, []);
  const togglePerformancePanel = useCallback(() => {
    setIsPerformancePanelCollapsed((isCollapsed) => !isCollapsed);
  }, []);

  return (
    <div className="min-h-screen bg-[#171717] lg:overflow-hidden">
      <main
        className="min-h-screen min-w-0 bg-[#171717] [--ck-lab-segmented-active-bg:#171717] text-white lg:h-screen lg:overflow-hidden"
        style={
          {
            '--lab-properties-panel-width': isPropertiesPanelCollapsed
              ? '0px'
              : '300px',
          } as CSSProperties
        }
      >
        <div className="relative grid min-h-screen min-w-0 grid-cols-1 transition-[grid-template-columns] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] lg:h-full lg:grid-cols-[minmax(0,1fr)_var(--lab-properties-panel-width)]">
          <LabPanelToggleControls
            isPerformancePanelCollapsed={isPerformancePanelCollapsed}
            isPropertiesPanelCollapsed={isPropertiesPanelCollapsed}
            onTogglePerformancePanel={togglePerformancePanel}
            onTogglePropertiesPanel={togglePropertiesPanel}
          />
          <div
            className="flex min-h-[420px] min-w-0 flex-col lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:pb-3"
            data-lab-page-scroll
          >
            <section className="relative flex min-h-[420px] min-w-0 flex-1 items-center justify-center overflow-hidden px-6 py-10 lg:py-10">
              <PagesPanel
                activePage={activePage}
                getPageHref={getPageHref}
                onPageChange={onPageChange}
                onPagePreload={onPagePreload}
                pages={pages}
              />
              <div
                className="pointer-events-none absolute inset-0 flex min-w-0 items-center justify-center px-6 py-10"
                data-lab-component-preview
              >
                <LabPageCrossfadeSlot
                  activePage={activePage}
                  activeClassName="pointer-events-auto absolute inset-0 flex min-w-0 items-center justify-center"
                  className="relative h-full w-full min-w-0"
                  content={preview}
                  exitingClassName="absolute inset-0 flex min-w-0 items-center justify-center"
                  fallback={<LabPagePreviewFallback />}
                  testId="lab-preview-crossfade"
                />
              </div>
            </section>

            {/* Lab pages are eager; an empty slot here is only the layout-effect handoff. */}
            <LabPerformanceAnalysisPanel
              activePage={activePage}
              isCollapsed={isPerformancePanelCollapsed}
              isLoading={isLabPageLoading}
              onCollapsedChange={setIsPerformancePanelCollapsed}
            />
          </div>

          <aside
            aria-hidden={isPropertiesPanelCollapsed ? true : undefined}
            className={[
              'min-w-0 max-w-full overflow-hidden border-t border-white/8 p-3 transition-[max-height,opacity,padding,border-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] lg:h-full lg:min-h-0 lg:border-t-0 lg:py-4 lg:pr-4 lg:pl-0',
              isPropertiesPanelCollapsed
                ? 'max-h-0 border-transparent p-0 opacity-0 lg:max-h-none lg:pr-0'
                : 'max-h-none opacity-100',
            ]
              .filter(Boolean)
              .join(' ')}
            data-lab-properties-panel
            data-lab-properties-panel-collapsed={
              isPropertiesPanelCollapsed ? 'true' : 'false'
            }
            id="lab-properties-panel"
            inert={isPropertiesPanelCollapsed ? true : undefined}
          >
            <div className="h-full w-full min-w-0 max-w-full overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.03] [--ck-lab-segmented-active-bg:color-mix(in_srgb,#171717_97%,white_3%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur lg:min-h-0">
              <ScrollArea className={LAB_PANEL_SCROLL_AREA_CLASS}>
                <TooltipProvider
                  delayDuration={panelTooltipProviderProps.delayDuration}
                  skipDelayDuration={
                    panelTooltipProviderProps.skipDelayDuration
                  }
                >
                  <div className="w-full min-w-0 max-w-full overflow-x-hidden p-4">
                    <LabPageCrossfadeSlot
                      activePage={activePage}
                      activeClassName="w-full min-w-0 max-w-full space-y-6"
                      className="relative overflow-hidden"
                      content={properties}
                      exitingClassName="absolute inset-x-0 top-0 w-full min-w-0 max-w-full space-y-6"
                      fallback={<LabPagePropertiesFallback />}
                      testId="lab-properties-crossfade"
                    />
                  </div>
                </TooltipProvider>
              </ScrollArea>
            </div>
          </aside>
        </div>
      </main>
      {children}
    </div>
  );
}

export function LabPageFrame(props: LabPageFrameProps) {
  return (
    <LabPageSlotProvider>
      <LabPageFrameContent {...props} />
    </LabPageSlotProvider>
  );
}
