import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { LabPageKey } from './shared.js';

type LabPerformanceTone = 'good' | 'okay' | 'poor' | 'neutral';

type LabPerformanceAnalysis = {
  label: string;
  summary: string;
  guardrail: string;
};

type LabPerformanceResourceStats = {
  moduleRequests: number;
  moduleDurationMs: number;
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
};

type LabTimelineEventKind =
  | 'route'
  | 'loading'
  | 'resource'
  | 'vital'
  | 'interaction'
  | 'long-task';

type LabTimelineEvent = {
  id: string;
  kind: LabTimelineEventKind;
  label: string;
  detail: string;
  timeMs: number;
};

type LayoutShiftPerformanceEntry = PerformanceEntry & {
  value: number;
  hadRecentInput: boolean;
};

type LargestContentfulPaintPerformanceEntry = PerformanceEntry & {
  renderTime?: number;
  loadTime?: number;
  size?: number;
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
    summary:
      'Canvas-heavy preview with gamut math, worker-backed plane queries, and pointer-driven raster updates.',
    guardrail: 'Watch drag sampling, worker handoff, and plane chunk fetches.',
  },
  input: {
    label: 'Input Primitive',
    summary:
      'Single controlled input with scrub gestures, parser paths, and formatted commit behavior.',
    guardrail:
      'Watch lazy chunk time, scrub rerenders, and input interaction latency.',
  },
  inputMulti: {
    label: 'Input Multi',
    summary:
      'Four coordinated primitive inputs sharing active-field state and per-channel numeric constraints.',
    guardrail:
      'Watch sibling field fan-out and per-channel normalization work.',
  },
  checkbox: {
    label: 'Checkbox',
    summary:
      'Compact boolean control with minimal render cost and a single controlled checked state.',
    guardrail: 'Watch dense-list repeats and interaction responsiveness.',
  },
  slider: {
    label: 'Slider',
    summary:
      'Gradient rail preview with color interpolation, pointer updates, and optional chroma markers.',
    guardrail:
      'Watch drag frame rate, gradient recalculation, and marker render cost.',
  },
  tooltip: {
    label: 'Tooltip',
    summary:
      'Portal-based overlay with delayed hover activation and modest layout work around placement.',
    guardrail: 'Watch hover timers, portal mount cost, and layout shifts.',
  },
  menu: {
    label: 'Menu',
    summary:
      'Layered menu surface with optional shortcuts, dividers, submenus, and disabled states.',
    guardrail:
      'Watch portal layout, submenu mount cost, and keyboard interaction latency.',
  },
  select: {
    label: 'Select',
    summary:
      'Menu-backed select trigger with keyboard state, icon variants, and reusable option rows.',
    guardrail: 'Watch trigger-to-list paint time and option remounts.',
  },
  toggleButton: {
    label: 'Toggle Button',
    summary:
      'Single pressed-state control that mostly exercises visual-state styling and icon layout.',
    guardrail: 'Watch pressed-state paint and interaction-to-next-paint.',
  },
  toggle: {
    label: 'Toggle Group',
    summary:
      'Grouped controls with shared selection state, icon placement modes, and focus movement.',
    guardrail:
      'Watch roving focus, group rerenders, and selected-value fan-out.',
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
): LabTimelineEvent {
  return {
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
  };
}

