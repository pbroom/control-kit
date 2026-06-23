import { useCallback, useEffect, useRef, useState } from 'react';
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

type LabMetricCurveDirection = 'higher' | 'lower';

type LabMetricCurveConfig = {
  direction: LabMetricCurveDirection;
  max: number;
  min: number;
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

type InteractionPerformanceEntry = PerformanceEntry & {
  duration: number;
  interactionId?: number;
  target?: EventTarget | null;
};

const MAX_TIMELINE_EVENTS = 12;
const TIMELINE_WINDOW_MS = 2000;
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

function isPerformancePanelEventTarget(target: EventTarget | null | undefined) {
  return (
    target instanceof Element &&
    target.closest('[data-lab-performance-panel]') !== null
  );
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
    return 'Largest visible element pending';
  }

  if (entry.element) {
    return `Largest visible element: ${describeAttributionTarget(entry.element)}`;
  }

  if (entry.url) {
    return `Largest visible asset: ${truncateAttribution(
      entry.url.split('/').at(-1) ?? entry.url,
    )}`;
  }

  return 'Largest visible element';
}

function describeLayoutShiftAttribution(
  entries: readonly LayoutShiftPerformanceEntry[],
) {
  const sources = entries
    .flatMap((entry) => entry.sources ?? [])
    .map((source) => source.node)
    .filter((node): node is Node => Boolean(node));

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
    lcp: 'Largest visible element pending',
    cls: 'No layout shift sources',
    inp: 'No interaction observed',
    fps: 'requestAnimationFrame sampler',
    loading: isLoading
      ? 'Preview/properties slots pending'
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
    : 'Preview/properties slots';
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
            'Preview/properties slots pending',
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
        lcpMs: current.lcpMs,
        cls: current.cls,
        inpMs: current.inpMs,
        attributions: {
          ...initialVitals.attributions,
          fcp: current.fcpMs
            ? current.attributions.fcp
            : initialVitals.attributions.fcp,
          lcp: current.lcpMs
            ? current.attributions.lcp
            : initialVitals.attributions.lcp,
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
              'Preview/properties slots pending',
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
          'Preview/properties slots pending',
          now,
        );
      }
      setVitals((current) => ({
        ...current,
        loadingMs: null,
        attributions: {
          ...current.attributions,
          loading: 'Preview/properties slots pending',
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
        },
      }));
    }
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
        const candidate = entries.at(-1) as
          | LargestContentfulPaintPerformanceEntry
          | undefined;
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
        const shiftEntries = entries as LayoutShiftPerformanceEntry[];
        for (const entry of shiftEntries) {
          if (!entry.hadRecentInput) {
            addedShift += entry.value;
          }
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
  label: string;
  attribution: string;
  curve: LabMetricCurveConfig;
  metricKey: LabPerformanceMetricKey;
  rawValue: number | null;
  value: string;
  tone: LabPerformanceTone;
};

function getMetricToneColor(tone: LabPerformanceTone) {
  const toneColors = {
    good: '#34d399',
    okay: '#fbbf24',
    poor: '#f87171',
    neutral: 'rgba(255,255,255,0.36)',
  } satisfies Record<LabPerformanceTone, string>;

  return toneColors[tone];
}

const LAB_METRIC_CURVES = {
  fcp: {
    direction: 'lower',
    min: 0,
    max: 5000,
  },
  lcp: {
    direction: 'lower',
    min: 0,
    max: 6000,
  },
  cls: {
    direction: 'lower',
    min: 0,
    max: 0.4,
  },
  inp: {
    direction: 'lower',
    min: 0,
    max: 800,
  },
  fps: {
    direction: 'higher',
    min: 30,
    max: 75,
  },
  loading: {
    direction: 'lower',
    min: 0,
    max: 600,
  },
} satisfies Record<LabPerformanceMetricKey, LabMetricCurveConfig>;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getMetricCurveRank(
  value: number | null,
  config: LabMetricCurveConfig,
) {
  if (value === null) {
    return 0.5;
  }

  const range = config.max - config.min;
  const normalized = range === 0 ? 0.5 : (value - config.min) / range;
  const rawRank = config.direction === 'higher' ? normalized : 1 - normalized;

  return clamp(rawRank, 0, 1);
}

function formatMetricCurveLabel(
  label: string,
  rank: number,
  tone: LabPerformanceTone,
) {
  if (tone === 'neutral') {
    return `${label} has not reported yet`;
  }

  return `${label} ranks ${Math.round(rank * 100)}% across the quality curve`;
}

