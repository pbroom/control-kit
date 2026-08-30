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

const initialValue: PlaneValue = { x: 0.5, y: 0.12 };
const particles = [18, 34, 50, 66, 82];

function formatGravity(value: PlaneValue) {
  const vector = toCenteredVector(value);
  return `${Math.round(vector.angle)} degree gravity, ${formatPercent(vector.magnitude)} strength`;
}

export function GravityVectorExample() {
  const [value, setValue] = useState(initialValue);
  const vector = toCenteredVector(value);

  return (
    <ExampleFrame
      description="Particles align with the selected gravity field."
      readout={`${vector.x.toFixed(2)}g X · ${vector.y.toFixed(2)}g Y`}
    >
      <Plane
        aria-label="Gravity vector"
        className={`${EXAMPLE_PLANE_CLASS_NAME} rounded-full bg-[radial-gradient(circle_at_center,#1f2937,#090d13)]`}
      >
        <div
          aria-hidden="true"
          className="absolute inset-5"
          style={{ transform: `rotate(${-vector.angle}deg)` }}
        >
          {particles.map((position, index) => (
            <span
              className="absolute top-1/2 size-2 -translate-y-1/2 rounded-full bg-indigo-200/80 shadow-[0_0_12px_rgb(165_180_252/0.8)]"
              key={position}
              style={{ left: `${position}%`, opacity: 0.35 + index * 0.14 }}
            />
          ))}
          <span className="absolute top-1/2 left-[10%] h-px w-[80%] -translate-y-1/2 bg-linear-to-r from-transparent via-indigo-300/35 to-transparent" />
        </div>
        <PlaneThumb
          className={`${EXAMPLE_THUMB_CLASS_NAME} border-indigo-200 bg-indigo-500`}
          getAriaValueText={formatGravity}
          onValueChange={(nextValue) => setValue(projectToCircle(nextValue))}
          value={value}
          xAriaLabel="Gravity X"
          yAriaLabel="Gravity Y"
        />
      </Plane>
    </ExampleFrame>
  );
}
