import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type {
  DragEndEvent,
  Modifier,
  PointerSensorOptions,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type {
  CSSProperties,
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import type { LabPageKey } from './shared.js';

type LabPerformanceTone = 'good' | 'okay' | 'poor' | 'neutral';

type LabPerformanceAnalysis = {
  label: string;
};

type LabPerformanceResourceStats = {
  moduleRequests: number;
  moduleDurationMs: number;
};

type LabPerformanceMetricKey =
  | 'fcp'
  | 'lcp'
  | 'cls'
  | 'inp'
  | 'fps'
  | 'loading';

type LabPerformanceAttributions = Record<LabPerformanceMetricKey, string>;

type LabMetricRangeDirection = 'higher' | 'lower';

type LabMetricRangeUnit = 'fps' | 'milliseconds' | 'score';

type LabMetricRangeConfig = {
  direction: LabMetricRangeDirection;
  goodThreshold: number;
  max: number;
  min: number;
  okayThreshold: number;
  unit: LabMetricRangeUnit;
};

type LabPerformanceVitals = {
  fcpMs: number | null;
  lcpMs: number | null;
  cls: number;
  inpMs: number | null;
  fps: number | null;
  minFps: number | null;
  loadingMs: number | null;
  longTasks: number;
  resources: LabPerformanceResourceStats;
  attributions: LabPerformanceAttributions;
};

type LabTimelineEventKind =
  | 'route'
  | 'loading'
  | 'resource'
  | 'vital'
  | 'interaction'
  | 'long-task';

type LabTimelineEvent = {
  durationMs: number;
  id: string;
  kind: LabTimelineEventKind;
  label: string;
  detail: string;
  timeMs: number;
};

type LayoutShiftPerformanceEntry = PerformanceEntry & {
  value: number;
  hadRecentInput: boolean;
  sources?: Array<{
    node?: Node | null;
  }>;
};

type LargestContentfulPaintPerformanceEntry = PerformanceEntry & {
  element?: Element | null;
  renderTime?: number;
  loadTime?: number;
  size?: number;
  url?: string;
};

type LabPreviewLcpCandidate = {
  element: Element;
  priority: number;
  size: number;
};

type InteractionPerformanceEntry = PerformanceEntry & {
  duration: number;
  interactionId?: number;
  target?: EventTarget | null;
};

const MAX_TIMELINE_EVENTS = 12;
const TIMELINE_STORY_MIN_EVENT_MS = 24;
const LAB_COMPONENT_PREVIEW_SELECTOR = '[data-lab-component-preview]';
const LAB_PREVIEW_LCP_IGNORED_TAGS = new Set([
  'clippath',
  'defs',
  'lineargradient',
  'mask',
  'metadata',
  'pattern',
  'radialgradient',
  'script',
  'style',
  'template',
  'title',
]);
const LAB_LCP_PENDING_ATTRIBUTION = 'Largest preview element pending';
const LAB_LCP_NO_PREVIEW_CANDIDATE_ATTRIBUTION = 'No preview LCP candidate';
const LAB_PERFORMANCE_PANEL_DEFAULT_HEIGHT = 560;
const LAB_PERFORMANCE_PANEL_COLLAPSED_HEIGHT = 0;
const LAB_PERFORMANCE_PANEL_MIN_HEIGHT = 128;
const LAB_PERFORMANCE_PANEL_MAX_HEIGHT = 560;
const LAB_PERFORMANCE_PANEL_RESIZE_STEP = 16;
const LAB_PERFORMANCE_PANEL_VERTICAL_PADDING = 32;
const LAB_PERFORMANCE_PANEL_LAYOUT_SHIFT_SUPPRESSION_MS = 700;
const LAB_PERFORMANCE_SCROLLBAR_ACTIVE_MS = 700;
const LAB_METRIC_LABEL_TRUNCATION_TOLERANCE_PX = 1;
const LAB_METRIC_LABEL_TRUNCATION_TRIGGER_COUNT = 2;
const LAB_METRIC_ROW_DRAG_ACTIVATION_Y_PX = 8;
const LAB_METRIC_ROW_ORDER_STORAGE_KEY =
  'control-kit:lab:performance-metric-row-order:v1';
const LAB_METRIC_ROW_IDS = [
  'resources',
  'long-tasks',
  'fcp',
  'lcp',
  'cls',
  'inp',
  'fps',
  'loading',
] as const;
const LAB_METRIC_ROW_ID_SET = new Set<string>(LAB_METRIC_ROW_IDS);
const LAB_METRIC_ROW_SENSOR_OPTIONS = {
  activationConstraint: {
    distance: {
      y: LAB_METRIC_ROW_DRAG_ACTIVATION_Y_PX,
    },
  },
} satisfies PointerSensorOptions;
const restrictMetricRowDragToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});
const IGNORED_INTERACTION_ENTRY_NAMES = new Set([
  'mouseenter',
  'mouseleave',
  'mousemove',
  'mouseout',
  'mouseover',
  'pointerenter',
  'pointerleave',
  'pointermove',
  'pointerout',
  'pointerover',
]);

type LabMetricRowId = (typeof LAB_METRIC_ROW_IDS)[number];

type LabPerformancePanelStyle = CSSProperties & {
  '--lab-performance-panel-content-max-height': string;
  '--lab-performance-panel-height': string;
  '--lab-performance-panel-opacity': string;
  '--lab-performance-panel-translate-y': string;
};

type LabMetricRangeSegment = {
  end: number;
  start: number;
  tone: Exclude<LabPerformanceTone, 'neutral'>;
};

type LabMetricRangeCardPlacement = 'bottom' | 'top';

type LabMetricRangeCardState = {
  left: number;
  placement: LabMetricRangeCardPlacement;
  top: number;
};

type LabTimelineStoryRow = {
  actualEndMs: number;
  actualGapMs: number;
  actualStartMs: number;
  event: LabTimelineEvent;
  storyDurationMs: number;
  storyEndMs: number;
  storyStartMs: number;
};

const LAB_PERFORMANCE_ANALYSIS: Record<LabPageKey, LabPerformanceAnalysis> = {
  plane: {
    label: 'ColorPlane',
  },
  input: {
    label: 'Input Primitive',
  },
  inputMulti: {
    label: 'Input Multi',
  },
  checkbox: {
    label: 'Checkbox',
  },
  slider: {
    label: 'Slider',
  },
  tooltip: {
    label: 'Tooltip',
  },
  menu: {
    label: 'Menu',
  },
  select: {
    label: 'Select',
  },
  toggleButton: {
    label: 'Toggle Button',
  },
  toggle: {
    label: 'Toggle Group',
  },
};

const LAB_PAGE_RESOURCE_HINTS: Record<LabPageKey, readonly string[]> = {
  plane: ['color-plane'],
  input: ['pages/input', 'input-'],
  inputMulti: ['input-multi'],
  checkbox: ['checkbox'],
  slider: ['slider'],
  tooltip: ['tooltip'],
  menu: ['menu'],
  select: ['select'],
  toggleButton: ['toggle-button'],
  toggle: ['toggle-group'],
};

function supportsPerformanceEntryType(type: string) {
  return (
    typeof PerformanceObserver !== 'undefined' &&
    PerformanceObserver.supportedEntryTypes.includes(type)
  );
}

function getPerformanceTime() {
  return typeof performance === 'undefined' ? 0 : performance.now();
}

let analysisSurfaceLayoutShiftSuppressionUntil = 0;

function suppressAnalysisSurfaceLayoutShifts() {
  analysisSurfaceLayoutShiftSuppressionUntil =
    getPerformanceTime() + LAB_PERFORMANCE_PANEL_LAYOUT_SHIFT_SUPPRESSION_MS;
}

function isAnalysisSurfaceTelemetrySuppressedAt(time: number) {
  return time <= analysisSurfaceLayoutShiftSuppressionUntil;
}

function collectPageResourceStats(
  page: LabPageKey,
): LabPerformanceResourceStats {
  const hints = LAB_PAGE_RESOURCE_HINTS[page];
  const resources = performance.getEntriesByType(
    'resource',
  ) as PerformanceResourceTiming[];
  const matchingResources = resources.filter((resource) =>
    hints.some((hint) => resource.name.includes(hint)),
  );

  return {
    moduleRequests: matchingResources.length,
    moduleDurationMs: Math.round(
      matchingResources.reduce(
        (duration, resource) => duration + resource.duration,
        0,
      ),
    ),
  };
}