function LabMetricCurve({
  curve,
  label,
  rawValue,
  tone,
}: {
  curve: LabMetricCurveConfig;
  label: string;
  rawValue: number | null;
  tone: LabPerformanceTone;
}) {
  const rank = getMetricCurveRank(rawValue, curve);
  const markerX = 8 + rank * 64;
  const markerColor = getMetricToneColor(tone);
  const accessibleLabel = formatMetricCurveLabel(label, rank, tone);

  return (
    <svg
      aria-label={accessibleLabel}
      className="block h-5 w-full min-w-[72px] overflow-visible"
      role="img"
      viewBox="0 0 80 20"
    >
      <path
        d="M4 17 C16 17 17 4 40 4 C63 4 64 17 76 17"
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
      <path
        d="M10 17 C21 17 23 8 40 8 C57 8 59 17 70 17"
        fill="none"
        stroke="rgba(255,255,255,0.2)"
        strokeLinecap="round"
        strokeWidth="1"
      />
      <line
        stroke="rgba(255,255,255,0.18)"
        strokeLinecap="round"
        strokeWidth="1"
        x1="8"
        x2="72"
        y1="17"
        y2="17"
      />
      <line
        stroke={markerColor}
        strokeLinecap="round"
        strokeWidth="1.5"
        x1={markerX}
        x2={markerX}
        y1="3"
        y2="18"
      />
      <circle
        cx={markerX}
        cy="17"
        fill={markerColor}
        r="2.5"
        stroke="rgba(15,15,15,0.9)"
        strokeWidth="1"
      />
    </svg>
  );
}

