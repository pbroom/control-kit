import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { Tabs, TabsList, TabsTrigger, type LabPageKey } from './shared.js';
import { LAB_PERFORMANCE_ANALYSIS } from './performance-analysis/config.js';
import { LabMetricTable } from './performance-analysis/metrics-table.js';
import {
  clampPerformancePanelHeight,
  clampPerformancePanelOpenHeight,
  getPerformancePanelCollapseProgress,
  getPerformancePanelDragHeight,
  LAB_PERFORMANCE_PANEL_COLLAPSED_HEIGHT,
  LAB_PERFORMANCE_PANEL_DEFAULT_HEIGHT,
  LAB_PERFORMANCE_PANEL_HANDLE_HIT_AREA,
  LAB_PERFORMANCE_PANEL_MIN_HEIGHT,
  LAB_PERFORMANCE_PANEL_RESIZE_STEP,
  LAB_PERFORMANCE_PANEL_SURFACE_PADDING_BOTTOM,
  LAB_PERFORMANCE_PANEL_SURFACE_PADDING_TOP,
  LAB_PERFORMANCE_PANEL_VERTICAL_PADDING,
} from './performance-analysis/panel-sizing.js';
import { LabPrimitiveStructureView } from './performance-analysis/primitive-structure.js';
import { LabPerformanceTimeline } from './performance-analysis/timeline.js';
import {
  suppressAnalysisSurfaceLayoutShifts,
  useLabPerformanceTelemetry,
} from './performance-analysis/telemetry.js';
import type { LabPerformancePanelStyle } from './performance-analysis/types.js';

const LAB_PERFORMANCE_PANEL_SCROLLBAR_ACTIVE_MS = 700;
const LAB_PERFORMANCE_PANEL_SCROLLBAR_REVEAL_ZONE_PX = 24;
const LAB_PERFORMANCE_PANEL_TAB_FIT_SUPPRESSION_MS = 260;
const LAB_PERFORMANCE_PANEL_HELD_MAX_RELEASE_MS = 500;
const LAB_PERFORMANCE_PANEL_DEFAULT_VIEW_CONTROLS_HEIGHT = 40;

type LabPerformancePanelView = 'metrics' | 'structure';

const LAB_PERFORMANCE_PANEL_VIEWS: Array<{
  label: string;
  value: LabPerformancePanelView;
}> = [
  { value: 'structure', label: 'Structure' },
  { value: 'metrics', label: 'Metrics' },
];