function getMetricTone(
  key: 'fcp' | 'lcp' | 'cls' | 'inp' | 'fps' | 'loading',
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
    ) => {
      setTimeline((events) =>
        appendTimelineEvent(
          events,
          createTimelineEvent(kind, label, detail, routeStartRef.current, at),
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
    setVitals((current) => ({
      ...getInitialVitals(activePage, isLoading),
      fcpMs: current.fcpMs ?? readInitialPaintMetric('first-contentful-paint'),
      lcpMs: current.lcpMs,
      cls: current.cls,
      inpMs: current.inpMs,
    }));
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
      }));
      addTimelineEvent(
        'loading',
        'Slots ready',
        `${duration}ms loading state`,
        now,
      );
      addTimelineEvent(
        'resource',
        resources.moduleRequests > 0
          ? 'Matching resource fetched'
          : 'No matching resource',
        `${resources.moduleRequests} entries / ${resources.moduleDurationMs}ms`,
        now,
      );
    } else {
      setVitals((current) => ({
        ...current,
        loadingMs: current.loadingMs ?? 0,
        resources: collectPageResourceStats(activePage),
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
        setVitals((current) => ({ ...current, fcpMs }));
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
        setVitals((current) => ({ ...current, lcpMs }));
        addTimelineEvent(
          'vital',
          'LCP candidate',
          `${lcpMs}ms / ${Math.round(candidate.size ?? 0)}px`,
          candidate.startTime,
        );
      },
      { type: 'largest-contentful-paint', buffered: true },
    );

    observe(
      'layout-shift',
      (entries) => {
        let addedShift = 0;
        for (const entry of entries as LayoutShiftPerformanceEntry[]) {
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
        }));
        addTimelineEvent(
          'interaction',
          'Interaction',
          `${interaction.name || 'input'} ${inpMs}ms`,
          interaction.startTime,
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

function LabMetricTable({ vitals }: { vitals: LabPerformanceVitals }) {
  const rows: LabMetricRow[] = [
    {
      label: 'First contentful paint (FCP)',
      value: formatMilliseconds(vitals.fcpMs),
      tone: getMetricTone('fcp', vitals.fcpMs),
    },
    {
      label: 'Largest contentful paint (LCP)',
      value: formatMilliseconds(vitals.lcpMs),
      tone: getMetricTone('lcp', vitals.lcpMs),
    },
    {
      label: 'Cumulative layout shift (CLS)',
      value: formatScore(vitals.cls),
      tone: getMetricTone('cls', vitals.cls),
    },
    {
      label: 'Interaction to next paint (INP)',
      value: formatMilliseconds(vitals.inpMs),
      tone: getMetricTone('inp', vitals.inpMs),
    },
    {
      label: 'Frame rate (FPS)',
      value: formatFps(vitals.fps),
      tone: getMetricTone('fps', vitals.fps),
    },
    {
      label: 'Loading state',
      value: formatMilliseconds(vitals.loadingMs),
      tone: getMetricTone('loading', vitals.loadingMs),
    },
  ];

  return (
    <table
      aria-label="Performance metrics"
      className="h-full w-full table-fixed border-collapse text-left"
    >
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.label}
            className="border-b border-white/6 last:border-b-0"
          >
            <th
              className="px-1.5 py-1.5 align-middle text-[11px] font-medium leading-4"
              scope="row"
              style={{ color: 'rgba(255,255,255,0.58)' }}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: getMetricToneColor(row.tone) }}
                />
                <span className="block truncate">{row.label}</span>
              </span>
            </th>
            <td className="w-[96px] px-1.5 py-1.5 text-right align-middle text-sm font-semibold leading-4 text-white">
              <span className="block truncate">{row.value}</span>
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
  const visibleEvents = routeEvent
    ? [routeEvent, ...events.filter((event) => event !== routeEvent).slice(-7)]
    : events.slice(-8);
  const visibleRows = routeEvent
    ? [routeEvent, ...events.filter((event) => event !== routeEvent).slice(-4)]
    : events.slice(-5);

  return (
    <div className="min-w-0 rounded-[10px] border border-white/8 bg-white/[0.025] p-3">
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

      <div
        className="relative mt-3 h-12 overflow-hidden"
        data-testid="lab-performance-timeline"
      >
        <div className="absolute left-0 right-0 top-6 h-px bg-white/10" />
        {visibleEvents.map((event, index) => {
          const left = Math.min(
            96,
            Math.max(0, (event.timeMs / TIMELINE_WINDOW_MS) * 96),
          );
          const top = 12 + (index % 2) * 10;
          const color = getTimelineEventColor(event.kind);

          return (
            <div
              key={event.id}
              aria-label={`${event.label}: ${event.detail}`}
              className="pointer-events-none absolute"
              style={{
                left: `${left}%`,
                top,
                transform: 'translateX(-50%)',
              }}
            >
              <div
                className="mx-auto h-5 w-px"
                style={{ backgroundColor: color }}
              />
              <div
                className="size-2 rounded-full shadow-[0_0_0_3px_rgba(255,255,255,0.04)]"
                style={{ backgroundColor: color }}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-2 grid gap-1">
        {visibleRows.map((event) => (
          <div
            key={`${event.id}-row`}
            className="grid min-w-0 grid-cols-[44px_90px_minmax(0,1fr)] gap-2 text-[11px] leading-4"
          >
            <span style={{ color: getTimelineEventColor(event.kind) }}>
              {event.timeMs}ms
            </span>
            <span
              className="truncate font-medium"
              style={{ color: 'rgba(255,255,255,0.68)' }}
            >
              {event.label}
            </span>
            <span
              className="truncate"
              style={{ color: 'rgba(255,255,255,0.58)' }}
            >
              {event.detail}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BrowserSupportNote({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-white/8 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">
      {children}
    </span>
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
  const summary = useMemo(
    () =>
      `${vitals.resources.moduleRequests} matched resources, ${vitals.longTasks} long tasks observed`,
    [vitals.longTasks, vitals.resources.moduleRequests],
  );

  return (
    <section
      aria-label={`Performance analysis for ${analysis.label}`}
      className="border-t border-white/8 bg-[#151515] px-4 py-4 lg:h-[268px] lg:px-6"
      data-lab-performance-panel
    >
      <div className="grid h-full min-w-0 gap-4 lg:grid-cols-[minmax(210px,0.75fr)_minmax(390px,1.1fr)_minmax(280px,1fr)] lg:items-stretch">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p
              className="text-[10px] font-medium uppercase tracking-[0.16em]"
              style={{ color: 'rgba(255,255,255,0.42)' }}
            >
              Performance Analysis
            </p>
            <BrowserSupportNote>Live</BrowserSupportNote>
          </div>
          <h2 className="mt-2 truncate text-sm font-semibold text-white">
            {analysis.label}
          </h2>
          <p
            className="mt-1 text-xs leading-5"
            style={{ color: 'rgba(255,255,255,0.56)' }}
          >
            {analysis.summary}
          </p>
          <p
            className="mt-2 text-[11px] leading-4"
            style={{ color: 'rgba(255,255,255,0.46)' }}
          >
            {analysis.guardrail}
          </p>
          <p
            className="mt-3 text-[11px] leading-4"
            style={{ color: 'rgba(255,255,255,0.42)' }}
          >
            {summary}
          </p>
        </div>

        <LabMetricTable vitals={vitals} />
        <LabPerformanceTimeline
          events={timeline}
          currentTimeMs={timelineTimeMs}
        />
      </div>
    </section>
  );
}
