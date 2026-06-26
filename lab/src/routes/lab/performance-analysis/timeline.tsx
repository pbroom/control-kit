import type {
  LabTimelineEvent,
  LabTimelineEventKind,
  LabTimelineStoryRow,
} from './types.js';

const TIMELINE_STORY_MIN_EVENT_MS = 24;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatMilliseconds(value: number | null) {
  return value === null ? 'Waiting' : `${Math.round(value)}ms`;
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

export function LabPerformanceTimeline({
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
