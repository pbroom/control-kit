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

const initialValue: PlaneValue = { x: 0.76, y: 0.72 };
const particles = [0.22, 0.36, 0.5, 0.64, 0.78, 0.92];

function formatEmitter(value: PlaneValue) {
  const vector = toCenteredVector(value);
  return `${Math.round(vector.angle)} degree emission, ${formatPercent(vector.magnitude)} spread`;
}

export function ParticleEmitterExample() {
  const [value, setValue] = useState(initialValue);
  const vector = toCenteredVector(value);
  const spread = 8 + vector.magnitude * 30;

  return (
    <ExampleFrame
      description="Angle aims the emitter; radius widens its particle cone."
      readout={`${Math.round(vector.angle)}° · ${Math.round(spread)}° spread`}
    >
      <Plane
        aria-label="Particle emitter direction and spread"
        className={`${EXAMPLE_PLANE_CLASS_NAME} rounded-full bg-[#100d18]`}
      >
        <div aria-hidden="true" className="absolute top-1/2 left-1/2 size-0">
          {particles.map((distance, index) => {
            const offset = ((index / (particles.length - 1)) * 2 - 1) * spread;
            return (
              <span
                className="absolute -m-1 size-2 rounded-full bg-fuchsia-300 shadow-[0_0_10px_rgb(232_121_249/0.8)]"
                key={distance}
                style={{
                  transform: `rotate(${-vector.angle + offset}deg) translateX(${distance * 105}px)`,
                  opacity: 0.45 + index * 0.09,
                }}
              />
            );
          })}
          <span className="absolute -m-2 size-4 rounded-full bg-fuchsia-500 shadow-[0_0_18px_rgb(217_70_239/0.9)]" />
        </div>
        <PlaneThumb
          className={`${EXAMPLE_THUMB_CLASS_NAME} border-fuchsia-200 bg-fuchsia-500`}
          getAriaValueText={formatEmitter}
          onValueChange={(nextValue) => setValue(projectToCircle(nextValue))}
          value={value}
          xAriaLabel="Emitter direction X"
          yAriaLabel="Emitter direction Y"
        />
      </Plane>
    </ExampleFrame>
  );
}
