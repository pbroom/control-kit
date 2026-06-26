import { useCallback, useEffect, useRef, useState } from 'react';
import type { LabPageKey } from '../shared.js';
import { LAB_PAGE_RESOURCE_HINTS, LAB_PERFORMANCE_ANALYSIS } from './config.js';
import type {
  InteractionPerformanceEntry,
  LabPerformanceAttributions,
  LabPerformanceResourceStats,
  LabPerformanceVitals,
  LabPreviewLcpCandidate,
  LabTimelineEvent,
  LabTimelineEventKind,
  LargestContentfulPaintPerformanceEntry,
  LayoutShiftPerformanceEntry,
} from './types.js';

const MAX_TIMELINE_EVENTS = 12;
const LAB_COMPONENT_PREVIEW_SELECTOR = '[data-lab-component-preview]';
const LAB_CROSSFADE_EXIT_SELECTOR = '[data-lab-crossfade-phase="exit"]';
const LAB_CROSSFADE_STRUCTURAL_SELECTOR =
  '[data-lab-crossfade-slot], [data-lab-crossfade-phase]';
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
export const LAB_LCP_PENDING_ATTRIBUTION = 'Largest preview element pending';
export const LAB_LCP_NO_PREVIEW_CANDIDATE_ATTRIBUTION =
  'No preview LCP candidate';
const LAB_PERFORMANCE_PANEL_LAYOUT_SHIFT_SUPPRESSION_MS = 700;
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

export function suppressAnalysisSurfaceLayoutShifts() {
  analysisSurfaceLayoutShiftSuppressionUntil =
    getPerformanceTime() + LAB_PERFORMANCE_PANEL_LAYOUT_SHIFT_SUPPRESSION_MS;
}

function isAnalysisSurfaceTelemetrySuppressedAt(time: number) {
  return time <= analysisSurfaceLayoutShiftSuppressionUntil;
}

function isPerformancePanelEventTarget(target: EventTarget | null | undefined) {
  return (
    target instanceof Element &&
    target.closest('[data-lab-performance-panel]') !== null
  );
}

function collectPageResourceStats(
  page: LabPageKey,
  routeStart: number,
): LabPerformanceResourceStats {
  const hints = LAB_PAGE_RESOURCE_HINTS[page];
  const resources = performance.getEntriesByType(
    'resource',
  ) as PerformanceResourceTiming[];
  const matchingResources = resources.filter(
    (resource) =>
      resource.startTime >= routeStart &&
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

function isComponentPreviewLcpCandidate(
  entry: LargestContentfulPaintPerformanceEntry,
) {
  return Boolean(
    entry.element?.closest(LAB_COMPONENT_PREVIEW_SELECTOR) &&
    !entry.element.matches(LAB_CROSSFADE_STRUCTURAL_SELECTOR) &&
    !entry.element.closest(LAB_CROSSFADE_EXIT_SELECTOR),
  );
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
      element.matches(LAB_CROSSFADE_STRUCTURAL_SELECTOR) ||
      element.closest(LAB_CROSSFADE_EXIT_SELECTOR) ||
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
  routeStart: number,
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
    resources: collectPageResourceStats(activePage, routeStart),
    attributions: getInitialAttributions(isLoading),
  };
}

export function useLabPerformanceTelemetry(
  activePage: LabPageKey,
  isLoading: boolean,
) {
  const routeStartRef = useRef(getPerformanceTime());
  const loadingStartRef = useRef<number | null>(
    isLoading ? routeStartRef.current : null,
  );
  const [timelineTimeMs, setTimelineTimeMs] = useState(0);
  const [vitals, setVitals] = useState(() =>
    getInitialVitals(activePage, isLoading, routeStartRef.current),
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
      const initialVitals = getInitialVitals(activePage, isLoading, routeStart);

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
      const resources = collectPageResourceStats(
        activePage,
        routeStartRef.current,
      );

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
      const resources = collectPageResourceStats(
        activePage,
        routeStartRef.current,
      );

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
          .filter(
            (entry) =>
              entry.startTime >= routeStartRef.current &&
              isComponentPreviewLcpCandidate(entry),
          )
          .at(-1);
        if (!candidate) {
          return;
        }
        const candidateTime =
          candidate.renderTime || candidate.loadTime || candidate.startTime;
        const lcpMs = Math.max(
          0,
          Math.round(candidateTime - routeStartRef.current),
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
          candidateTime,
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
            (entry) =>
              entry.startTime >= routeStartRef.current &&
              !isAnalysisSurfaceTelemetrySuppressedAt(entry.startTime),
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
        const longTaskEntries = entries.filter(
          (entry) =>
            entry.startTime >= routeStartRef.current &&
            !isAnalysisSurfaceTelemetrySuppressedAt(entry.startTime),
        );
        if (longTaskEntries.length === 0) {
          return;
        }
        setVitals((current) => ({
          ...current,
          longTasks: current.longTasks + longTaskEntries.length,
        }));
        for (const entry of longTaskEntries) {
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
