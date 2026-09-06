import { useState } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from 'control-kit';

const GRAPH_SIZE = 220;
const Y_MIN = -0.5;
const Y_MAX = 1.5;
const Y_RANGE = Y_MAX - Y_MIN;
const INITIAL_FIRST_POINT = { x: 0.45, y: 0.03 };
const INITIAL_SECOND_POINT = { x: 0.36, y: 1 };
const THUMB_CLASS_NAME =
  'size-4 border-2 border-[#7597ff] bg-[#111214] shadow-[0_2px_10px_rgba(0,0,0,0.55)] transition-[transform,box-shadow] hover:scale-110 data-[dragging]:scale-110 data-[focus-visible]:ring-[#7597ff]/60';

function toPlaneValue(value: PlaneValue): PlaneValue {
  return { x: value.x, y: (value.y - Y_MIN) / Y_RANGE };
}

function fromPlaneValue(value: PlaneValue): PlaneValue {
  return { x: value.x, y: Y_MIN + value.y * Y_RANGE };
}

function toGraphX(value: number) {
  return value * GRAPH_SIZE;
}

function toGraphY(value: number) {
  return ((Y_MAX - value) / Y_RANGE) * GRAPH_SIZE;
}

function formatValue(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? '0.00' : rounded.toFixed(2);
}

function getPointValueText(label: string, value: PlaneValue) {
  return `${label} X ${formatValue(value.x)}, Y ${formatValue(value.y)}`;
}

function BezierNumberField({
  label,
  max,
  min,
  onCommit,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onCommit: (value: number) => void;
  value: number;
}) {
  const initialValue = formatValue(value);
  const [draft, setDraft] = useState(initialValue);
  const [invalid, setInvalid] = useState(false);

  function commit() {
    const nextValue = Number(draft);
    if (
      draft.trim() === '' ||
      !Number.isFinite(nextValue) ||
      nextValue < min ||
      nextValue > max
    ) {
      setInvalid(true);
      return;
    }

    setInvalid(false);
    setDraft(formatValue(nextValue));
    onCommit(nextValue);
  }

  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
        {label}
      </span>
      <input
        aria-invalid={invalid || undefined}
        aria-label={`${label} Bezier value`}
        className="h-8 min-w-0 rounded-md border border-white/12 bg-white/[0.045] px-2 font-mono text-xs tabular-nums text-white/85 outline-none transition-colors hover:border-white/22 focus:border-[#7597ff] aria-invalid:border-red-400/80"
        inputMode="decimal"
        max={max}
        min={min}
        onBlur={commit}
        onChange={(event) => {
          setDraft(event.currentTarget.value);
          setInvalid(false);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') {
            setDraft(initialValue);
            setInvalid(false);
          }
        }}
        step="0.01"
        type="number"
        value={draft}
      />
      {invalid ? (
        <span className="sr-only" role="alert">
          {label} must be between {min} and {max}.
        </span>
      ) : null}
    </label>
  );
}

