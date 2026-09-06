import { useState } from 'react';
import {
  ControlField,
  Plane,
  PlaneThumb,
  type PlaneValue,
  type PlaneValueChangeDetails,
} from 'control-kit';

const GRAPH_SIZE = 360;
const GRID_DIVISIONS = 12;
const INNER_GRID_START = 2;
const INNER_GRID_END = 10;
const INNER_GRID_SPAN = INNER_GRID_END - INNER_GRID_START;
const X_MIN = 0;
const X_MAX = 1;
const Y_MIN = -0.25;
const Y_MAX = 1.25;
const CSS_STEP = 0.01;
const PLANE_STEP = (INNER_GRID_SPAN / GRID_DIVISIONS) * CSS_STEP;
const INITIAL_FIRST_POINT = { x: 0.45, y: 0.03 };
const INITIAL_SECOND_POINT = { x: 0.36, y: 1 };
const START_POINT = { x: 0, y: 0 };
const END_POINT = { x: 1, y: 1 };
const ORANGE = '#fb923c';
const THUMB_CLASS_NAME =
  'size-4 border-2 border-[#fb923c] bg-[#111214] shadow-[0_2px_10px_rgba(0,0,0,0.55)] transition-[transform,box-shadow] hover:scale-110 data-[dragging]:scale-110 data-[focus-visible]:ring-[#fb923c]/55';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toPlaneCoordinate(value: number) {
  return (INNER_GRID_START + value * INNER_GRID_SPAN) / GRID_DIVISIONS;
}

function fromPlaneCoordinate(value: number) {
  return (value * GRID_DIVISIONS - INNER_GRID_START) / INNER_GRID_SPAN;
}

function toPlaneValue(value: PlaneValue): PlaneValue {
  return {
    x: toPlaneCoordinate(value.x),
    y: toPlaneCoordinate(value.y),
  };
}

function fromPlaneValue(value: PlaneValue): PlaneValue {
  return {
    x: clamp(fromPlaneCoordinate(value.x), X_MIN, X_MAX),
    y: clamp(fromPlaneCoordinate(value.y), Y_MIN, Y_MAX),
  };
}

function toGraphX(value: number) {
  return toPlaneCoordinate(value) * GRAPH_SIZE;
}

function toGraphY(value: number) {
  return (
    ((GRID_DIVISIONS - INNER_GRID_START - value * INNER_GRID_SPAN) /
      GRID_DIVISIONS) *
    GRAPH_SIZE
  );
}

function formatValue(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? '0.00' : rounded.toFixed(2);
}

function getPointValueText(label: string, value: PlaneValue) {
  return `${label} X ${formatValue(value.x)}, Y ${formatValue(value.y)}`;
}

function isShiftModified(details: PlaneValueChangeDetails) {
  return (
    details.interaction === 'pointer' &&
    details.originalEvent !== undefined &&
    'shiftKey' in details.originalEvent &&
    details.originalEvent.shiftKey === true
  );
}

function snapToNearestAxis(value: PlaneValue, anchor: PlaneValue): PlaneValue {
  const deltaX = value.x - anchor.x;
  const deltaY = value.y - anchor.y;
  const radius = Math.hypot(deltaX, deltaY);

  if (radius === 0) return anchor;

  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    const direction = Math.sign(deltaX) || (anchor.x === X_MIN ? 1 : -1);
    return {
      x: clamp(anchor.x + direction * radius, X_MIN, X_MAX),
      y: anchor.y,
    };
  }

  const direction = Math.sign(deltaY) || 1;
  return {
    x: anchor.x,
    y: clamp(anchor.y + direction * radius, Y_MIN, Y_MAX),
  };
}

function getNextPoint(
  value: PlaneValue,
  details: PlaneValueChangeDetails,
  anchor: PlaneValue,
) {
  const point = fromPlaneValue(value);
  return isShiftModified(details) ? snapToNearestAxis(point, anchor) : point;
}