function LabMetricTable({ vitals }: { vitals: LabPerformanceVitals }) {
  const rows: LabMetricRow[] = [
    {
      label: 'First contentful paint (FCP)',
      attribution: vitals.attributions.fcp,
      curve: LAB_METRIC_CURVES.fcp,
      metricKey: 'fcp',
      rawValue: vitals.fcpMs,
      value: formatMilliseconds(vitals.fcpMs),
      tone: getMetricTone('fcp', vitals.fcpMs),
    },
    {
      label: 'Largest contentful paint (LCP)',
      attribution: vitals.attributions.lcp,
      curve: LAB_METRIC_CURVES.lcp,
      metricKey: 'lcp',
      rawValue: vitals.lcpMs,
      value: formatMilliseconds(vitals.lcpMs),
      tone: getMetricTone('lcp', vitals.lcpMs),
    },
    {
      label: 'Cumulative layout shift (CLS)',
      attribution: vitals.attributions.cls,
      curve: LAB_METRIC_CURVES.cls,
      metricKey: 'cls',
      rawValue: vitals.cls,
      value: formatScore(vitals.cls),
      tone: getMetricTone('cls', vitals.cls),
    },
    {
      label: 'Interaction to next paint (INP)',
      attribution: vitals.attributions.inp,
      curve: LAB_METRIC_CURVES.inp,
      metricKey: 'inp',
      rawValue: vitals.inpMs,
      value: formatMilliseconds(vitals.inpMs),
      tone: getMetricTone('inp', vitals.inpMs),
    },
    {
      label: 'Frame rate (FPS)',
      attribution: vitals.attributions.fps,
      curve: LAB_METRIC_CURVES.fps,
      metricKey: 'fps',
      rawValue: vitals.fps,
      value: formatFps(vitals.fps),
      tone: getMetricTone('fps', vitals.fps),
    },
    {
      label: 'Loading state',
      attribution: vitals.attributions.loading,
      curve: LAB_METRIC_CURVES.loading,
      metricKey: 'loading',
      rawValue: vitals.loadingMs,
      value: formatMilliseconds(vitals.loadingMs),
      tone: getMetricTone('loading', vitals.loadingMs),
    },
  ];

  return (
    <table
      aria-label="Performance metrics"
      className="h-full w-full table-fixed border-collapse text-left"
    >
      <colgroup>
        <col className="w-[34%]" />
        <col className="w-[31%]" />
        <col className="w-[92px]" />
        <col className="w-[86px]" />
      </colgroup>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.metricKey}
            className="border-b border-white/6 last:border-b-0"
          >
            <th
              className="px-1.5 py-1.5 align-middle text-[11px] font-medium leading-4"
              scope="row"
              style={{ color: 'rgba(255,255,255,0.58)' }}
            >
              <span className="block truncate">{row.label}</span>
            </th>
            <td
              className="px-1.5 py-1.5 align-middle text-[11px] leading-4"
              style={{ color: 'rgba(255,255,255,0.48)' }}
              title={row.attribution}
            >
              <span className="block truncate">{row.attribution}</span>
            </td>
            <td className="px-1.5 py-1.5 align-middle">
              <LabMetricCurve
                curve={row.curve}
                label={row.label}
                rawValue={row.rawValue}
                tone={row.tone}
              />
            </td>
            <td
              className="w-[86px] px-1.5 py-1.5 text-right align-middle text-xs font-semibold leading-4"
              style={{ color: getMetricToneColor(row.tone) }}
            >
              <span className="block truncate">{row.value}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LabMatchingTable({ vitals }: { vitals: LabPerformanceVitals }) {
  const rows = [
    {
      label: 'Matched resources',
      detail: 'Route module fetches',
      value: String(vitals.resources.moduleRequests),
      meta: `${vitals.resources.moduleDurationMs}ms total`,
      tone: vitals.resources.moduleRequests > 0 ? 'okay' : 'neutral',
    },
    {
      label: 'Long tasks',
      detail: 'Main-thread blocks',
      value: String(vitals.longTasks),
      meta: 'observed',
      tone: vitals.longTasks > 0 ? 'poor' : 'good',
    },
  ] satisfies Array<{
    detail: string;
    label: string;
    meta: string;
    tone: LabPerformanceTone;
    value: string;
  }>;

  return (
    <table
      aria-label="Performance matching metrics"
      className="w-full table-fixed border-collapse text-left"
    >
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.label}
            className="border-b border-white/6 last:border-b-0"
          >
            <th
              className="w-[34%] px-1.5 py-1 align-middle text-[11px] font-medium leading-4"
              scope="row"
              style={{ color: 'rgba(255,255,255,0.58)' }}
            >
              <span className="block truncate">{row.label}</span>
            </th>
            <td
              className="px-1.5 py-1 align-middle text-[11px] leading-4"
              style={{ color: 'rgba(255,255,255,0.48)' }}
            >
              <span className="block truncate">{row.detail}</span>
            </td>
            <td
              className="w-[86px] px-1.5 py-1 text-right align-middle text-sm font-semibold leading-4 tabular-nums"
              style={{ color: getMetricToneColor(row.tone) }}
            >
              <span className="block truncate">{row.value}</span>
            </td>
            <td
              className="w-[92px] px-1.5 py-1 text-right align-middle text-[11px] leading-4"
              style={{ color: 'rgba(255,255,255,0.42)' }}
            >
              <span className="block truncate">{row.meta}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
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
        >
          {Math.round(elapsedTimeMs)}ms elapsed
        </div>
      </div>

      <div className="mt-2 grid gap-1.5" data-testid="lab-performance-timeline">
        {visibleRows.map((event) => {
          const endPercent = clamp(
            (event.timeMs / TIMELINE_WINDOW_MS) * 100,
            0,
            100,
          );
          const startTimeMs =
            event.durationMs > 0
              ? Math.max(0, event.timeMs - event.durationMs)
              : event.timeMs;
          const startPercent = clamp(
            (startTimeMs / TIMELINE_WINDOW_MS) * 100,
            0,
            100,
          );
          const widthPercent = Math.max(1.5, endPercent - startPercent);
          const color = getTimelineEventColor(event.kind);

          return (
            <div
              key={event.id}
              aria-label={`${event.label}: ${event.detail}`}
              className="grid min-w-0 grid-cols-[42px_minmax(0,1fr)_64px] items-center gap-2 text-[11px] leading-4"
            >
              <span className="tabular-nums" style={{ color }}>
                {event.timeMs}ms
              </span>
              <span
                className="truncate"
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
                    width: `${widthPercent}%`,
                  }}
                />
                <span
                  className="absolute top-0 h-4 w-px"
                  style={{
                    backgroundColor: color,
                    left: `${startPercent}%`,
                  }}
                />
                <span
                  className="absolute top-0 h-4 w-px"
                  style={{
                    backgroundColor: color,
                    left: `${Math.min(100, startPercent + widthPercent)}%`,
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
  const { vitals, timeline, timelineTimeMs } = useLabPerformanceTelemetry(
    activePage,
    isLoading,
  );

  return (
    <section
      aria-label={`Performance analysis for ${analysis.label}`}
      className="border-t border-white/8 bg-[#151515] px-4 py-4 lg:h-[268px] lg:px-6"
      data-lab-performance-panel
    >
      <div className="grid h-full min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-stretch">
        <div className="grid min-h-0 min-w-0 grid-rows-[auto_1fr] gap-2">
          <LabMatchingTable vitals={vitals} />
          <LabMetricTable vitals={vitals} />
        </div>
        <LabPerformanceTimeline
          events={timeline}
          currentTimeMs={timelineTimeMs}
        />
      </div>
    </section>
  );
}