function createTimelineEvent(
  kind: LabTimelineEventKind,
  label: string,
  detail: string,
  routeStart: number,
  at = getPerformanceTime(),
  durationMs = 0,
): LabTimelineEvent {
  return {
    durationMs: Math.max(0, Math.round(durationMs)),
    id: `${kind}-${label}-${at}-${Math.random().toString(36).slice(2)}`,
    kind,
    label,
    detail,
    timeMs: Math.max(0, Math.round(at - routeStart)),
  };
}

function appendTimelineEvent(
  events: readonly LabTimelineEvent[],
  event: LabTimelineEvent,
) {
  const sortedEvents = [...events, event].sort(
    (first, second) => first.timeMs - second.timeMs,
  );
  const routeEvent = sortedEvents.find((current) => current.kind === 'route');
  const recentEvents = sortedEvents
    .filter((current) => current !== routeEvent)
    .slice(-(MAX_TIMELINE_EVENTS - (routeEvent ? 1 : 0)));

  return [...(routeEvent ? [routeEvent] : []), ...recentEvents].sort(
    (first, second) => first.timeMs - second.timeMs,
  );
}

function getTimelineEventActualBounds(event: LabTimelineEvent) {
  const actualStartMs = Math.max(0, event.timeMs - event.durationMs);
  const actualEndMs = Math.max(actualStartMs, event.timeMs);

  return { actualEndMs, actualStartMs };
}

function createTimelineStoryRows(
  events: readonly LabTimelineEvent[],
): LabTimelineStoryRow[] {
  let previousActualEndMs = 0;
  let storyCursorMs = 0;

  return events.map((event, index) => {
    const { actualEndMs, actualStartMs } = getTimelineEventActualBounds(event);
    const actualDurationMs = Math.max(0, actualEndMs - actualStartMs);
    const actualGapMs =
      index === 0
        ? actualStartMs
        : Math.max(0, actualStartMs - previousActualEndMs);
    const storyStartMs = storyCursorMs;
    const storyDurationMs = Math.max(
      actualDurationMs,
      TIMELINE_STORY_MIN_EVENT_MS,
    );
    const storyEndMs = storyStartMs + storyDurationMs;

    previousActualEndMs = Math.max(previousActualEndMs, actualEndMs);
    storyCursorMs = storyEndMs;

    return {
      actualEndMs,
      actualGapMs,
      actualStartMs,
      event,
      storyDurationMs,
      storyEndMs,
      storyStartMs,
    };
  });
}

function clampPerformancePanelHeight(height: number) {
  return Math.min(
    LAB_PERFORMANCE_PANEL_MAX_HEIGHT,
    Math.max(LAB_PERFORMANCE_PANEL_COLLAPSED_HEIGHT, Math.round(height)),
  );
}

function clampPerformancePanelOpenHeight(height: number) {
  return Math.min(
    LAB_PERFORMANCE_PANEL_MAX_HEIGHT,
    Math.max(LAB_PERFORMANCE_PANEL_MIN_HEIGHT, Math.round(height)),
  );
}

function getPerformancePanelCollapseProgress(height: number) {
  return clamp(
    height / LAB_PERFORMANCE_PANEL_MIN_HEIGHT,
    LAB_PERFORMANCE_PANEL_COLLAPSED_HEIGHT,
    1,
  );
}

function isPerformancePanelEventTarget(target: EventTarget | null | undefined) {
  return (
    target instanceof Element &&
    target.closest('[data-lab-performance-panel]') !== null
  );
}

function isComponentPreviewLcpCandidate(
  entry: LargestContentfulPaintPerformanceEntry,
) {
  return Boolean(entry.element?.closest(LAB_COMPONENT_PREVIEW_SELECTOR));
}

function getVisibleElementArea(element: Element) {
  const rect = element.getBoundingClientRect();

  if (rect.width < 1 || rect.height < 1) {
    return 0;
  }

  const style = window.getComputedStyle(element);

  if (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    Number(style.opacity) === 0
  ) {
    return 0;
  }

  const viewportWidth =
    window.innerWidth || document.documentElement.clientWidth;
  const viewportHeight =
    window.innerHeight || document.documentElement.clientHeight;
  const visibleWidth = Math.max(
    0,
    Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0),
  );
  const visibleHeight = Math.max(
    0,
    Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0),
  );

  return visibleWidth * visibleHeight;
}

function getPreviewLcpCandidatePriority(element: Element) {
  const tagName = element.tagName.toLowerCase();

  if (['canvas', 'img', 'svg', 'video'].includes(tagName)) {
    return 4;
  }

  if (
    ['button', 'input', 'label', 'select', 'textarea'].includes(tagName) ||
    element.hasAttribute('role') ||
    element.hasAttribute('aria-label')
  ) {
    return 3;
  }

  if (element.textContent?.trim()) {
    return 2;
  }

  return 1;
}

function findLargestComponentPreviewCandidate(): LabPreviewLcpCandidate | null {
  const previewRoot = document.querySelector(LAB_COMPONENT_PREVIEW_SELECTOR);

  if (!previewRoot) {
    return null;
  }

  let largestCandidate: LabPreviewLcpCandidate | null = null;

  for (const element of Array.from(previewRoot.querySelectorAll('*'))) {
    if (
      LAB_PREVIEW_LCP_IGNORED_TAGS.has(element.tagName.toLowerCase()) ||
      element.closest('aside') ||
      element.closest('[data-lab-performance-panel]')
    ) {
      continue;
    }

    const area = getVisibleElementArea(element);
    const size = Math.round(area);
    const priority = getPreviewLcpCandidatePriority(element);
    const largestSize: number =
      largestCandidate === null ? 0 : largestCandidate.size;
    const largestPriority: number =
      largestCandidate === null ? 0 : largestCandidate.priority;

    if (
      size <= 0 ||
      size < largestSize ||
      (size === largestSize && priority <= largestPriority)
    ) {
      continue;
    }

    largestCandidate = {
      element,
      priority,
      size,
    };
  }

  return largestCandidate;
}

function isInteractionEntryRelevant(entry: InteractionPerformanceEntry) {
  return (
    !IGNORED_INTERACTION_ENTRY_NAMES.has(entry.name) &&
    !isPerformancePanelEventTarget(entry.target) &&
    (entry.interactionId || entry.duration >= 16)
  );
}

function readInitialPaintMetric(name: string) {
  const entry = performance.getEntriesByName(name).at(-1);
  return entry ? Math.round(entry.startTime) : null;
}

function truncateAttribution(value: string, maxLength = 42) {
  return value.length > maxLength
    ? `${value.slice(0, maxLength - 3)}...`
    : value;
}

function getReadableElementName(element: Element) {
  if (element instanceof HTMLInputElement) {
    return (
      element.getAttribute('aria-label') ||
      element.placeholder ||
      element.value ||
      element.name
    );
  }

  if (element instanceof HTMLImageElement) {
    return element.alt || element.currentSrc.split('/').at(-1);
  }

  return (
    element.getAttribute('aria-label') ||
    element.getAttribute('title') ||
    element.textContent?.replace(/\s+/g, ' ').trim()
  );
}

function describeAttributionTarget(
  target: EventTarget | Node | null | undefined,
) {
  if (!(target instanceof Element)) {
    return 'document';
  }

  if (target.closest('[data-lab-performance-panel]')) {
    return 'performance analysis panel';
  }

  if (target.closest('aside')) {
    return 'properties panel';
  }

  const attributedElement =
    target.closest(
      'button, input, textarea, select, canvas, svg, a, label, [role], [aria-label]',
    ) ?? target;
  const tagName = attributedElement.tagName.toLowerCase();
  const role = attributedElement.getAttribute('role');
  const descriptor = role ?? tagName;
  const readableName = getReadableElementName(attributedElement);

  return truncateAttribution(
    readableName ? `${descriptor} "${readableName}"` : descriptor,
  );
}

function describeLcpAttribution(
  entry: LargestContentfulPaintPerformanceEntry | undefined,
) {
  if (!entry) {
    return LAB_LCP_PENDING_ATTRIBUTION;
  }

  if (entry.element) {
    return `Largest preview element: ${describeAttributionTarget(entry.element)}`;
  }

  if (entry.url) {
    return `Largest preview asset: ${truncateAttribution(
      entry.url.split('/').at(-1) ?? entry.url,
    )}`;
  }

  return 'Largest preview element';
}

function describePreviewLcpAttribution(candidate: LabPreviewLcpCandidate) {
  return `Largest preview element: ${describeAttributionTarget(
    candidate.element,
  )}`;
}

