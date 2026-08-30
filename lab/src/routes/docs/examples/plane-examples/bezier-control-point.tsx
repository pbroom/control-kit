import { useState, type ReactNode } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from '@color-kit/control-kit';

const EXAMPLE_PLANE_CLASS_NAME =
  'relative size-[240px] touch-none overflow-hidden rounded-2xl border border-white/12 [background-origin:border-box] bg-[#171718] max-sm:size-[220px]';
const EXAMPLE_THUMB_CLASS_NAME =
  'size-6 border-2 border-white bg-[#171718] shadow-[0_2px_10px_rgba(0,0,0,0.45)]';

function PlaneExampleFrame({
  children,
  description,
  readout,
}: {
  children: ReactNode;
  description: string;
  readout: ReactNode;
}) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 p-6 max-sm:min-h-[340px] max-sm:p-4">
      {children}
      <div className="flex max-w-[300px] flex-col items-center gap-1.5 text-center">
        <output className="font-mono text-[11px] text-white/72">
          {readout}
        </output>
        <p className="m-0 text-xs leading-5 text-white/42">{description}</p>
      </div>
    </div>
  );
}

function GridLayer({ subdivisions = 4 }: { subdivisions?: number }) {
  const step = 100 / subdivisions;
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0"
      style={{
        backgroundImage:
          'linear-gradient(to right, rgb(255 255 255 / 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.08) 1px, transparent 1px)',
        backgroundSize: `${step}% ${step}%`,
      }}
    />
  );
}

const initialValue: PlaneValue = { x: 0.32, y: 0.76 };

function formatBezierPoint(value: PlaneValue) {
  return `Bezier control point X ${value.x.toFixed(2)}, Y ${value.y.toFixed(2)}`;
}

export function BezierControlPointExample() {
  const [value, setValue] = useState(initialValue);
  const controlX = value.x * 240;
  const controlY = (1 - value.y) * 240;

  return (
    <PlaneExampleFrame
      description="Shape an easing curve by moving its first control point."
      readout={`cubic-bezier(${value.x.toFixed(2)}, ${value.y.toFixed(2)}, 0.75, 1)`}
    >
      <Plane
        aria-label="Bezier control point"
        className={EXAMPLE_PLANE_CLASS_NAME}
      >
        <GridLayer />
        <svg
          aria-hidden="true"
          className="absolute inset-0 size-full"
          preserveAspectRatio="none"
          viewBox="0 0 240 240"
        >
          <line
            stroke="rgb(255 255 255 / 0.28)"
            strokeDasharray="4 5"
            x1="0"
            x2={controlX}
            y1="240"
            y2={controlY}
          />
          <line
            stroke="rgb(255 255 255 / 0.2)"
            strokeDasharray="4 5"
            x1="180"
            x2="240"
            y1="0"
            y2="0"
          />
          <path
            d={`M 0 240 C ${controlX} ${controlY}, 180 0, 240 0`}
            fill="none"
            stroke="#a78bfa"
            strokeLinecap="round"
            strokeWidth="4"
          />
        </svg>
        <PlaneThumb
          className={EXAMPLE_THUMB_CLASS_NAME}
          getAriaValueText={formatBezierPoint}
          onValueChange={setValue}
          value={value}
          xAriaLabel="Bezier control point X"
          yAriaLabel="Bezier control point Y"
        />
      </Plane>
    </PlaneExampleFrame>
  );
}
