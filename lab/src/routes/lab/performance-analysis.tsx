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
import type { LabPageKey } from './shared.js';
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
import { LabPerformanceTimeline } from './performance-analysis/timeline.js';
import {
  suppressAnalysisSurfaceLayoutShifts,
  useLabPerformanceTelemetry,
} from './performance-analysis/telemetry.js';
import type { LabPerformancePanelStyle } from './performance-analysis/types.js';

const LAB_PERFORMANCE_SCROLLBAR_ACTIVE_MS = 700;
const LAB_PERFORMANCE_SCROLLBAR_REVEAL_ZONE_PX = 24;

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
  const [isMetricsScrollbarActive, setIsMetricsScrollbarActive] =
    useState(false);
  const [isMetricsScrollbarRailHovered, setIsMetricsScrollbarRailHovered] =
    useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const panelHeightRef = useRef(panelHeight);
  const panelMaxHeightRef = useRef(panelMaxHeight);
  const userSizedPanelRef = useRef(false);
  const metricsScrollbarIdleTimerRef = useRef<number | null>(null);
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
        const nextHeight = clampPerformancePanelHeight(
          panelHeightRef.current - step,
          panelMaxHeight,
        );
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

  const showMetricsScrollbar = useCallback(() => {
    if (metricsScrollbarIdleTimerRef.current !== null) {
      window.clearTimeout(metricsScrollbarIdleTimerRef.current);
    }

    setIsMetricsScrollbarActive(true);
    metricsScrollbarIdleTimerRef.current = window.setTimeout(() => {
      metricsScrollbarIdleTimerRef.current = null;
      setIsMetricsScrollbarActive(false);
    }, LAB_PERFORMANCE_SCROLLBAR_ACTIVE_MS);
  }, []);

  const syncMetricsScrollbarRailHover = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const distanceFromRightEdge = rect.right - event.clientX;

      setIsMetricsScrollbarRailHovered(
        distanceFromRightEdge >= 0 &&
          distanceFromRightEdge <= LAB_PERFORMANCE_SCROLLBAR_REVEAL_ZONE_PX,
      );
    },
    [],
  );

  const hideMetricsScrollbarRailHover = useCallback(() => {
    setIsMetricsScrollbarRailHovered(false);
  }, []);

  useEffect(() => {
    return () => {
      if (metricsScrollbarIdleTimerRef.current !== null) {
        window.clearTimeout(metricsScrollbarIdleTimerRef.current);
      }
      resizeCleanupRef.current?.();
    };
  }, []);

  const fitPanelToContent = useCallback(() => {
    const contentNode = contentRef.current;

    if (!contentNode) {
      return;
    }

    const metricsTable = contentNode.querySelector('table');
    const timelineShell = contentNode.querySelector(
      '[data-testid="lab-performance-timeline-shell"]',
    );
    const contentHeight = Math.max(
      contentNode.scrollHeight,
      metricsTable?.scrollHeight ?? 0,
      timelineShell?.scrollHeight ?? 0,
    );
    const nextHeight = clampPerformancePanelOpenHeight(
      contentHeight + LAB_PERFORMANCE_PANEL_VERTICAL_PADDING,
      Number.MAX_SAFE_INTEGER,
    );
    setPanelMaxHeight((height) =>
      Math.abs(height - nextHeight) <= 1 ? height : nextHeight,
    );

    if (isCollapsed === true) {
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

  useEffect(() => {
    if (isCollapsed === true) {
      return;
    }

    userSizedPanelRef.current = false;
  }, [activePage, isCollapsed]);

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
  const panelStyle: LabPerformancePanelStyle = {
    '--lab-performance-panel-content-max-height': `${Math.max(
      0,
      panelHeight - LAB_PERFORMANCE_PANEL_VERTICAL_PADDING,
    )}px`,
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
          : 'transition-[height] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
      ]
        .filter(Boolean)
        .join(' ')}
      data-lab-performance-panel-collapsed={isPanelCollapsed ? 'true' : 'false'}
      data-lab-performance-panel
      id="lab-performance-panel"
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
            : 'transition-[height,opacity,transform,padding,border-color,background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
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
          className="grid max-h-[var(--lab-performance-panel-content-max-height)] min-h-0 min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_clamp(320px,25vw,480px)] lg:items-start"
          ref={contentRef}
          style={{
            pointerEvents: panelHeight <= 24 ? 'none' : undefined,
          }}
        >
          <div
            className={[
              'ck-lab-performance-metrics-scroll max-h-[var(--lab-performance-panel-content-max-height)] min-h-0 min-w-0 overflow-y-auto overscroll-contain pr-1',
              isMetricsScrollbarActive || isMetricsScrollbarRailHovered
                ? 'ck-lab-performance-metrics-scroll-active'
                : null,
            ]
              .filter(Boolean)
              .join(' ')}
            data-testid="lab-performance-metrics-shell"
            onPointerLeave={hideMetricsScrollbarRailHover}
            onPointerMove={syncMetricsScrollbarRailHover}
            onScroll={showMetricsScrollbar}
            onWheel={showMetricsScrollbar}
          >
            <LabMetricTable vitals={vitals} />
          </div>
          <LabPerformanceTimeline
            events={timeline}
            currentTimeMs={timelineTimeMs}
          />
        </div>
      </div>
    </section>
  );
}