function isAnalysisSurfaceLayoutShiftSource(node: Node) {
  return (
    node instanceof Element &&
    (node.closest('[data-lab-performance-panel]') !== null ||
      node.closest('aside') !== null)
  );
}

function isComponentLayoutShiftEntry(entry: LayoutShiftPerformanceEntry) {
  if (entry.hadRecentInput) {
    return false;
  }

  const sources = (entry.sources ?? [])
    .map((source) => source.node)
    .filter((node): node is Node => Boolean(node));

  return (
    sources.length === 0 ||
    sources.some((node) => !isAnalysisSurfaceLayoutShiftSource(node))
  );
}

function describeLayoutShiftAttribution(
  entries: readonly LayoutShiftPerformanceEntry[],
) {
  const sources = entries
    .flatMap((entry) => entry.sources ?? [])
    .map((source) => source.node)
    .filter((node): node is Node => {
      if (!node) {
        return false;
      }

      return !isAnalysisSurfaceLayoutShiftSource(node);
    });

  if (sources.length === 0) {
    return 'Layout shift without source nodes';
  }

  const uniqueSources = Array.from(
    new Set(sources.map((node) => describeAttributionTarget(node))),
  );
  return `Layout shift source: ${uniqueSources.slice(0, 2).join(', ')}`;
}

function getInitialAttributions(
  isLoading: boolean,
): LabPerformanceAttributions {
  return {
    fcp: 'Initial document paint',
    lcp: LAB_LCP_PENDING_ATTRIBUTION,
    cls: 'No layout shift sources',
    inp: 'No interaction observed',
    fps: 'requestAnimationFrame sampler',
    loading: isLoading
      ? 'Component preview pending'
      : 'No loading state observed',
  };
}

function describeLoadingAttribution(
  resources: LabPerformanceResourceStats,
  hadLoadingState: boolean,
) {
  if (!hadLoadingState) {
    return 'No loading state observed';
  }

  return resources.moduleRequests > 0
    ? `${resources.moduleRequests} matched route resource${
        resources.moduleRequests === 1 ? '' : 's'
      }`
    : 'Component preview slot';
}

function getInitialVitals(
  activePage: LabPageKey,
  isLoading: boolean,
): LabPerformanceVitals {
  return {
    fcpMs: readInitialPaintMetric('first-contentful-paint'),
    lcpMs: null,
    cls: 0,
    inpMs: null,
    fps: null,
    minFps: null,
    loadingMs: isLoading ? null : 0,
    longTasks: 0,
    resources: collectPageResourceStats(activePage),
    attributions: getInitialAttributions(isLoading),
  };
}

function getMetricTone(
  key: LabPerformanceMetricKey,
  value: number | null,
): LabPerformanceTone {
  if (value === null) {
    return 'neutral';
  }

  switch (key) {
    case 'fcp':
      return value <= 1800 ? 'good' : value <= 3000 ? 'okay' : 'poor';
    case 'lcp':
      return value <= 2500 ? 'good' : value <= 4000 ? 'okay' : 'poor';
    case 'cls':
      return value <= 0.1 ? 'good' : value <= 0.25 ? 'okay' : 'poor';
    case 'inp':
      return value <= 200 ? 'good' : value <= 500 ? 'okay' : 'poor';
    case 'fps':
      return value >= 55 ? 'good' : value >= 45 ? 'okay' : 'poor';
    case 'loading':
      return value <= 100 ? 'good' : value <= 300 ? 'okay' : 'poor';
  }
}

function formatMilliseconds(value: number | null) {
  return value === null ? 'Waiting' : `${Math.round(value)}ms`;
}

function formatLcpMilliseconds(value: number | null, attribution: string) {
  return value === null &&
    attribution === LAB_LCP_NO_PREVIEW_CANDIDATE_ATTRIBUTION
    ? 'N/A'
    : formatMilliseconds(value);
}

function formatScore(value: number | null) {
  return value === null ? 'Waiting' : value.toFixed(3);
}

function formatFps(value: number | null) {
  return value === null ? 'Sampling' : `${Math.round(value)} fps`;
}

