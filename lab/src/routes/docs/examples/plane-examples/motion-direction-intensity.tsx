import { useState, type ReactNode } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from 'control-kit';

const EXAMPLE_PLANE_CLASS_NAME =
  'relative size-[240px] touch-none overflow-hidden rounded-2xl border border-white/12 [background-origin:border-box] bg-[#171718] max-sm:size-[220px]';
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

const initialValue: PlaneValue = { x: 0.78, y: 0.68 };

function formatMotion(value: PlaneValue) {
  const vector = toCenteredVector(value);
  return `${Math.round(vector.angle)} degree direction, ${formatPercent(vector.magnitude)} intensity`;
}

export function MotionDirectionIntensityExample() {
  const [value, setValue] = useState(initialValue);
  const vector = toCenteredVector(value);

  return (
    <ExampleFrame
      description="Distance from center sets intensity; angle sets direction."
      readout={`${Math.round(vector.angle)}° · ${formatPercent(vector.magnitude)} intensity`}
    >
      <Plane
        aria-label="Motion direction and intensity"
        className={`${EXAMPLE_PLANE_CLASS_NAME} rounded-full bg-[radial-gradient(circle,transparent_0_31%,rgb(255_255_255/0.06)_32%_32.5%,transparent_33%_64%,rgb(255_255_255/0.08)_65%_65.5%,transparent_66%)]`}
      >
        <div aria-hidden="true" className="absolute inset-0">
          <span
            className="absolute top-1/2 left-1/2 h-px origin-left bg-cyan-300/70"
            style={{
              width: `${vector.magnitude * 50}%`,
              transform: `rotate(${-vector.angle}deg)`,
            }}
          />
          <span className="absolute top-1/2 left-1/2 size-2 -translate-1/2 rounded-full bg-cyan-200" />
        </div>
        <PlaneThumb
          className={`${EXAMPLE_THUMB_CLASS_NAME} border-cyan-200 bg-cyan-400`}
          getAriaValueText={formatMotion}
          onValueChange={(nextValue) => setValue(projectToCircle(nextValue))}
          value={value}
          xAriaLabel="Horizontal motion"
          yAriaLabel="Vertical motion"
        />
      </Plane>
    </ExampleFrame>
  );
}
