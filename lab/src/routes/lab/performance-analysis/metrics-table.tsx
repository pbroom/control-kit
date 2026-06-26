import {
  closestCenter,
  DndContext,
  MouseSensor,
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
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type {
  CSSProperties,
  FocusEvent as ReactFocusEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { LAB_LCP_NO_PREVIEW_CANDIDATE_ATTRIBUTION } from './telemetry.js';
import type {
  LabMetricRangeCardState,
  LabMetricRangeCardPlacement,
  LabMetricRangeConfig,
  LabMetricRangeSegment,
  LabPerformanceMetricKey,
  LabPerformanceTone,
  LabPerformanceVitals,
} from './types.js';

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

type LabMetricRowId = (typeof LAB_METRIC_ROW_IDS)[number];

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

const LAB_METRIC_TABLE_COLUMNS = {
  full: {
    attribution: '31%',
    label: '34%',
  },
  abbreviated: {
    attribution: '41%',
    label: '24%',
  },
} satisfies Record<
  'abbreviated' | 'full',
  { attribution: string; label: string }
>;

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
const LAB_METRIC_RANGE_CARD_WIDTH = 288;
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
      {rangeCard && typeof document !== 'undefined'
        ? createPortal(
            <div
              className={[
                'pointer-events-none fixed z-[70] w-[288px] max-w-[calc(100vw-16px)] rounded-[12px] border border-white/8 bg-white/[0.03] px-3 py-2.5 text-[10px] leading-4 text-white/70 opacity-100 shadow-[0_18px_45px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur',
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
              <div className="mb-1 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <span
                  className="min-w-0 font-medium text-white/85"
                  data-lab-performance-metric-range-card-copy
                >
                  {label}
                </span>
                <span
                  className="shrink-0 font-semibold"
                  data-lab-performance-metric-range-card-copy
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
                        className={`min-w-0 ${
                          isActiveSegment
                            ? 'text-white/[0.88]'
                            : 'text-white/[0.52]'
                        }`}
                        data-lab-performance-metric-range-card-copy
                      >
                        {getMetricRangeDisplayLabel(segment.tone)}
                      </span>
                      <span
                        className={`whitespace-nowrap font-medium ${
                          isActiveSegment
                            ? 'text-white/[0.88]'
                            : 'text-white/[0.52]'
                        }`}
                        data-lab-performance-metric-range-card-copy
                      >
                        {formatMetricRangeValue(segment.start, range)} -{' '}
                        {formatMetricRangeValue(segment.end, range)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
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
        'border-b border-white/6 outline-none last:border-b-0 focus-visible:bg-white/[0.035] focus-visible:ring-1 focus-visible:ring-[#5288db]/70',
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

export function LabMetricTable({ vitals }: { vitals: LabPerformanceVitals }) {
  const [rowOrder, setRowOrder] = useState(readStoredMetricRowOrder);
  const [abbreviateMetricLabels, setAbbreviateMetricLabels] = useState(false);
  const labelMeasureRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, LAB_METRIC_ROW_SENSOR_OPTIONS),
    useSensor(MouseSensor, LAB_METRIC_ROW_SENSOR_OPTIONS),
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
  const tableColumns = abbreviateMetricLabels
    ? LAB_METRIC_TABLE_COLUMNS.abbreviated
    : LAB_METRIC_TABLE_COLUMNS.full;
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
          <col style={{ width: tableColumns.label }} />
          <col style={{ width: tableColumns.attribution }} />
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