function useLabPerformanceTelemetry(
  activePage: LabPageKey,
  isLoading: boolean,
) {
  const routeStartRef = useRef(getPerformanceTime());
  const loadingStartRef = useRef<number | null>(
    isLoading ? routeStartRef.current : null,
  );
  const [timelineTimeMs, setTimelineTimeMs] = useState(0);
  const [vitals, setVitals] = useState(() =>
    getInitialVitals(activePage, isLoading),
  );
  const [timeline, setTimeline] = useState<readonly LabTimelineEvent[]>(() => [
    createTimelineEvent(
      'route',
      'Route selected',
      LAB_PERFORMANCE_ANALYSIS[activePage].label,
      routeStartRef.current,
      routeStartRef.current,
    ),
    ...(isLoading
      ? [
          createTimelineEvent(
            'loading',
            'Loading state shown',
            'Component preview pending',
            routeStartRef.current,
            routeStartRef.current,
          ),
        ]
      : []),
  ]);

  const addTimelineEvent = useCallback(
    (
      kind: LabTimelineEventKind,
      label: string,
      detail: string,
      at?: number,
      durationMs?: number,
    ) => {
      setTimeline((events) =>
        appendTimelineEvent(
          events,
          createTimelineEvent(
            kind,
            label,
            detail,
            routeStartRef.current,
            at,
            durationMs,
          ),
        ),
      );
    },
    [],
  );

  useEffect(() => {
    const routeStart = getPerformanceTime();
    routeStartRef.current = routeStart;
    loadingStartRef.current = isLoading ? routeStart : null;
    setTimelineTimeMs(0);
    setVitals((current) => {
      const initialVitals = getInitialVitals(activePage, isLoading);

      return {
        ...initialVitals,
        fcpMs:
          current.fcpMs ?? readInitialPaintMetric('first-contentful-paint'),
        lcpMs: null,
        cls: current.cls,
        inpMs: current.inpMs,
        attributions: {
          ...initialVitals.attributions,
          fcp: current.fcpMs
            ? current.attributions.fcp
            : initialVitals.attributions.fcp,
          lcp: initialVitals.attributions.lcp,
          cls:
            current.cls > 0
              ? current.attributions.cls
              : initialVitals.attributions.cls,
          inp: current.inpMs
            ? current.attributions.inp
            : initialVitals.attributions.inp,
        },
      };
    });
    setTimeline([
      createTimelineEvent(
        'route',
        'Route selected',
        LAB_PERFORMANCE_ANALYSIS[activePage].label,
        routeStart,
        routeStart,
      ),
      ...(isLoading
        ? [
            createTimelineEvent(
              'loading',
              'Loading state shown',
              'Component preview pending',
              routeStart,
              routeStart,
            ),
          ]
        : []),
    ]);
  }, [activePage]);

  useEffect(() => {
    const now = getPerformanceTime();

    if (isLoading) {
      if (loadingStartRef.current === null) {
        loadingStartRef.current = now;
        addTimelineEvent(
          'loading',
          'Loading state shown',
          'Component preview pending',
          now,
        );
      }
      setVitals((current) => ({
        ...current,
        loadingMs: null,
        attributions: {
          ...current.attributions,
          loading: 'Component preview pending',
        },
      }));
      return;
    }

    if (loadingStartRef.current !== null) {
      const duration = Math.max(0, Math.round(now - loadingStartRef.current));
      loadingStartRef.current = null;
      const resources = collectPageResourceStats(activePage);

      setVitals((current) => ({
        ...current,
        loadingMs: duration,
        resources,
        attributions: {
          ...current.attributions,
          loading: describeLoadingAttribution(resources, true),
          lcp: current.attributions.lcp,
        },
      }));
      addTimelineEvent(
        'loading',
        'Slots ready',
        `${duration}ms loading state`,
        now,
        duration,
      );
      addTimelineEvent(
        'resource',
        resources.moduleRequests > 0
          ? 'Matching resource fetched'
          : 'No matching resource',
        `${resources.moduleRequests} entries / ${resources.moduleDurationMs}ms`,
        now,
        resources.moduleDurationMs,
      );
    } else {
      const resources = collectPageResourceStats(activePage);

      setVitals((current) => ({
        ...current,
        loadingMs: current.loadingMs ?? 0,
        resources,
        attributions: {
          ...current.attributions,
          loading:
            current.loadingMs === null
              ? current.attributions.loading
              : describeLoadingAttribution(resources, false),
          lcp: current.attributions.lcp,
        },
      }));
    }
  }, [activePage, addTimelineEvent, isLoading]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    let isCancelled = false;
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        if (isCancelled) {
          return;
        }

        const candidate = findLargestComponentPreviewCandidate();

        if (!candidate) {
          setVitals((current) => ({
            ...current,
            lcpMs: null,
            attributions: {
              ...current.attributions,
              lcp: LAB_LCP_NO_PREVIEW_CANDIDATE_ATTRIBUTION,
            },
          }));
          return;
        }

        const measuredAt = getPerformanceTime();
        const lcpMs = Math.max(
          0,
          Math.round(measuredAt - routeStartRef.current),
        );

        setVitals((current) => ({
          ...current,
          lcpMs,
          attributions: {
            ...current.attributions,
            lcp: describePreviewLcpAttribution(candidate),
          },
        }));
        addTimelineEvent(
          'vital',
          'Preview LCP',
          `${lcpMs}ms / ${candidate.size}px`,
          measuredAt,
          lcpMs,
        );
      });
    });

    return () => {
      isCancelled = true;
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [activePage, addTimelineEvent, isLoading]);

  useEffect(() => {
    if (typeof PerformanceObserver === 'undefined') {
      return;
    }

    const observers: PerformanceObserver[] = [];
    const observe = (
      type: string,
      callback: (entries: PerformanceEntry[]) => void,
      options: PerformanceObserverInit,
    ) => {
      if (!supportsPerformanceEntryType(type)) {
        return;
      }

      const observer = new PerformanceObserver((list) =>
        callback(list.getEntries()),
      );
      observer.observe(options);
      observers.push(observer);
    };

    observe(
      'paint',
      (entries) => {
        const fcp = entries.find(
          (entry) => entry.name === 'first-contentful-paint',
        );
        if (!fcp) {
          return;
        }
        const fcpMs = Math.round(fcp.startTime);
        setVitals((current) => ({
          ...current,
          fcpMs,
          attributions: {
            ...current.attributions,
            fcp: 'Initial document paint',
          },
        }));
      },
      { type: 'paint', buffered: true },
    );

    observe(
      'largest-contentful-paint',
      (entries) => {
        const candidate = (entries as LargestContentfulPaintPerformanceEntry[])
          .filter(isComponentPreviewLcpCandidate)
          .at(-1);
        if (!candidate) {
          return;
        }
        const lcpMs = Math.round(
          candidate.renderTime || candidate.loadTime || candidate.startTime,
        );
        setVitals((current) => ({
          ...current,
          lcpMs,
          attributions: {
            ...current.attributions,
            lcp: describeLcpAttribution(candidate),
          },
        }));
        addTimelineEvent(
          'vital',
          'LCP candidate',
          `${lcpMs}ms / ${Math.round(candidate.size ?? 0)}px`,
          candidate.startTime,
          lcpMs,
        );
      },
      { type: 'largest-contentful-paint', buffered: true },
    );

    observe(
      'layout-shift',
      (entries) => {
        let addedShift = 0;
        const shiftEntries = (entries as LayoutShiftPerformanceEntry[])
          .filter(
            (entry) => !isAnalysisSurfaceTelemetrySuppressedAt(entry.startTime),
          )
          .filter(isComponentLayoutShiftEntry);
        for (const entry of shiftEntries) {
          addedShift += entry.value;
        }

        if (addedShift === 0) {
          return;
        }

        setVitals((current) => ({
          ...current,
          cls: current.cls + addedShift,
          attributions: {
            ...current.attributions,
            cls:
              addedShift >= 0.0005
                ? describeLayoutShiftAttribution(shiftEntries)
                : current.attributions.cls,
          },
        }));
        if (addedShift >= 0.001) {
          addTimelineEvent(
            'vital',
            'Layout shift',
            `+${addedShift.toFixed(3)} CLS`,
          );
        }
      },
      { type: 'layout-shift', buffered: true },
    );

    observe(
      'event',
      (entries) => {
        const interaction = (entries as InteractionPerformanceEntry[])
          .filter(
            (entry) => !isAnalysisSurfaceTelemetrySuppressedAt(entry.startTime),
          )
          .filter(isInteractionEntryRelevant)
          .sort((first, second) => second.duration - first.duration)[0];
        if (!interaction) {
          return;
        }
        const inpMs = Math.round(interaction.duration);
        setVitals((current) => ({
          ...current,
          inpMs: Math.max(current.inpMs ?? 0, inpMs),
          attributions: {
            ...current.attributions,
            inp: `${interaction.name || 'interaction'} on ${describeAttributionTarget(
              interaction.target,
            )}`,
          },
        }));
        addTimelineEvent(
          'interaction',
          'Interaction',
          `${interaction.name || 'input'} ${inpMs}ms`,
          interaction.startTime,
          inpMs,
        );
      },
      {
        type: 'event',
        buffered: true,
        durationThreshold: 16,
      } as PerformanceObserverInit,
    );

    observe(
      'longtask',
      (entries) => {
        if (entries.length === 0) {
          return;
        }
        setVitals((current) => ({
          ...current,
          longTasks: current.longTasks + entries.length,
        }));
        for (const entry of entries) {
          addTimelineEvent(
            'long-task',
            'Long task',
            `${Math.round(entry.duration)}ms main thread`,
            entry.startTime,
            entry.duration,
          );
        }
      },
      { type: 'longtask', buffered: true },
    );

    return () => {
      for (const observer of observers) {
        observer.disconnect();
      }
    };
  }, [addTimelineEvent]);

  useEffect(() => {
    let raf = 0;
    let lastFrameTime = getPerformanceTime();
    let lastUpdateTime = lastFrameTime;
    let frameIntervals: number[] = [];

    const sample = (now: number) => {
      const interval = now - lastFrameTime;
      lastFrameTime = now;

      if (interval > 0 && interval < 1000) {
        frameIntervals = [...frameIntervals, interval].slice(-120);
      }

      if (now - lastUpdateTime >= 500 && frameIntervals.length > 0) {
        const recentIntervals = frameIntervals.slice(-60);
        const averageInterval =
          recentIntervals.reduce((total, current) => total + current, 0) /
          recentIntervals.length;
        const worstInterval = Math.max(...recentIntervals);

        setVitals((current) => ({
          ...current,
          fps: Math.round(1000 / averageInterval),
          minFps: Math.round(1000 / worstInterval),
          attributions: {
            ...current.attributions,
            fps: 'requestAnimationFrame sampler',
          },
        }));
        setTimelineTimeMs(Math.max(0, Math.round(now - routeStartRef.current)));
        lastUpdateTime = now;
      }

      raf = window.requestAnimationFrame(sample);
    };

    raf = window.requestAnimationFrame(sample);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  return { vitals, timeline, timelineTimeMs };
}

type LabMetricRow = {
  id: LabMetricRowId;
  label: string;
  shortLabel: string;
  attribution: string;
  range?: LabMetricRangeConfig;
  rawValue?: number | null;
  value: string;
  tone: LabPerformanceTone;
};

function isLabMetricRowId(value: unknown): value is LabMetricRowId {
  return typeof value === 'string' && LAB_METRIC_ROW_ID_SET.has(value);
}

function normalizeMetricRowOrder(value: unknown): LabMetricRowId[] {
  const providedOrder = Array.isArray(value) ? value : [];
  const seen = new Set<LabMetricRowId>();
  const normalizedOrder: LabMetricRowId[] = [];

  for (const rowId of providedOrder) {
    if (!isLabMetricRowId(rowId) || seen.has(rowId)) {
      continue;
    }

    seen.add(rowId);
    normalizedOrder.push(rowId);
  }

  for (const rowId of LAB_METRIC_ROW_IDS) {
    if (!seen.has(rowId)) {
      normalizedOrder.push(rowId);
    }
  }

  return normalizedOrder;
}

function readStoredMetricRowOrder() {
  if (typeof window === 'undefined') {
    return [...LAB_METRIC_ROW_IDS];
  }

  try {
    const storedValue = window.localStorage.getItem(
      LAB_METRIC_ROW_ORDER_STORAGE_KEY,
    );

    if (!storedValue) {
      return [...LAB_METRIC_ROW_IDS];
    }

    return normalizeMetricRowOrder(JSON.parse(storedValue));
  } catch {
    return [...LAB_METRIC_ROW_IDS];
  }
}

function writeStoredMetricRowOrder(rowOrder: readonly LabMetricRowId[]) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      LAB_METRIC_ROW_ORDER_STORAGE_KEY,
      JSON.stringify(rowOrder),
    );
  } catch {
    // Ignore storage failures so the table remains reorderable in private modes.
  }
}