export function LabPerformanceAnalysisPanel({
  activePage,
  isCollapsed,
  isLoading,
  onCollapsedChange,
}: {
  activePage: LabPageKey;
  isCollapsed?: boolean;
  isLoading: boolean;
  onCollapsedChange?: (isCollapsed: boolean) => void;
}) {
  const analysis = LAB_PERFORMANCE_ANALYSIS[activePage];
  const [panelHeight, setPanelHeight] = useState(
    LAB_PERFORMANCE_PANEL_DEFAULT_HEIGHT,
  );
  const [panelMaxHeight, setPanelMaxHeight] = useState(
    LAB_PERFORMANCE_PANEL_DEFAULT_HEIGHT,
  );
  const [isResizingPanel, setIsResizingPanel] = useState(false);
  const [isPanelScrollbarActive, setIsPanelScrollbarActive] = useState(false);
  const [isPanelScrollbarRailHovered, setIsPanelScrollbarRailHovered] =
    useState(false);
  const [panelViewControlsHeight, setPanelViewControlsHeight] = useState(
    LAB_PERFORMANCE_PANEL_DEFAULT_VIEW_CONTROLS_HEIGHT,
  );
  const [arePanelHeightTransitionsReady, setArePanelHeightTransitionsReady] =
    useState(false);
  const [activePanelView, setActivePanelView] =
    useState<LabPerformancePanelView>('structure');
  const contentRef = useRef<HTMLDivElement | null>(null);
  const panelHeightRef = useRef(panelHeight);
  const panelMaxHeightRef = useRef(panelMaxHeight);
  const intendedPanelMaxHeightRef = useRef(panelMaxHeight);
  const heldPanelMaxHeightRef = useRef<number | null>(null);
  const previousPanelViewRef = useRef(activePanelView);
  const userSizedPanelRef = useRef(false);
  const isPanelPointerInsideRef = useRef(false);
  const panelScrollbarIdleTimerRef = useRef<number | null>(null);
  const panelTabFitSuppressionTimerRef = useRef<number | null>(null);
  const heldPanelMaxHeightReleaseTimerRef = useRef<number | null>(null);
  const panelViewFitTimerRef = useRef<number | null>(null);
  const isPanelTabFitSuppressedRef = useRef(false);
  const resizeCleanupRef = useRef<(() => void) | null>(null);
  const resizeStateRef = useRef<{
    lastHeight: number;
    startHeight: number;
    startedCollapsed: boolean;
    startY: number;
  } | null>(null);
  const { vitals, timeline, timelineTimeMs } = useLabPerformanceTelemetry(
    activePage,
    isLoading,
  );

  useEffect(() => {
    panelHeightRef.current = panelHeight;
  }, [panelHeight]);

  useEffect(() => {
    panelMaxHeightRef.current = panelMaxHeight;
  }, [panelMaxHeight]);

  useLayoutEffect(() => {
    if (isCollapsed === undefined) {
      return;
    }

    if (isCollapsed) {
      if (resizeStateRef.current) {
        return;
      }

      suppressAnalysisSurfaceLayoutShifts();
      userSizedPanelRef.current = true;
      setPanelHeight(LAB_PERFORMANCE_PANEL_COLLAPSED_HEIGHT);
      return;
    }

    if (panelHeightRef.current > LAB_PERFORMANCE_PANEL_COLLAPSED_HEIGHT) {
      return;
    }

    suppressAnalysisSurfaceLayoutShifts();
    userSizedPanelRef.current = true;
    setPanelHeight(panelMaxHeightRef.current);
  }, [activePage, isCollapsed]);

  const startPanelResize = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      suppressAnalysisSurfaceLayoutShifts();
      userSizedPanelRef.current = true;
      resizeCleanupRef.current?.();
      const startHeight = clampPerformancePanelHeight(
        panelHeightRef.current,
        panelMaxHeightRef.current,
      );
      const resizeHandle = event.currentTarget;
      const pointerId = event.pointerId;
      let resizeAnimationFrame = 0;
      const previousCursor = document.body.style.cursor;
      const previousUserSelect = document.body.style.userSelect;
      let isCleanedUp = false;

      const cleanupPanelResize = () => {
        if (isCleanedUp) {
          return;
        }

        isCleanedUp = true;
        cancelAnimationFrame(resizeAnimationFrame);
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousUserSelect;
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', stopPanelResize);
        window.removeEventListener('pointercancel', stopPanelResize);

        if (resizeHandle.hasPointerCapture(pointerId)) {
          resizeHandle.releasePointerCapture(pointerId);
        }

        if (resizeCleanupRef.current === cleanupPanelResize) {
          resizeCleanupRef.current = null;
        }
      };

      const handlePointerMove = (event: PointerEvent) => {
        const resizeState = resizeStateRef.current;

        if (!resizeState) {
          return;
        }

        const nextHeight = getPerformancePanelDragHeight(
          resizeState.startHeight + resizeState.startY - event.clientY,
          panelMaxHeightRef.current,
        );

        resizeState.lastHeight = nextHeight;
        suppressAnalysisSurfaceLayoutShifts();
        cancelAnimationFrame(resizeAnimationFrame);
        resizeAnimationFrame = requestAnimationFrame(() => {
          setPanelHeight(nextHeight);
        });
      };

      const stopPanelResize = () => {
        suppressAnalysisSurfaceLayoutShifts();
        cancelAnimationFrame(resizeAnimationFrame);
        const lastHeight =
          resizeStateRef.current?.lastHeight ?? panelHeightRef.current;
        const startedCollapsed =
          resizeStateRef.current?.startedCollapsed ?? false;
        const nextHeight =
          startedCollapsed &&
          lastHeight > LAB_PERFORMANCE_PANEL_COLLAPSED_HEIGHT
            ? panelMaxHeightRef.current
            : lastHeight < LAB_PERFORMANCE_PANEL_MIN_HEIGHT
              ? LAB_PERFORMANCE_PANEL_COLLAPSED_HEIGHT
              : clampPerformancePanelOpenHeight(
                  lastHeight,
                  panelMaxHeightRef.current,
                );
        resizeStateRef.current = null;
        onCollapsedChange?.(
          nextHeight <= LAB_PERFORMANCE_PANEL_COLLAPSED_HEIGHT,
        );
        setPanelHeight(nextHeight);
        setIsResizingPanel(false);
        cleanupPanelResize();
      };

      resizeHandle.setPointerCapture(pointerId);
      resizeStateRef.current = {
        lastHeight: startHeight,
        startHeight,
        startedCollapsed: startHeight <= LAB_PERFORMANCE_PANEL_COLLAPSED_HEIGHT,
        startY: event.clientY,
      };
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', stopPanelResize);
      window.addEventListener('pointercancel', stopPanelResize);
      resizeCleanupRef.current = cleanupPanelResize;
      setIsResizingPanel(true);
    },
    [onCollapsedChange],
  );

  const resizePanelWithKeyboard = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const step = event.shiftKey
        ? LAB_PERFORMANCE_PANEL_RESIZE_STEP * 3
        : LAB_PERFORMANCE_PANEL_RESIZE_STEP;

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        suppressAnalysisSurfaceLayoutShifts();
        userSizedPanelRef.current = true;
        const nextHeight = clampPerformancePanelOpenHeight(
          panelHeightRef.current + step,
          panelMaxHeight,
        );
        onCollapsedChange?.(
          nextHeight <= LAB_PERFORMANCE_PANEL_COLLAPSED_HEIGHT,
        );
        setPanelHeight(nextHeight);
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        suppressAnalysisSurfaceLayoutShifts();
        userSizedPanelRef.current = true;
        const clampedHeight = clampPerformancePanelHeight(
          panelHeightRef.current - step,
          panelMaxHeight,
        );
        const nextHeight =
          clampedHeight < LAB_PERFORMANCE_PANEL_MIN_HEIGHT
            ? LAB_PERFORMANCE_PANEL_COLLAPSED_HEIGHT
            : clampedHeight;
        onCollapsedChange?.(
          nextHeight <= LAB_PERFORMANCE_PANEL_COLLAPSED_HEIGHT,
        );
        setPanelHeight(nextHeight);
        return;
      }

      if (event.key === 'Home') {
        event.preventDefault();
        suppressAnalysisSurfaceLayoutShifts();
        userSizedPanelRef.current = true;
        onCollapsedChange?.(true);
        setPanelHeight(LAB_PERFORMANCE_PANEL_COLLAPSED_HEIGHT);
        return;
      }

      if (event.key === 'End') {
        event.preventDefault();
        suppressAnalysisSurfaceLayoutShifts();
        userSizedPanelRef.current = true;
        onCollapsedChange?.(false);
        setPanelHeight(panelMaxHeight);
      }
    },
    [onCollapsedChange, panelMaxHeight],
  );

  const togglePanelWithDoubleClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const currentHeight = clampPerformancePanelHeight(
        panelHeightRef.current,
        panelMaxHeightRef.current,
      );
      const maxHeight = panelMaxHeightRef.current;
      const isFullHeight = Math.abs(currentHeight - maxHeight) <= 1;

      suppressAnalysisSurfaceLayoutShifts();
      userSizedPanelRef.current = true;
      resizeStateRef.current = null;
      resizeCleanupRef.current?.();
      setIsResizingPanel(false);
      const nextHeight = isFullHeight
        ? LAB_PERFORMANCE_PANEL_COLLAPSED_HEIGHT
        : maxHeight;
      onCollapsedChange?.(nextHeight <= LAB_PERFORMANCE_PANEL_COLLAPSED_HEIGHT);
      setPanelHeight(nextHeight);
    },
    [onCollapsedChange],
  );

  const showPanelScrollbar = useCallback(() => {
    if (panelScrollbarIdleTimerRef.current !== null) {
      window.clearTimeout(panelScrollbarIdleTimerRef.current);
    }

    setIsPanelScrollbarActive(true);
    panelScrollbarIdleTimerRef.current = window.setTimeout(() => {
      panelScrollbarIdleTimerRef.current = null;
      setIsPanelScrollbarActive(false);
    }, LAB_PERFORMANCE_PANEL_SCROLLBAR_ACTIVE_MS);
  }, []);

  const syncPanelScrollbarRailHover = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const distanceFromRightEdge = rect.right - event.clientX;

      setIsPanelScrollbarRailHovered(
        distanceFromRightEdge >= 0 &&
          distanceFromRightEdge <=
            LAB_PERFORMANCE_PANEL_SCROLLBAR_REVEAL_ZONE_PX,
      );
    },
    [],
  );

  const hidePanelScrollbarRailHover = useCallback(() => {
    setIsPanelScrollbarRailHovered(false);
  }, []);

  const suppressPanelFitForTabSwitch = useCallback(() => {
    if (panelTabFitSuppressionTimerRef.current !== null) {
      window.clearTimeout(panelTabFitSuppressionTimerRef.current);
    }

    isPanelTabFitSuppressedRef.current = true;
    panelTabFitSuppressionTimerRef.current = window.setTimeout(() => {
      panelTabFitSuppressionTimerRef.current = null;
      isPanelTabFitSuppressedRef.current = false;
    }, LAB_PERFORMANCE_PANEL_TAB_FIT_SUPPRESSION_MS);
  }, []);

  const clearHeldPanelMaxHeightRelease = useCallback(() => {
    if (heldPanelMaxHeightReleaseTimerRef.current === null) {
      return;
    }

    window.clearTimeout(heldPanelMaxHeightReleaseTimerRef.current);
    heldPanelMaxHeightReleaseTimerRef.current = null;
  }, []);

  const applyHeldPanelMaxHeightRelease = useCallback(() => {
    if (heldPanelMaxHeightRef.current === null) {
      return;
    }

    const nextMaxHeight = intendedPanelMaxHeightRef.current;
    heldPanelMaxHeightRef.current = null;
    suppressAnalysisSurfaceLayoutShifts();
    setPanelMaxHeight((height) =>
      Math.abs(height - nextMaxHeight) <= 1 ? height : nextMaxHeight,
    );

    if (isCollapsed === true) {
      return;
    }

    setPanelHeight((height) => {
      if (
        height <= LAB_PERFORMANCE_PANEL_COLLAPSED_HEIGHT ||
        height <= nextMaxHeight
      ) {
        return height;
      }

      return clampPerformancePanelOpenHeight(height, nextMaxHeight);
    });
  }, [isCollapsed]);

  const scheduleHeldPanelMaxHeightRelease = useCallback(() => {
    clearHeldPanelMaxHeightRelease();

    if (heldPanelMaxHeightRef.current === null) {
      return;
    }

    heldPanelMaxHeightReleaseTimerRef.current = window.setTimeout(() => {
      heldPanelMaxHeightReleaseTimerRef.current = null;

      if (isPanelPointerInsideRef.current) {
        return;
      }

      if (resizeStateRef.current) {
        scheduleHeldPanelMaxHeightRelease();
        return;
      }

      applyHeldPanelMaxHeightRelease();
    }, LAB_PERFORMANCE_PANEL_HELD_MAX_RELEASE_MS);
  }, [applyHeldPanelMaxHeightRelease, clearHeldPanelMaxHeightRelease]);

  const holdPanelMaxHeightUntilPointerLeaves = useCallback(() => {
    clearHeldPanelMaxHeightRelease();

    const heldMaxHeight = Math.max(
      panelHeightRef.current,
      panelMaxHeightRef.current,
    );

    heldPanelMaxHeightRef.current = heldMaxHeight;
    setPanelMaxHeight((height) =>
      height >= heldMaxHeight ? height : heldMaxHeight,
    );

    if (!isPanelPointerInsideRef.current) {
      scheduleHeldPanelMaxHeightRelease();
    }
  }, [clearHeldPanelMaxHeightRelease, scheduleHeldPanelMaxHeightRelease]);

  const clearHeldPanelMaxHeight = useCallback(() => {
    clearHeldPanelMaxHeightRelease();
    heldPanelMaxHeightRef.current = null;
  }, [clearHeldPanelMaxHeightRelease]);

  const handlePanelPointerEnter = useCallback(() => {
    isPanelPointerInsideRef.current = true;
    clearHeldPanelMaxHeightRelease();
  }, [clearHeldPanelMaxHeightRelease]);

  const handlePanelPointerMove = useCallback(() => {
    isPanelPointerInsideRef.current = true;
    clearHeldPanelMaxHeightRelease();
  }, [clearHeldPanelMaxHeightRelease]);

  const handlePanelPointerLeave = useCallback(() => {
    isPanelPointerInsideRef.current = false;
    scheduleHeldPanelMaxHeightRelease();
  }, [scheduleHeldPanelMaxHeightRelease]);

  useEffect(() => {
    if (arePanelHeightTransitionsReady) {
      return;
    }

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        setArePanelHeightTransitionsReady(true);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [arePanelHeightTransitionsReady]);

  useEffect(() => {
    return () => {
      if (panelScrollbarIdleTimerRef.current !== null) {
        window.clearTimeout(panelScrollbarIdleTimerRef.current);
      }
      if (panelTabFitSuppressionTimerRef.current !== null) {
        window.clearTimeout(panelTabFitSuppressionTimerRef.current);
      }
      if (heldPanelMaxHeightReleaseTimerRef.current !== null) {
        window.clearTimeout(heldPanelMaxHeightReleaseTimerRef.current);
      }
      if (panelViewFitTimerRef.current !== null) {
        window.clearTimeout(panelViewFitTimerRef.current);
      }
      resizeCleanupRef.current?.();
    };
  }, []);

  const fitPanelToContent = useCallback(() => {
    const contentNode = contentRef.current;

    if (!contentNode) {
      return;
    }

    if (isPanelTabFitSuppressedRef.current) {
      return;
    }

    const panelViewControls = contentNode.querySelector(
      '[data-lab-performance-panel-view-controls]',
    );
    const metricsTable = contentNode.querySelector('table');
    const timelineShell = contentNode.querySelector(
      '[data-testid="lab-performance-timeline-shell"]',
    );
    const primitiveStructureShell = contentNode.querySelector(
      '[data-testid="lab-primitive-structure-shell"]',
    );
    const panelViewControlsHeight = panelViewControls?.scrollHeight ?? 0;
    const panelViewGap = panelViewControlsHeight > 0 ? 12 : 0;
    setPanelViewControlsHeight((height) =>
      Math.abs(height - panelViewControlsHeight) <= 1
        ? height
        : panelViewControlsHeight,
    );
    const metricsContentHeight =
      Math.max(
        metricsTable?.scrollHeight ?? 0,
        timelineShell?.scrollHeight ?? 0,
      ) +
      panelViewControlsHeight +
      panelViewGap;
    const structureContentHeight =
      (primitiveStructureShell?.scrollHeight ?? 0) +
      panelViewControlsHeight +
      panelViewGap;
    const contentHeight = Math.max(
      contentNode.scrollHeight,
      metricsContentHeight,
      structureContentHeight,
    );
    const nextHeight = clampPerformancePanelOpenHeight(
      contentHeight + LAB_PERFORMANCE_PANEL_VERTICAL_PADDING,
      Number.MAX_SAFE_INTEGER,
    );
    intendedPanelMaxHeightRef.current = nextHeight;

    const heldPanelMaxHeight = heldPanelMaxHeightRef.current;
    if (heldPanelMaxHeight !== null && heldPanelMaxHeight > nextHeight) {
      setPanelMaxHeight((height) =>
        Math.abs(height - heldPanelMaxHeight) <= 1
          ? height
          : heldPanelMaxHeight,
      );
    } else {
      if (heldPanelMaxHeight !== null) {
        heldPanelMaxHeightRef.current = null;
      }

      setPanelMaxHeight((height) =>
        Math.abs(height - nextHeight) <= 1 ? height : nextHeight,
      );
    }

    if (isCollapsed === true) {
      if (resizeStateRef.current) {
        return;
      }

      setPanelHeight(LAB_PERFORMANCE_PANEL_COLLAPSED_HEIGHT);
      return;
    }

    if (userSizedPanelRef.current) {
      return;
    }

    setPanelHeight((height) =>
      Math.abs(height - nextHeight) <= 1 ? height : nextHeight,
    );
  }, [isCollapsed]);

  useLayoutEffect(() => {
    if (isCollapsed === true) {
      return;
    }

    userSizedPanelRef.current = false;
    clearHeldPanelMaxHeight();
  }, [activePage, clearHeldPanelMaxHeight, isCollapsed]);

  useLayoutEffect(() => {
    if (previousPanelViewRef.current === activePanelView) {
      return;
    }

    previousPanelViewRef.current = activePanelView;
    userSizedPanelRef.current = true;
    suppressPanelFitForTabSwitch();

    if (panelViewFitTimerRef.current !== null) {
      window.clearTimeout(panelViewFitTimerRef.current);
    }

    panelViewFitTimerRef.current = window.setTimeout(() => {
      panelViewFitTimerRef.current = null;
      fitPanelToContent();
    }, LAB_PERFORMANCE_PANEL_TAB_FIT_SUPPRESSION_MS + 32);
  }, [activePanelView, fitPanelToContent, suppressPanelFitForTabSwitch]);

  useLayoutEffect(() => {
    fitPanelToContent();
  }, [activePage, fitPanelToContent, timeline, vitals]);

  useEffect(() => {
    const contentNode = contentRef.current;

    if (!contentNode) {
      return;
    }

    fitPanelToContent();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const resizeObserver = new ResizeObserver(fitPanelToContent);
    resizeObserver.observe(contentNode);

    return () => {
      resizeObserver.disconnect();
    };
  }, [fitPanelToContent]);

  const collapseProgress = getPerformancePanelCollapseProgress(panelHeight);
  const isPanelCollapsed =
    panelHeight <= LAB_PERFORMANCE_PANEL_COLLAPSED_HEIGHT;

  const panelFrameHeight = Math.max(
    panelHeight,
    LAB_PERFORMANCE_PANEL_HANDLE_HIT_AREA,
  );
  const surfacePaddingBottom = `${(
    LAB_PERFORMANCE_PANEL_SURFACE_PADDING_BOTTOM * collapseProgress
  ).toFixed(2)}px`;
  const surfacePaddingTop = `${(
    LAB_PERFORMANCE_PANEL_SURFACE_PADDING_TOP * collapseProgress
  ).toFixed(2)}px`;
  const accessiblePanelHeight = Math.round(
    Math.min(panelHeight, panelMaxHeight),
  );
  const panelContentMaxHeight = Math.max(
    0,
    panelHeight - LAB_PERFORMANCE_PANEL_VERTICAL_PADDING,
  );
  const panelViewGap = panelViewControlsHeight > 0 ? 12 : 0;
  const panelBodyMaxHeight = Math.max(
    0,
    panelContentMaxHeight - panelViewControlsHeight - panelViewGap,
  );
  const panelStyle: LabPerformancePanelStyle = {
    '--lab-performance-panel-body-max-height': `${panelBodyMaxHeight}px`,
    '--lab-performance-panel-content-max-height': `${panelContentMaxHeight}px`,
    '--lab-performance-panel-frame-height': `${panelFrameHeight}px`,
    '--lab-performance-panel-height': `${panelHeight}px`,
    '--lab-performance-panel-opacity': collapseProgress.toFixed(3),
    '--lab-performance-panel-translate-y': `${Math.round(
      (1 - collapseProgress) * 12,
    )}px`,
  };

  return (
    <section
      aria-label={`Performance analysis for ${analysis.label}`}
      className={[
        'relative mx-3 h-[var(--lab-performance-panel-height)] shrink-0 overflow-hidden lg:h-[var(--lab-performance-panel-frame-height)]',
        isResizingPanel
          ? null
          : !arePanelHeightTransitionsReady
            ? null
            : 'transition-[height] duration-[640ms] ease-[cubic-bezier(0.77,0,0.175,1)]',
      ]
        .filter(Boolean)
        .join(' ')}
      data-lab-performance-panel-collapsed={isPanelCollapsed ? 'true' : 'false'}
      data-lab-performance-panel
      id="lab-performance-panel"
      onPointerEnter={handlePanelPointerEnter}
      onPointerLeave={handlePanelPointerLeave}
      onPointerMove={handlePanelPointerMove}
      style={panelStyle}
    >
      <div
        aria-label="Resize performance analysis panel"
        aria-orientation="vertical"
        aria-valuemax={Math.round(panelMaxHeight)}
        aria-valuemin={LAB_PERFORMANCE_PANEL_COLLAPSED_HEIGHT}
        aria-valuenow={accessiblePanelHeight}
        aria-valuetext={
          isPanelCollapsed ? 'Collapsed' : `${accessiblePanelHeight}px`
        }
        className="group absolute inset-x-0 top-0 z-30 hidden h-8 cursor-ns-resize touch-none items-start justify-center rounded-t-[24px] outline-none focus-visible:ring-2 focus-visible:ring-white/35 lg:flex"
        data-lab-performance-resize-handle
        onKeyDown={resizePanelWithKeyboard}
        onDoubleClick={togglePanelWithDoubleClick}
        onPointerDown={startPanelResize}
        role="separator"
        tabIndex={0}
      >
        <span
          className={`mt-2 block h-1 w-20 rounded-full transition-colors ${
            isResizingPanel
              ? 'bg-white/60'
              : 'bg-white/16 group-hover:bg-white/40 group-active:bg-white/60 group-focus-visible:bg-white/50'
          }`}
          data-lab-performance-resize-grip
        />
      </div>
      <div
        aria-hidden={isPanelCollapsed ? true : undefined}
        inert={isPanelCollapsed ? true : undefined}
        className={[
          'box-border h-[var(--lab-performance-panel-height)] min-h-0 overflow-hidden rounded-[24px] border border-white/8 bg-[#151515] px-4 py-0 opacity-[var(--lab-performance-panel-opacity)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] lg:px-6 lg:translate-y-[var(--lab-performance-panel-translate-y)]',
          isResizingPanel
            ? 'transition-[opacity,transform,padding,border-color,background-color] duration-75 ease-out'
            : !arePanelHeightTransitionsReady
              ? null
              : 'transition-[height,opacity,transform,padding,border-color,background-color] duration-[640ms] ease-[cubic-bezier(0.77,0,0.175,1)]',
        ]
          .filter(Boolean)
          .join(' ')}
        data-lab-performance-panel-surface
        style={{
          borderWidth: isPanelCollapsed ? 0 : undefined,
          paddingBottom: surfacePaddingBottom,
          paddingTop: surfacePaddingTop,
          transform: 'translateY(var(--lab-performance-panel-translate-y))',
        }}
      >
        <div
          className="flex max-h-[var(--lab-performance-panel-content-max-height)] min-h-0 min-w-0 flex-col gap-3"
          ref={contentRef}
          style={{
            pointerEvents: panelHeight <= 24 ? 'none' : undefined,
          }}
        >
          <div
            className="flex min-h-7 max-w-full shrink-0 flex-wrap items-center gap-2"
            data-lab-performance-panel-view-controls
          >
            <Tabs
              value={activePanelView}
              className="shrink-0"
              onValueChange={(nextView) => {
                const nextPanelView = nextView as LabPerformancePanelView;

                suppressAnalysisSurfaceLayoutShifts();
                userSizedPanelRef.current = true;
                if (
                  activePanelView === 'structure' &&
                  nextPanelView === 'metrics'
                ) {
                  holdPanelMaxHeightUntilPointerLeaves();
                } else {
                  clearHeldPanelMaxHeight();
                }
                suppressPanelFitForTabSwitch();
                setActivePanelView(nextPanelView);
              }}
            >
              <TabsList aria-label="Performance panel views">
                {LAB_PERFORMANCE_PANEL_VIEWS.map((view) => (
                  <TabsTrigger
                    aria-controls={`lab-performance-${view.value}-panel`}
                    data-testid={`lab-performance-${view.value}-tab`}
                    id={`lab-performance-${view.value}-tab`}
                    key={view.value}
                    value={view.value}
                  >
                    {view.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <div
            aria-labelledby="lab-performance-metrics-tab"
            className="grid min-h-0 min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_clamp(320px,25vw,480px)] lg:items-start"
            hidden={activePanelView !== 'metrics'}
            id="lab-performance-metrics-panel"
            role="tabpanel"
            tabIndex={0}
          >
            <div
              className={[
                'ck-lab-performance-panel-scroll ck-lab-performance-metrics-scroll max-h-[var(--lab-performance-panel-body-max-height)] min-h-0 min-w-0 overflow-y-auto overscroll-contain pr-1',
                isPanelScrollbarActive || isPanelScrollbarRailHovered
                  ? 'ck-lab-performance-panel-scroll-active ck-lab-performance-metrics-scroll-active'
                  : null,
              ]
                .filter(Boolean)
                .join(' ')}
              data-testid="lab-performance-metrics-shell"
              onPointerLeave={hidePanelScrollbarRailHover}
              onPointerMove={syncPanelScrollbarRailHover}
              onScroll={showPanelScrollbar}
              onWheel={showPanelScrollbar}
            >
              <LabMetricTable vitals={vitals} />
            </div>
            <LabPerformanceTimeline
              events={timeline}
              currentTimeMs={timelineTimeMs}
            />
          </div>
          <div
            aria-labelledby="lab-performance-structure-tab"
            className={[
              'ck-lab-performance-panel-scroll ck-lab-performance-structure-scroll max-h-[var(--lab-performance-panel-body-max-height)] min-h-0 min-w-0 overflow-y-auto overscroll-contain pr-1',
              isPanelScrollbarActive || isPanelScrollbarRailHovered
                ? 'ck-lab-performance-panel-scroll-active'
                : null,
            ]
              .filter(Boolean)
              .join(' ')}
            hidden={activePanelView !== 'structure'}
            id="lab-performance-structure-panel"
            onPointerLeave={hidePanelScrollbarRailHover}
            onPointerMove={syncPanelScrollbarRailHover}
            onScroll={showPanelScrollbar}
            onWheel={showPanelScrollbar}
            role="tabpanel"
            tabIndex={0}
          >
            {activePanelView === 'structure' ? (
              <LabPrimitiveStructureView
                isActive
                structure={analysis.primitiveStructure}
              />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
