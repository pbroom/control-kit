import { useState, type ReactNode } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from '@color-kit/control-kit';

const EXAMPLE_PLANE_CLASS_NAME =
  'relative size-[240px] touch-none overflow-hidden rounded-2xl border border-white/12 bg-[#171718] max-sm:size-[220px]';
const EXAMPLE_THUMB_CLASS_NAME =
  'size-6 border-2 border-white bg-[#171718] shadow-[0_2px_10px_rgba(0,0,0,0.45)]';

function ExampleFrame({
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

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

const initialValue: PlaneValue = { x: 0.56, y: 0.7 };

function formatCurvePoint(value: PlaneValue) {
  return `${formatPercent(value.x)} input, ${formatPercent(value.y)} output`;
}

export function ColorCurvesExample() {
  const [value, setValue] = useState(initialValue);
  const controlX = value.x * 100;
  const controlY = (1 - value.y) * 100;

  return (
    <ExampleFrame
      description="Move the control point to reshape the image tone curve."
      readout={`Input ${formatPercent(value.x)} · Output ${formatPercent(value.y)}`}
    >
      <Plane
        aria-label="Color curve control point"
        className={`${EXAMPLE_PLANE_CLASS_NAME} bg-[#101112]`}
      >
        <GridLayer subdivisions={4} />
        <svg
          aria-hidden="true"
          className="absolute inset-0 size-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <line
            x1="0"
            y1="100"
            x2="100"
            y2="0"
            stroke="rgb(255 255 255 / 0.16)"
            strokeDasharray="2 3"
          />
          <path
            d={`M 0 100 C ${controlX * 0.45} ${100 - (100 - controlY) * 0.35}, ${controlX * 0.72} ${controlY}, ${controlX} ${controlY} S ${100 - (100 - controlX) * 0.38} ${controlY * 0.4}, 100 0`}
            fill="none"
            stroke="rgb(250 204 21)"
            strokeWidth="2"
          />
        </svg>
        <PlaneThumb
          className={`${EXAMPLE_THUMB_CLASS_NAME} border-yellow-100 bg-yellow-400`}
          getAriaValueText={formatCurvePoint}
          onValueChange={setValue}
          value={value}
          xAriaLabel="Input tone"
          yAriaLabel="Output tone"
        />
      </Plane>
    </ExampleFrame>
  );
}
