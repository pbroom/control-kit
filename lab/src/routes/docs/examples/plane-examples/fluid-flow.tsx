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

const initialValue: PlaneValue = { x: 0.82, y: 0.62 };
const streamOffsets = [22, 36, 50, 64, 78];

function formatFlow(value: PlaneValue) {
  const vector = toCenteredVector(value);
  return `${Math.round(vector.angle)} degree flow, ${formatPercent(vector.magnitude)} speed`;
}

export function FluidFlowExample() {
  const [value, setValue] = useState(initialValue);
  const vector = toCenteredVector(value);

  return (
    <ExampleFrame
      description="Streamlines rotate and brighten with the flow vector."
      readout={`${Math.round(vector.angle)}° · ${Math.round(vector.magnitude * 12)} m/s`}
    >
      <Plane
        aria-label="Fluid flow direction"
        className={`${EXAMPLE_PLANE_CLASS_NAME} bg-linear-to-br from-sky-950 to-cyan-950`}
      >
        <div
          aria-hidden="true"
          className="absolute -inset-10"
          style={{
            transform: `rotate(${-vector.angle}deg)`,
            opacity: 0.35 + vector.magnitude * 0.65,
          }}
        >
          {streamOffsets.map((offset, index) => (
            <svg
              className="absolute left-0 h-8 w-full"
              key={offset}
              style={{ top: `${offset}%` }}
              viewBox="0 0 100 20"
              preserveAspectRatio="none"
            >
              <path
                d={`M -5 ${8 + (index % 2)} C 20 ${2 + index}, 35 ${18 - index}, 55 10 S 85 ${3 + index}, 105 10`}
                fill="none"
                stroke="rgb(103 232 249 / 0.65)"
                strokeWidth="1"
              />
            </svg>
          ))}
        </div>
        <PlaneThumb
          className={`${EXAMPLE_THUMB_CLASS_NAME} border-cyan-100 bg-cyan-500`}
          getAriaValueText={formatFlow}
          onValueChange={(nextValue) => setValue(projectToCircle(nextValue))}
          value={value}
          xAriaLabel="Flow X"
          yAriaLabel="Flow Y"
        />
      </Plane>
    </ExampleFrame>
  );
}