function getMetricToneColor(tone: LabPerformanceTone) {
  const toneColors = {
    good: '#34d399',
    okay: '#fbbf24',
    poor: '#f87171',
    neutral: 'rgba(255,255,255,0.36)',
  } satisfies Record<LabPerformanceTone, string>;

  return toneColors[tone];
}

const LAB_METRIC_RANGES = {
  fcp: {
    direction: 'lower',
    goodThreshold: 1800,
    min: 0,
    max: 5000,
    okayThreshold: 3000,
    unit: 'milliseconds',
  },
  lcp: {
    direction: 'lower',
    goodThreshold: 2500,
    min: 0,
    max: 6000,
    okayThreshold: 4000,
    unit: 'milliseconds',
  },
  cls: {
    direction: 'lower',
    goodThreshold: 0.1,
    min: 0,
    max: 0.4,
    okayThreshold: 0.25,
    unit: 'score',
  },
  inp: {
    direction: 'lower',
    goodThreshold: 200,
    min: 0,
    max: 800,
    okayThreshold: 500,
    unit: 'milliseconds',
  },
  fps: {
    direction: 'higher',
    goodThreshold: 55,
    min: 30,
    max: 75,
    okayThreshold: 45,
    unit: 'fps',
  },
  loading: {
    direction: 'lower',
    goodThreshold: 100,
    min: 0,
    max: 600,
    okayThreshold: 300,
    unit: 'milliseconds',
  },
} satisfies Record<LabPerformanceMetricKey, LabMetricRangeConfig>;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

const LAB_METRIC_RANGE_START_X = 6;
const LAB_METRIC_RANGE_END_X = 74;
const LAB_METRIC_RANGE_Y = 9;
const LAB_METRIC_RANGE_HEIGHT = 2;
const LAB_METRIC_RANGE_MARKER_Y1 = 4;
const LAB_METRIC_RANGE_MARKER_Y2 = 16;
const LAB_METRIC_RANGE_CARD_WIDTH = 184;
const LAB_METRIC_RANGE_CARD_VIEWPORT_MARGIN = 8;

function formatSvgNumber(value: number) {
  return value.toFixed(2).replace(/\.?0+$/, '');
}

function getMetricRangePosition(
  value: number | null,
  config: LabMetricRangeConfig,
) {
  if (value === null) {
    return null;
  }

  const range = config.max - config.min;
  const normalized = range === 0 ? 0.5 : (value - config.min) / range;

  return clamp(normalized, 0, 1);
}

function getMetricRangeX(value: number, config: LabMetricRangeConfig) {
  const position = getMetricRangePosition(value, config) ?? 0;

  return (
    LAB_METRIC_RANGE_START_X +
    position * (LAB_METRIC_RANGE_END_X - LAB_METRIC_RANGE_START_X)
  );
}

function formatMetricRangeValue(value: number, config: LabMetricRangeConfig) {
  switch (config.unit) {
    case 'fps':
      return `${Math.round(value)}fps`;
    case 'milliseconds':
      return `${Math.round(value)}ms`;
    case 'score':
      return value.toFixed(value < 0.1 ? 3 : 2).replace(/\.?0+$/, '');
  }
}

function getMetricRangeSegments(
  config: LabMetricRangeConfig,
): LabMetricRangeSegment[] {
  const goodRange =
    config.direction === 'higher'
      ? {
          end: config.max,
          start: config.goodThreshold,
          tone: 'good' as const,
        }
      : {
          end: config.goodThreshold,
          start: config.min,
          tone: 'good' as const,
        };
  const okayRange =
    config.direction === 'higher'
      ? {
          end: config.goodThreshold,
          start: config.okayThreshold,
          tone: 'okay' as const,
        }
      : {
          end: config.okayThreshold,
          start: config.goodThreshold,
          tone: 'okay' as const,
        };
  const poorRange =
    config.direction === 'higher'
      ? {
          end: config.okayThreshold,
          start: config.min,
          tone: 'poor' as const,
        }
      : {
          end: config.max,
          start: config.okayThreshold,
          tone: 'poor' as const,
        };

  return [poorRange, okayRange, goodRange].sort(
    (first, second) => first.start - second.start,
  );
}

function getMetricRangeToneLabel(tone: LabPerformanceTone) {
  switch (tone) {
    case 'good':
      return 'good';
    case 'okay':
      return 'needs improvement';
    case 'poor':
      return 'poor';
    case 'neutral':
      return 'not reported';
  }
}

function getMetricRangeDisplayLabel(tone: LabPerformanceTone) {
  switch (tone) {
    case 'good':
      return 'Good';
    case 'okay':
      return 'Needs improvement';
    case 'poor':
      return 'Poor';
    case 'neutral':
      return 'Not reported';
  }
}

function isMetricRangeSegmentActive({
  rawValue,
  segment,
  tone,
}: {
  rawValue: number | null;
  segment: LabMetricRangeSegment;
  tone: LabPerformanceTone;
}) {
  return rawValue !== null && segment.tone === tone;
}

function formatMetricRangeLabel(
  label: string,
  range: LabMetricRangeConfig,
  valueLabel: string,
  tone: LabPerformanceTone,
) {
  if (tone === 'neutral') {
    return `${label} has not reported yet; ranges shown for good, needs improvement, and poor`;
  }

  const segments = getMetricRangeSegments(range)
    .filter((segment) => segment.tone !== 'poor')
    .map(
      (segment) =>
        `${getMetricRangeToneLabel(segment.tone)} ${formatMetricRangeValue(
          segment.start,
          range,
        )} to ${formatMetricRangeValue(segment.end, range)}`,
    )
    .join(', ');

  return `${label} is ${valueLabel} in the ${getMetricRangeToneLabel(
    tone,
  )} range; ${segments}`;
}

function getMetricRangeCardPosition(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const viewportWidth =
    window.innerWidth || document.documentElement.clientWidth;
  const centeredLeft = rect.left + rect.width / 2;
  const left = clamp(
    centeredLeft,
    LAB_METRIC_RANGE_CARD_WIDTH / 2 + LAB_METRIC_RANGE_CARD_VIEWPORT_MARGIN,
    viewportWidth -
      LAB_METRIC_RANGE_CARD_WIDTH / 2 -
      LAB_METRIC_RANGE_CARD_VIEWPORT_MARGIN,
  );
  const placement: LabMetricRangeCardPlacement =
    rect.top > 112 ? 'top' : 'bottom';

  return {
    left,
    placement,
    top: placement === 'top' ? rect.top - 8 : rect.bottom + 8,
  };
}