export function BezierControlPointExample() {
  const [firstPoint, setFirstPoint] = useState(INITIAL_FIRST_POINT);
  const [secondPoint, setSecondPoint] = useState(INITIAL_SECOND_POINT);
  const [replayKey, setReplayKey] = useState(0);
  const firstPlaneValue = toPlaneValue(firstPoint);
  const secondPlaneValue = toPlaneValue(secondPoint);
  const cssValue = `cubic-bezier(${formatValue(firstPoint.x)}, ${formatValue(firstPoint.y)}, ${formatValue(secondPoint.x)}, ${formatValue(secondPoint.y)})`;
  const curvePath = `M 0 ${toGraphY(0)} C ${toGraphX(firstPoint.x)} ${toGraphY(firstPoint.y)}, ${toGraphX(secondPoint.x)} ${toGraphY(secondPoint.y)}, ${GRAPH_SIZE} ${toGraphY(1)}`;

  return (
    <div className="flex min-h-[480px] flex-col items-center justify-center gap-5 p-6 max-sm:min-h-[460px] max-sm:p-4">
      <style>{`
        @keyframes ck-bezier-preview {
          from { left: 0; }
          to { left: calc(100% - 14px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ck-bezier-preview-dot {
            animation: none !important;
            left: calc(100% - 14px) !important;
          }
        }
      `}</style>

      <div className="flex w-full max-w-[500px] flex-col items-center gap-4">
        <div className="rounded-xl border border-white/10 bg-[#111214] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
          <Plane
            aria-label="Cubic Bezier control points"
            className="relative size-[220px] touch-none overflow-visible [background-origin:border-box]"
            pressBehavior="nearest"
          >
            <svg
              aria-hidden="true"
              className="absolute inset-0 size-full overflow-visible"
              preserveAspectRatio="none"
              viewBox={`0 0 ${GRAPH_SIZE} ${GRAPH_SIZE}`}
            >
              <defs>
                <linearGradient id="bezier-curve-gradient" x1="0" x2="1">
                  <stop offset="0" stopColor="#6387ff" />
                  <stop offset="1" stopColor="#a88bff" />
                </linearGradient>
              </defs>
              <rect
                fill="none"
                height={GRAPH_SIZE}
                rx="7"
                stroke="rgb(255 255 255 / 0.08)"
                width={GRAPH_SIZE}
              />
              {[0, 0.25, 0.5, 0.75, 1].map((position) => (
                <line
                  key={`vertical-${position}`}
                  stroke="rgb(255 255 255 / 0.07)"
                  x1={toGraphX(position)}
                  x2={toGraphX(position)}
                  y1="0"
                  y2={GRAPH_SIZE}
                />
              ))}
              {[0, 0.5, 1].map((value) => (
                <line
                  key={`horizontal-${value}`}
                  stroke="rgb(255 255 255 / 0.07)"
                  x1="0"
                  x2={GRAPH_SIZE}
                  y1={toGraphY(value)}
                  y2={toGraphY(value)}
                />
              ))}
              <line
                stroke="rgb(117 151 255 / 0.48)"
                strokeWidth="1"
                x1="0"
                x2={toGraphX(firstPoint.x)}
                y1={toGraphY(0)}
                y2={toGraphY(firstPoint.y)}
              />
              <line
                stroke="rgb(168 139 255 / 0.48)"
                strokeWidth="1"
                x1={toGraphX(secondPoint.x)}
                x2={GRAPH_SIZE}
                y1={toGraphY(secondPoint.y)}
                y2={toGraphY(1)}
              />
              <path
                d={curvePath}
                data-bezier-curve
                fill="none"
                stroke="url(#bezier-curve-gradient)"
                strokeLinecap="round"
                strokeWidth="2.5"
              />
              <circle cx="0" cy={toGraphY(0)} fill="#6387ff" r="3.5" />
              <circle cx={GRAPH_SIZE} cy={toGraphY(1)} fill="#a88bff" r="3.5" />
            </svg>
            <PlaneThumb
              className={THUMB_CLASS_NAME}
              getAriaValueText={() =>
                getPointValueText('First control point', firstPoint)
              }
              onValueChange={(value) => setFirstPoint(fromPlaneValue(value))}
              step={0.01}
              thumbId="first-control-point"
              value={firstPlaneValue}
              xAriaLabel="First control point X"
              yAriaLabel="First control point Y"
            />
            <PlaneThumb
              className={`${THUMB_CLASS_NAME} border-[#a88bff] data-[focus-visible]:ring-[#a88bff]/60`}
              getAriaValueText={() =>
                getPointValueText('Second control point', secondPoint)
              }
              onValueChange={(value) => setSecondPoint(fromPlaneValue(value))}
              step={0.01}
              thumbId="second-control-point"
              value={secondPlaneValue}
              xAriaLabel="Second control point X"
              yAriaLabel="Second control point Y"
            />
          </Plane>
        </div>

        <div className="grid w-full grid-cols-4 gap-2 max-sm:grid-cols-2">
          <BezierNumberField
            key={`x1-${formatValue(firstPoint.x)}`}
            label="x1"
            max={1}
            min={0}
            onCommit={(x) => setFirstPoint((point) => ({ ...point, x }))}
            value={firstPoint.x}
          />
          <BezierNumberField
            key={`y1-${formatValue(firstPoint.y)}`}
            label="y1"
            max={Y_MAX}
            min={Y_MIN}
            onCommit={(y) => setFirstPoint((point) => ({ ...point, y }))}
            value={firstPoint.y}
          />
          <BezierNumberField
            key={`x2-${formatValue(secondPoint.x)}`}
            label="x2"
            max={1}
            min={0}
            onCommit={(x) => setSecondPoint((point) => ({ ...point, x }))}
            value={secondPoint.x}
          />
          <BezierNumberField
            key={`y2-${formatValue(secondPoint.y)}`}
            label="y2"
            max={Y_MAX}
            min={Y_MIN}
            onCommit={(y) => setSecondPoint((point) => ({ ...point, y }))}
            value={secondPoint.y}
          />
        </div>

        <div className="w-full rounded-lg border border-white/8 bg-white/[0.025] p-3">
          <div
            className="relative h-2 rounded-full bg-white/8"
            aria-hidden="true"
          >
            <span
              key={replayKey}
              className="ck-bezier-preview-dot absolute -top-[3px] size-3.5 rounded-full bg-[#87a3ff] shadow-[0_0_14px_rgba(117,151,255,0.6)]"
              data-bezier-preview-dot
              data-replay={replayKey}
              style={{
                animation: `ck-bezier-preview 1200ms ${cssValue} both`,
              }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <output
              aria-live="polite"
              className="min-w-0 truncate font-mono text-[11px] text-white/70"
              data-bezier-value
            >
              {cssValue}
            </output>
            <button
              className="shrink-0 rounded-md border border-white/12 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/78 outline-none transition-colors hover:border-white/22 hover:bg-white/8 focus-visible:ring-2 focus-visible:ring-[#7597ff]/60"
              onClick={() => setReplayKey((key) => key + 1)}
              type="button"
            >
              Replay
            </button>
          </div>
        </div>
      </div>

      <p className="m-0 max-w-[380px] text-center text-xs leading-5 text-white/42">
        Drag either handle, enter exact values, then replay the easing curve.
      </p>
    </div>
  );
}
