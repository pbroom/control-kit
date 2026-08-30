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

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function toCenteredVector(value: PlaneValue) {
  const x = value.x * 2 - 1;
  const y = value.y * 2 - 1;
  return {
    angle: (Math.atan2(y, x) * 180) / Math.PI,
    magnitude: Math.min(1, Math.hypot(x, y)),
    x,
    y,
  };
}

function projectToCircle(value: PlaneValue): PlaneValue {
  const { x, y } = toCenteredVector(value);
  const length = Math.hypot(x, y);
  if (length <= 1) return value;

  return { x: 0.5 + x / length / 2, y: 0.5 + y / length / 2 };
}

const initialValue: PlaneValue = { x: 0.72, y: 0.82 };

function formatForce(value: PlaneValue) {
  const vector = toCenteredVector(value);
  return `${Math.round(vector.angle)} degree force, ${formatPercent(vector.magnitude)} magnitude`;
}

export function ForceDirectionMagnitudeExample() {
  const [value, setValue] = useState(initialValue);
  const vector = toCenteredVector(value);
  const tipX = value.x * 100;
  const tipY = (1 - value.y) * 100;

  return (
    <ExampleFrame
      description="The arrow points along the force vector and grows with magnitude."
      readout={`Fx ${vector.x.toFixed(2)} · Fy ${vector.y.toFixed(2)}`}
    >
      <Plane
        aria-label="Force vector"
        className={`${EXAMPLE_PLANE_CLASS_NAME} rounded-full bg-[#121820]`}
      >
        <svg
          aria-hidden="true"
          className="absolute inset-0 size-full"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            fill="none"
            r="25"
            stroke="rgb(255 255 255 / 0.08)"
          />
          <circle
            cx="50"
            cy="50"
            fill="none"
            r="48"
            stroke="rgb(255 255 255 / 0.08)"
          />
          <line
            x1="50"
            y1="50"
            x2={tipX}
            y2={tipY}
            stroke="rgb(251 146 60)"
            strokeWidth="2"
          />
          <circle cx="50" cy="50" fill="rgb(251 146 60)" r="2.5" />
        </svg>
        <PlaneThumb
          className={`${EXAMPLE_THUMB_CLASS_NAME} border-orange-200 bg-orange-500`}
          getAriaValueText={formatForce}
          onValueChange={(nextValue) => setValue(projectToCircle(nextValue))}
          value={value}
          xAriaLabel="Horizontal force"
          yAriaLabel="Vertical force"
        >
          <span
            aria-hidden="true"
            className="size-2 rounded-full bg-orange-100"
          />
        </PlaneThumb>
      </Plane>
    </ExampleFrame>
  );
}