function BezierNumberField({
  label,
  max,
  min,
  onValueChange,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onValueChange: (value: number) => void;
  value: number;
}) {
  return (
    <ControlField.Root
      className="min-w-0 [--ck-border-focus:#fb923c] [--ck-surface:rgb(255_255_255/0.045)]"
      format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
      max={max}
      min={min}
      onValueChange={(nextValue) => {
        if (nextValue !== null) onValueChange(nextValue);
      }}
      largeStep={CSS_STEP * 10}
      pageStep={CSS_STEP * 10}
      smallStep={CSS_STEP / 10}
      step={CSS_STEP}
      value={value}
    >
      <ControlField.Group className="h-8 rounded-md border-white/12 bg-white/[0.045] hover:border-white/22">
        <ControlField.ScrubArea
          aria-label={`Scrub ${label} Bezier value`}
          className="w-7 font-mono text-[10px] uppercase tracking-[0.08em]"
        >
          <span aria-hidden="true">{label}</span>
        </ControlField.ScrubArea>
        <ControlField.Input
          aria-label={`${label} Bezier value`}
          className="px-1 font-mono text-xs tabular-nums text-white/85"
          inputMode="decimal"
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
        />
      </ControlField.Group>
    </ControlField.Root>
  );
}

export function BezierControlPointExample() {
  const [firstPoint, setFirstPoint] = useState(INITIAL_FIRST_POINT);
  const [secondPoint, setSecondPoint] = useState(INITIAL_SECOND_POINT);
  const [replayKey, setReplayKey] = useState(0);
  const firstPlaneValue = toPlaneValue(firstPoint);
  const secondPlaneValue = toPlaneValue(secondPoint);
  const cssValue = `cubic-bezier(${formatValue(firstPoint.x)}, ${formatValue(firstPoint.y)}, ${formatValue(secondPoint.x)}, ${formatValue(secondPoint.y)})`;
  const curvePath = `M ${toGraphX(0)} ${toGraphY(0)} C ${toGraphX(firstPoint.x)} ${toGraphY(firstPoint.y)}, ${toGraphX(secondPoint.x)} ${toGraphY(secondPoint.y)}, ${toGraphX(1)} ${toGraphY(1)}`;

  return (
    <div className="flex min-h-[660px] flex-col items-center justify-center gap-5 p-6 max-sm:min-h-[580px] max-sm:p-4">
      <style>{`
        @keyframes ck-bezier-preview {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ck-bezier-preview-square {
            animation: none !important;
          }
        }
      `}</style>

      <div className="flex w-full max-w-[500px] flex-col items-center gap-4">
        <div className="w-full max-w-[384px] rounded-xl border border-white/10 bg-[#111214] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
          <Plane
            aria-label="Cubic Bezier control points"
            className="relative aspect-square w-full touch-none overflow-visible"
            pressBehavior="nearest"
          >
            <svg
              aria-hidden="true"
              className="absolute inset-0 size-full overflow-visible"
              preserveAspectRatio="none"
              viewBox={`0 0 ${GRAPH_SIZE} ${GRAPH_SIZE}`}
            >
              <rect
                fill="none"
                height={GRAPH_SIZE}
                rx="7"
                stroke="rgb(255 255 255 / 0.08)"
                width={GRAPH_SIZE}
              />
              {Array.from({ length: GRID_DIVISIONS + 1 }, (_, index) => {
                const position = (index / GRID_DIVISIONS) * GRAPH_SIZE;
                return (
                  <line
                    key={`vertical-${index}`}
                    data-grid-line="vertical"
                    stroke="rgb(255 255 255 / 0.055)"
                    x1={position}
                    x2={position}
                    y1="0"
                    y2={GRAPH_SIZE}
                  />
                );
              })}
              {Array.from({ length: GRID_DIVISIONS + 1 }, (_, index) => {
                const position = (index / GRID_DIVISIONS) * GRAPH_SIZE;
                return (
                  <line
                    key={`horizontal-${index}`}
                    data-grid-line="horizontal"
                    stroke="rgb(255 255 255 / 0.055)"
                    x1="0"
                    x2={GRAPH_SIZE}
                    y1={position}
                    y2={position}
                  />
                );
              })}
              <line
                stroke="rgb(251 146 60 / 0.48)"
                strokeWidth="1"
                x1={toGraphX(0)}
                x2={toGraphX(firstPoint.x)}
                y1={toGraphY(0)}
                y2={toGraphY(firstPoint.y)}
              />
              <line
                stroke="rgb(251 146 60 / 0.48)"
                strokeWidth="1"
                x1={toGraphX(secondPoint.x)}
                x2={toGraphX(1)}
                y1={toGraphY(secondPoint.y)}
                y2={toGraphY(1)}
              />
              <path
                d={curvePath}
                data-bezier-curve
                fill="none"
                stroke={ORANGE}
                strokeLinecap="round"
                strokeWidth="2.5"
              />
              <circle
                cx={toGraphX(0)}
                cy={toGraphY(0)}
                data-bezier-endpoint="start"
                fill={ORANGE}
                r="3.5"
              />
              <circle
                cx={toGraphX(1)}
                cy={toGraphY(1)}
                data-bezier-endpoint="end"
                fill={ORANGE}
                r="3.5"
              />
            </svg>
            <PlaneThumb
              className={THUMB_CLASS_NAME}
              getAriaValueText={() =>
                getPointValueText('First control point', firstPoint)
              }
              onValueChange={(value, details) =>
                setFirstPoint(getNextPoint(value, details, START_POINT))
              }
              largeStep={PLANE_STEP * 10}
              smallStep={PLANE_STEP / 10}
              step={PLANE_STEP}
              thumbId="first-control-point"
              value={firstPlaneValue}
              xAriaLabel="First control point X"
              yAriaLabel="First control point Y"
            />
            <PlaneThumb
              className={THUMB_CLASS_NAME}
              getAriaValueText={() =>
                getPointValueText('Second control point', secondPoint)
              }
              onValueChange={(value, details) =>
                setSecondPoint(getNextPoint(value, details, END_POINT))
              }
              largeStep={PLANE_STEP * 10}
              smallStep={PLANE_STEP / 10}
              step={PLANE_STEP}
              thumbId="second-control-point"
              value={secondPlaneValue}
              xAriaLabel="Second control point X"
              yAriaLabel="Second control point Y"
            />
          </Plane>
        </div>

        <div className="grid w-full grid-cols-4 gap-2 max-sm:grid-cols-2">
          <BezierNumberField
            label="x1"
            max={X_MAX}
            min={X_MIN}
            onValueChange={(x) => setFirstPoint((point) => ({ ...point, x }))}
            value={firstPoint.x}
          />
          <BezierNumberField
            label="y1"
            max={Y_MAX}
            min={Y_MIN}
            onValueChange={(y) => setFirstPoint((point) => ({ ...point, y }))}
            value={firstPoint.y}
          />
          <BezierNumberField
            label="x2"
            max={X_MAX}
            min={X_MIN}
            onValueChange={(x) => setSecondPoint((point) => ({ ...point, x }))}
            value={secondPoint.x}
          />
          <BezierNumberField
            label="y2"
            max={Y_MAX}
            min={Y_MIN}
            onValueChange={(y) => setSecondPoint((point) => ({ ...point, y }))}
            value={secondPoint.y}
          />
        </div>

        <div
          className="flex w-full items-center gap-4 py-1"
          data-bezier-preview
        >
          <div
            className="ck-bezier-preview-square relative size-11 shrink-0 rounded-md bg-[#fb923c] shadow-[0_5px_18px_rgba(251,146,60,0.22)]"
            data-bezier-preview-square
            data-replay={replayKey}
            key={replayKey}
            style={{ animation: `ck-bezier-preview 1200ms ${cssValue} both` }}
          >
            <span
              aria-hidden="true"
              className="absolute right-1.5 top-1.5 size-2 rounded-sm bg-[#111214]/80"
            />
          </div>
          <output
            aria-live="polite"
            className="min-w-0 flex-1 truncate font-mono text-[11px] text-white/70"
            data-bezier-value
          >
            {cssValue}
          </output>
          <button
            className="shrink-0 rounded-md border border-white/12 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/78 outline-none transition-colors hover:border-white/22 hover:bg-white/8 focus-visible:ring-2 focus-visible:ring-[#fb923c]/55"
            onClick={() => setReplayKey((key) => key + 1)}
            type="button"
          >
            Replay
          </button>
        </div>
      </div>

      <p className="m-0 max-w-[420px] text-center text-xs leading-5 text-white/42">
        Drag either handle. Hold Shift to snap its tangent to a 90° axis, or
        enter exact values before replaying the rotation. Y values are limited
        to the visible −0.25–1.25 range.
      </p>
    </div>
  );
}