function LabMetricRangeChart({
  label,
  range,
  rawValue,
  tone,
  valueLabel,
}: {
  label: string;
  range: LabMetricRangeConfig;
  rawValue: number | null;
  tone: LabPerformanceTone;
  valueLabel: string;
}) {
  const segments = getMetricRangeSegments(range);
  const markerPosition = getMetricRangePosition(rawValue, range);
  const markerX =
    markerPosition === null
      ? null
      : LAB_METRIC_RANGE_START_X +
        markerPosition * (LAB_METRIC_RANGE_END_X - LAB_METRIC_RANGE_START_X);
  const markerColor = getMetricToneColor(tone);
  const accessibleLabel = formatMetricRangeLabel(
    label,
    range,
    valueLabel,
    tone,
  );
  const [rangeCard, setRangeCard] = useState<LabMetricRangeCardState | null>(
    null,
  );
  const showRangeCard = useCallback(
    (
      event:
        | ReactFocusEvent<HTMLDivElement>
        | ReactPointerEvent<HTMLDivElement>,
    ) => {
      setRangeCard(getMetricRangeCardPosition(event.currentTarget));
    },
    [],
  );
  const hideRangeCard = useCallback(() => setRangeCard(null), []);

  return (
    <div
      aria-label={`${label} range chart`}
      className="relative min-w-[72px] outline-none"
      data-testid="lab-performance-metric-range-trigger"
      onBlur={hideRangeCard}
      onFocus={showRangeCard}
      onPointerEnter={showRangeCard}
      onPointerLeave={hideRangeCard}
      tabIndex={0}
    >
      <svg
        aria-label={accessibleLabel}
        className="block h-5 w-full min-w-[72px] overflow-visible"
        role="img"
        viewBox="0 0 80 20"
      >
        {segments.map((segment) => {
          const segmentX = getMetricRangeX(segment.start, range);
          const segmentEndX = getMetricRangeX(segment.end, range);
          const isActiveSegment = isMetricRangeSegmentActive({
            rawValue,
            segment,
            tone,
          });

          return (
            <rect
              data-active={isActiveSegment ? 'true' : 'false'}
              data-range-end={segment.end}
              data-range-start={segment.start}
              data-range-tone={segment.tone}
              data-testid="lab-performance-metric-range-segment"
              fill={
                isActiveSegment
                  ? getMetricToneColor(segment.tone)
                  : 'rgba(255,255,255,0.14)'
              }
              height={LAB_METRIC_RANGE_HEIGHT}
              key={segment.tone}
              opacity={isActiveSegment ? 0.95 : 1}
              rx="1"
              width={formatSvgNumber(Math.max(1, segmentEndX - segmentX))}
              x={formatSvgNumber(segmentX)}
              y={LAB_METRIC_RANGE_Y}
            />
          );
        })}
        {markerX === null ? null : (
          <line
            data-position={markerPosition}
            data-testid="lab-performance-metric-marker-line"
            data-value={rawValue ?? undefined}
            stroke={markerColor}
            strokeLinecap="round"
            strokeWidth="1.25"
            x1={formatSvgNumber(markerX)}
            x2={formatSvgNumber(markerX)}
            y1={LAB_METRIC_RANGE_MARKER_Y1}
            y2={LAB_METRIC_RANGE_MARKER_Y2}
          />
        )}
      </svg>
      {rangeCard ? (
        <div
          className={[
            'pointer-events-none fixed z-[70] w-[184px] rounded-[6px] border border-white/10 bg-[#252525] px-2.5 py-2 text-[10px] leading-4 text-white/70 opacity-100 shadow-[0_10px_24px_rgba(0,0,0,0.28)]',
          ]
            .filter(Boolean)
            .join(' ')}
          data-testid="lab-performance-metric-range-card"
          role="tooltip"
          style={{
            left: `${rangeCard.left}px`,
            top: `${rangeCard.top}px`,
            transform:
              rangeCard.placement === 'top'
                ? 'translate(-50%, -100%)'
                : 'translateX(-50%)',
          }}
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="truncate font-medium text-white/80">{label}</span>
            <span
              className="shrink-0 font-semibold"
              style={{ color: markerColor }}
            >
              {valueLabel}
            </span>
          </div>
          <div className="grid gap-0.5">
            {segments.map((segment) => {
              const isActiveSegment = isMetricRangeSegmentActive({
                rawValue,
                segment,
                tone,
              });

              return (
                <div
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1.5"
                  data-active={isActiveSegment ? 'true' : 'false'}
                  data-testid="lab-performance-metric-range-card-row"
                  key={segment.tone}
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{
                      backgroundColor: isActiveSegment
                        ? getMetricToneColor(segment.tone)
                        : 'rgba(255,255,255,0.24)',
                    }}
                  />
                  <span
                    className={`truncate ${
                      isActiveSegment
                        ? 'text-white/[0.88]'
                        : 'text-white/[0.52]'
                    }`}
                  >
                    {getMetricRangeDisplayLabel(segment.tone)}
                  </span>
                  <span
                    className={`font-medium ${
                      isActiveSegment
                        ? 'text-white/[0.88]'
                        : 'text-white/[0.52]'
                    }`}
                  >
                    {formatMetricRangeValue(segment.start, range)} -{' '}
                    {formatMetricRangeValue(segment.end, range)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LabSortableMetricRow({
  abbreviateLabel,
  row,
}: {
  abbreviateLabel: boolean;
  row: LabMetricRow;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    attributes: {
      role: 'row',
      roleDescription: 'sortable performance metric row',
      tabIndex: 0,
    },
    id: row.id,
  });
  const rowStyle: CSSProperties = {
    transform: CSS.Transform.toString(
      transform ? { ...transform, x: 0, scaleX: 1, scaleY: 1 } : null,
    ),
    transition,
  };
  const label = abbreviateLabel ? row.shortLabel : row.label;

  return (
    <tr
      className={[
        'cursor-grab touch-none select-none border-b border-white/6 outline-none last:border-b-0 active:cursor-grabbing focus-visible:bg-white/[0.035] focus-visible:ring-1 focus-visible:ring-[#5288db]/70',
        isDragging
          ? 'relative z-10 bg-white/[0.045] shadow-[0_6px_18px_rgba(0,0,0,0.24)]'
          : null,
      ]
        .filter(Boolean)
        .join(' ')}
      data-lab-performance-metric-row
      data-metric-row-id={row.id}
      ref={setNodeRef}
      style={rowStyle}
      {...attributes}
      {...listeners}
    >
      <th
        aria-label={abbreviateLabel ? row.label : undefined}
        className="px-1.5 py-1.5 align-middle text-[11px] font-medium leading-4"
        scope="row"
        style={{ color: 'rgba(255,255,255,0.58)' }}
        title={abbreviateLabel ? row.label : undefined}
      >
        <span className="block truncate" data-lab-performance-metric-label>
          {label}
        </span>
      </th>
      <td
        className="px-1.5 py-1.5 align-middle text-[11px] leading-4"
        style={{ color: 'rgba(255,255,255,0.48)' }}
        title={row.attribution}
      >
        <span className="block truncate">{row.attribution}</span>
      </td>
      <td className="px-1.5 py-1.5 align-middle">
        {row.range ? (
          <LabMetricRangeChart
            label={row.label}
            range={row.range}
            rawValue={row.rawValue ?? null}
            tone={row.tone}
            valueLabel={row.value}
          />
        ) : null}
      </td>
      <td
        className="w-[86px] px-1.5 py-1.5 text-right align-middle text-xs font-semibold leading-4"
        style={{ color: getMetricToneColor(row.tone) }}
      >
        <span className="block truncate">{row.value}</span>
      </td>
    </tr>
  );
}

function LabMetricTable({ vitals }: { vitals: LabPerformanceVitals }) {
  const [rowOrder, setRowOrder] = useState(readStoredMetricRowOrder);
  const [abbreviateMetricLabels, setAbbreviateMetricLabels] = useState(false);
  const labelMeasureRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, LAB_METRIC_ROW_SENSOR_OPTIONS),
  );
  const rows: LabMetricRow[] = [
    {
      id: 'resources',
      label: 'Matched resources',
      shortLabel: 'Resources',
      attribution: `Route module fetches - ${vitals.resources.moduleDurationMs}ms total`,
      value: String(vitals.resources.moduleRequests),
      tone: vitals.resources.moduleRequests > 0 ? 'okay' : 'neutral',
    },
    {
      id: 'long-tasks',
      label: 'Long tasks',
      shortLabel: 'Tasks',
      attribution: 'Main-thread blocks observed',
      value: String(vitals.longTasks),
      tone: vitals.longTasks > 0 ? 'poor' : 'good',
    },
    {
      id: 'fcp',
      label: 'First contentful paint (FCP)',
      shortLabel: 'FCP',
      attribution: vitals.attributions.fcp,
      range: LAB_METRIC_RANGES.fcp,
      rawValue: vitals.fcpMs,
      value: formatMilliseconds(vitals.fcpMs),
      tone: getMetricTone('fcp', vitals.fcpMs),
    },
    {
      id: 'lcp',
      label: 'Largest contentful paint (LCP)',
      shortLabel: 'LCP',
      attribution: vitals.attributions.lcp,
      range: LAB_METRIC_RANGES.lcp,
      rawValue: vitals.lcpMs,
      value: formatLcpMilliseconds(vitals.lcpMs, vitals.attributions.lcp),
      tone: getMetricTone('lcp', vitals.lcpMs),
    },
    {
      id: 'cls',
      label: 'Cumulative layout shift (CLS)',
      shortLabel: 'CLS',
      attribution: vitals.attributions.cls,
      range: LAB_METRIC_RANGES.cls,
      rawValue: vitals.cls,
      value: formatScore(vitals.cls),
      tone: getMetricTone('cls', vitals.cls),
    },
    {
      id: 'inp',
      label: 'Interaction to next paint (INP)',
      shortLabel: 'INP',
      attribution: vitals.attributions.inp,
      range: LAB_METRIC_RANGES.inp,
      rawValue: vitals.inpMs,
      value: formatMilliseconds(vitals.inpMs),
      tone: getMetricTone('inp', vitals.inpMs),
    },
    {
      id: 'fps',
      label: 'Frame rate (FPS)',
      shortLabel: 'FPS',
      attribution: vitals.attributions.fps,
      range: LAB_METRIC_RANGES.fps,
      rawValue: vitals.fps,
      value: formatFps(vitals.fps),
      tone: getMetricTone('fps', vitals.fps),
    },
    {
      id: 'loading',
      label: 'Loading state',
      shortLabel: 'Loading',
      attribution: vitals.attributions.loading,
      range: LAB_METRIC_RANGES.loading,
      rawValue: vitals.loadingMs,
      value: formatMilliseconds(vitals.loadingMs),
      tone: getMetricTone('loading', vitals.loadingMs),
    },
  ];
  const rowsById = new Map<LabMetricRowId, LabMetricRow>(
    rows.map((row) => [row.id, row]),
  );
  const orderedRows = rowOrder
    .map((rowId) => rowsById.get(rowId))
    .filter((row): row is LabMetricRow => Boolean(row));
  const orderedRowIds = orderedRows.map((row) => row.id);
  const orderedRowKey = orderedRowIds.join('|');
  const updateMetricLabelMode = useCallback(() => {
    const measureRoot = labelMeasureRef.current;
    const table = tableRef.current;

    if (!measureRoot || !table) {
      return;
    }

    const labelNodes = Array.from(
      table.querySelectorAll<HTMLElement>(
        '[data-lab-performance-metric-label]',
      ),
    );
    const measureNodes = Array.from(
      measureRoot.querySelectorAll<HTMLElement>(
        '[data-lab-performance-metric-measure-label]',
      ),
    );

    if (!labelNodes.length || !measureNodes.length) {
      return;
    }

    const truncatedCount = measureNodes.reduce((count, measureNode, index) => {
      const labelNode = labelNodes[index];
      const availableWidth = labelNode?.clientWidth ?? 0;

      if (availableWidth <= 0) {
        return count;
      }

      const fullLabelWidth = measureNode.getBoundingClientRect().width;

      return fullLabelWidth >
        availableWidth + LAB_METRIC_LABEL_TRUNCATION_TOLERANCE_PX
        ? count + 1
        : count;
    }, 0);
    const shouldAbbreviate =
      truncatedCount >= LAB_METRIC_LABEL_TRUNCATION_TRIGGER_COUNT;

    setAbbreviateMetricLabels((current) =>
      current === shouldAbbreviate ? current : shouldAbbreviate,
    );
  }, []);
  useLayoutEffect(() => {
    const table = tableRef.current;
    let animationFrame = 0;
    const scheduleUpdate = () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }

      animationFrame = window.requestAnimationFrame(updateMetricLabelMode);
    };
    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(scheduleUpdate);

    scheduleUpdate();

    if (table) {
      resizeObserver?.observe(table);

      if (table.parentElement) {
        resizeObserver?.observe(table.parentElement);
      }
    }

    window.addEventListener('resize', scheduleUpdate);

    return () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }

      resizeObserver?.disconnect();
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [orderedRowKey, updateMetricLabelMode]);
  const reorderRows = useCallback(({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return;
    }

    const activeId = active.id;
    const overId = over.id;

    if (!isLabMetricRowId(activeId) || !isLabMetricRowId(overId)) {
      return;
    }

    setRowOrder((currentOrder) => {
      const normalizedOrder = normalizeMetricRowOrder(currentOrder);
      const activeIndex = normalizedOrder.indexOf(activeId);
      const overIndex = normalizedOrder.indexOf(overId);

      if (activeIndex === -1 || overIndex === -1) {
        return currentOrder;
      }

      const nextOrder = arrayMove(normalizedOrder, activeIndex, overIndex);
      writeStoredMetricRowOrder(nextOrder);

      return nextOrder;
    });
  }, []);

  return (
    <DndContext
      collisionDetection={closestCenter}
      modifiers={[restrictMetricRowDragToVerticalAxis]}
      onDragEnd={reorderRows}
      sensors={sensors}
    >
      <table
        aria-label="Performance metrics"
        className="w-full table-fixed border-collapse text-left"
        data-lab-performance-label-mode={
          abbreviateMetricLabels ? 'abbreviated' : 'full'
        }
        ref={tableRef}
      >
        <colgroup>
          <col className="w-[34%]" />
          <col className="w-[31%]" />
          <col className="w-[92px]" />
          <col className="w-[86px]" />
        </colgroup>
        <SortableContext
          items={orderedRowIds}
          strategy={verticalListSortingStrategy}
        >
          <tbody>
            {orderedRows.map((row) => (
              <LabSortableMetricRow
                abbreviateLabel={abbreviateMetricLabels}
                key={row.id}
                row={row}
              />
            ))}
          </tbody>
        </SortableContext>
      </table>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -left-[10000px] top-0 whitespace-nowrap opacity-0"
        ref={labelMeasureRef}
      >
        {orderedRows.map((row) => (
          <span
            className="inline-block text-[11px] font-medium leading-4"
            data-lab-performance-metric-measure-label
            key={row.id}
          >
            {row.label}
          </span>
        ))}
      </div>
    </DndContext>
  );
}

function getTimelineEventColor(kind: LabTimelineEventKind) {
  switch (kind) {
    case 'route':
      return '#ffffff';
    case 'loading':
      return '#60a5fa';
    case 'resource':
      return '#a78bfa';
    case 'vital':
      return '#34d399';
    case 'interaction':
      return '#fbbf24';
    case 'long-task':
      return '#f87171';
  }
}

function LabPerformanceTimeline({
  events,
  currentTimeMs,
}: {
  events: readonly LabTimelineEvent[];
  currentTimeMs: number;
}) {
  const elapsedTimeMs = Math.max(
    0,
    currentTimeMs,
    ...events.map((event) => event.timeMs),
  );
  const routeEvent = events.find((event) => event.kind === 'route');
  const visibleRows = routeEvent
    ? [routeEvent, ...events.filter((event) => event !== routeEvent).slice(-4)]
    : events.slice(-5);
  const storyRows = createTimelineStoryRows(visibleRows);
  const storyWindowMs = Math.max(1, ...storyRows.map((row) => row.storyEndMs));

  return (
    <div className="min-w-0" data-testid="lab-performance-timeline-shell">
      <div className="flex items-center justify-between gap-3">
        <div
          className="text-[10px] font-medium uppercase tracking-[0.14em]"
          style={{ color: 'rgba(255,255,255,0.42)' }}
        >
          Timeline
        </div>
        <div
          className="min-w-[88px] text-right text-[11px] tabular-nums"
          style={{ color: 'rgba(255,255,255,0.48)' }}
          title={`${Math.round(elapsedTimeMs)}ms observed; idle gaps hidden`}
        >
          {visibleRows.length} events
        </div>
      </div>

      <div className="mt-2 grid gap-1.5" data-testid="lab-performance-timeline">
        {storyRows.map((row) => {
          const { event } = row;
          const endPercent = clamp(
            (row.storyEndMs / storyWindowMs) * 100,
            0,
            100,
          );
          const startPercent = clamp(
            (row.storyStartMs / storyWindowMs) * 100,
            0,
            100,
          );
          const widthPercent = Math.max(0, endPercent - startPercent);
          const displayWidthPercent = clamp(
            Math.max(widthPercent, 1),
            0,
            Math.max(0, 100 - startPercent),
          );
          const color = getTimelineEventColor(event.kind);
          const actualDurationMs = Math.max(
            0,
            row.actualEndMs - row.actualStartMs,
          );
          const actualTimeTitle =
            actualDurationMs > 0
              ? `${row.actualStartMs}-${row.actualEndMs}ms after route; ${actualDurationMs}ms duration`
              : `${row.actualEndMs}ms after route`;
          const idleCompressionTitle =
            row.actualGapMs > 0
              ? `; ${row.actualGapMs}ms idle gap hidden before this event`
              : '';

          return (
            <div
              key={event.id}
              aria-label={`${event.label}: ${event.detail}; ${actualTimeTitle}`}
              className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)_64px] items-center gap-2 text-[11px] leading-4"
              data-actual-duration-ms={actualDurationMs}
              data-actual-end-ms={row.actualEndMs}
              data-actual-start-ms={row.actualStartMs}
              data-lab-performance-timeline-row
              data-story-duration-ms={row.storyDurationMs}
              data-story-end-ms={row.storyEndMs}
              data-story-start-ms={row.storyStartMs}
            >
              <span
                className="block min-w-0 truncate text-right tabular-nums"
                style={{ color }}
                title={`${actualTimeTitle}${idleCompressionTitle}`}
              >
                {formatMilliseconds(row.actualEndMs)}
              </span>
              <span
                className="min-w-0 truncate"
                style={{ color: 'rgba(255,255,255,0.62)' }}
                title={`${event.label}: ${event.detail}`}
              >
                <span className="font-medium">{event.label}</span>
                <span style={{ color: 'rgba(255,255,255,0.42)' }}>
                  {' '}
                  {event.detail}
                </span>
              </span>
              <span aria-hidden="true" className="relative h-4">
                <span className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/10" />
                <span
                  className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full"
                  data-testid="lab-performance-timeline-bar"
                  style={{
                    backgroundColor: color,
                    left: `${startPercent}%`,
                    width: `${displayWidthPercent}%`,
                  }}
                />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LabPerformanceAnalysisPanel({
  activePage,
  isLoading,
}: {
  activePage: LabPageKey;
  isLoading: boolean;
}) {
  const analysis = LAB_PERFORMANCE_ANALYSIS[activePage];
  const [panelHeight, setPanelHeight] = useState(
    LAB_PERFORMANCE_PANEL_DEFAULT_HEIGHT,
  );
  const [isResizingPanel, setIsResizingPanel] = useState(false);
  const [isMetricsScrollbarActive, setIsMetricsScrollbarActive] =
    useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const userSizedPanelRef = useRef(false);
  const metricsScrollbarIdleTimerRef = useRef<number | null>(null);
  const resizeStateRef = useRef<{
    startHeight: number;
    startY: number;
  } | null>(null);
  const { vitals, timeline, timelineTimeMs } = useLabPerformanceTelemetry(
    activePage,
    isLoading,
  );

  const startPanelResize = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      suppressAnalysisSurfaceLayoutShifts();
      userSizedPanelRef.current = true;
      const panelElement = event.currentTarget.closest<HTMLElement>(
        '[data-lab-performance-panel]',
      );
      const startHeight = clampPerformancePanelHeight(
        panelElement?.getBoundingClientRect().height ?? panelHeight,
      );

      event.currentTarget.setPointerCapture(event.pointerId);
      resizeStateRef.current = {
        startHeight,
        startY: event.clientY,
      };
      setIsResizingPanel(true);
    },
    [panelHeight],
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
        setPanelHeight((height) => clampPerformancePanelHeight(height + step));
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        suppressAnalysisSurfaceLayoutShifts();
        userSizedPanelRef.current = true;
        setPanelHeight((height) => clampPerformancePanelHeight(height - step));
        return;
      }

      if (event.key === 'Home') {
        event.preventDefault();
        suppressAnalysisSurfaceLayoutShifts();
        userSizedPanelRef.current = true;
        setPanelHeight(LAB_PERFORMANCE_PANEL_COLLAPSED_HEIGHT);
        return;
      }

      if (event.key === 'End') {
        event.preventDefault();
        suppressAnalysisSurfaceLayoutShifts();
        userSizedPanelRef.current = true;
        setPanelHeight(LAB_PERFORMANCE_PANEL_MAX_HEIGHT);
      }
    },
    [],
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

  useEffect(() => {
    return () => {
      if (metricsScrollbarIdleTimerRef.current !== null) {
        window.clearTimeout(metricsScrollbarIdleTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    userSizedPanelRef.current = false;
  }, [activePage]);

  useEffect(() => {
    const contentNode = contentRef.current;

    if (!contentNode) {
      return;
    }

    const fitPanelToContent = () => {
      if (userSizedPanelRef.current) {
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
      );

      setPanelHeight((height) =>
        Math.abs(height - nextHeight) <= 1 ? height : nextHeight,
      );
    };

    fitPanelToContent();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const resizeObserver = new ResizeObserver(fitPanelToContent);
    resizeObserver.observe(contentNode);

    return () => {
      resizeObserver.disconnect();
    };
  }, [activePage]);

  useEffect(() => {
    if (!isResizingPanel) {
      return;
    }

    let resizeAnimationFrame = 0;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    const handlePointerMove = (event: PointerEvent) => {
      const resizeState = resizeStateRef.current;

      if (!resizeState) {
        return;
      }

      const nextHeight = clampPerformancePanelHeight(
        resizeState.startHeight + resizeState.startY - event.clientY,
      );

      suppressAnalysisSurfaceLayoutShifts();
      cancelAnimationFrame(resizeAnimationFrame);
      resizeAnimationFrame = requestAnimationFrame(() => {
        setPanelHeight(nextHeight);
      });
    };

    const stopPanelResize = () => {
      suppressAnalysisSurfaceLayoutShifts();
      resizeStateRef.current = null;
      setIsResizingPanel(false);
    };

    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopPanelResize);
    window.addEventListener('pointercancel', stopPanelResize);

    return () => {
      cancelAnimationFrame(resizeAnimationFrame);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopPanelResize);
      window.removeEventListener('pointercancel', stopPanelResize);
    };
  }, [isResizingPanel]);

  const collapseProgress = getPerformancePanelCollapseProgress(panelHeight);
  const isPanelCollapsed =
    panelHeight <= LAB_PERFORMANCE_PANEL_COLLAPSED_HEIGHT;
  const panelStyle: LabPerformancePanelStyle = {
    '--lab-performance-panel-content-max-height': `${Math.max(
      0,
      panelHeight - LAB_PERFORMANCE_PANEL_VERTICAL_PADDING,
    )}px`,
    '--lab-performance-panel-height': `${panelHeight}px`,
    '--lab-performance-panel-opacity': collapseProgress.toFixed(3),
    '--lab-performance-panel-translate-y': `${Math.round(
      (1 - collapseProgress) * 12,
    )}px`,
  };

  return (
    <section
      aria-label={`Performance analysis for ${analysis.label}`}
      className="relative mx-3 shrink-0 overflow-visible lg:h-[var(--lab-performance-panel-height)]"
      data-lab-performance-panel-collapsed={isPanelCollapsed ? 'true' : 'false'}
      data-lab-performance-panel
      style={panelStyle}
    >
      <div
        aria-label="Resize performance analysis panel"
        aria-orientation="horizontal"
        aria-valuemax={LAB_PERFORMANCE_PANEL_MAX_HEIGHT}
        aria-valuemin={LAB_PERFORMANCE_PANEL_COLLAPSED_HEIGHT}
        aria-valuenow={panelHeight}
        aria-valuetext={isPanelCollapsed ? 'Collapsed' : `${panelHeight}px`}
        className="group absolute inset-x-0 top-0 z-30 hidden h-4 cursor-ns-resize touch-none items-start justify-center rounded-t-[24px] outline-none focus-visible:ring-2 focus-visible:ring-[#5288db]/80 lg:flex"
        data-lab-performance-resize-handle
        onKeyDown={resizePanelWithKeyboard}
        onPointerDown={startPanelResize}
        role="separator"
        tabIndex={0}
      >
        <span
          className={`mt-1 block h-0.5 w-10 rounded-full transition-colors ${
            isResizingPanel
              ? 'bg-[#5288db]/90'
              : 'bg-white/16 group-hover:bg-white/28 group-focus-visible:bg-[#5288db]/90'
          }`}
        />
      </div>
      <div
        aria-hidden={isPanelCollapsed ? true : undefined}
        inert={isPanelCollapsed ? true : undefined}
        className="min-h-[128px] overflow-hidden rounded-[24px] border border-white/8 bg-[#151515] px-4 py-4 opacity-[var(--lab-performance-panel-opacity)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-[opacity,transform,border-color,background-color] duration-150 ease-out lg:h-full lg:min-h-0 lg:px-6 lg:translate-y-[var(--lab-performance-panel-translate-y)]"
        data-lab-performance-panel-surface
        style={{
          transform: 'translateY(var(--lab-performance-panel-translate-y))',
        }}
      >
        <div
          className="grid min-h-0 min-w-0 gap-4 lg:max-h-[var(--lab-performance-panel-content-max-height)] lg:grid-cols-[minmax(0,1fr)_clamp(320px,25vw,480px)] lg:items-start"
          ref={contentRef}
          style={{
            pointerEvents: panelHeight <= 24 ? 'none' : undefined,
          }}
        >
          <div
            className={[
              'ck-lab-performance-metrics-scroll min-h-0 min-w-0 overflow-y-auto overscroll-contain pr-1 lg:max-h-[var(--lab-performance-panel-content-max-height)]',
              isMetricsScrollbarActive
                ? 'ck-lab-performance-metrics-scroll-active'
                : null,
            ]
              .filter(Boolean)
              .join(' ')}
            data-testid="lab-performance-metrics-shell"
            onPointerDown={showMetricsScrollbar}
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
