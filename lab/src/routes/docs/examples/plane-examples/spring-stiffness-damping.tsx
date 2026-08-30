import { useState, type ReactNode } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from '@color-kit/control-kit';

const EXAMPLE_PLANE_CLASS_NAME =
  'relative size-[240px] touch-none overflow-hidden rounded-2xl border border-white/12 bg-[#171718] max-sm:size-[220px]';
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

const initialValue: PlaneValue = { x: 0.46, y: 0.58 };

function toSpring(value: PlaneValue) {
  return {
    damping: Math.round(5 + value.y * 45),
    stiffness: Math.round(50 + value.x * 450),
  };
}

function makeResponsePath(value: PlaneValue) {
  const points = Array.from({ length: 49 }, (_, index) => {
    const time = index / 48;
    const frequency = 2.2 + value.x * 5.4;
    const decay = 1.2 + value.y * 6.5;
    const response =
      Math.sin(time * Math.PI * 2 * frequency) * Math.exp(-time * decay);
    return `${time * 240},${120 - response * 78}`;
  });

  return `M ${points.join(' L ')}`;
}

function formatSpring(value: PlaneValue) {
  const spring = toSpring(value);
  return `Spring stiffness ${spring.stiffness}, damping ${spring.damping}`;
}

export function SpringStiffnessDampingExample() {
  const [value, setValue] = useState(initialValue);
  const spring = toSpring(value);

  return (
    <PlaneExampleFrame
      description="Balance responsiveness against how quickly oscillation settles."
      readout={`stiffness ${spring.stiffness} · damping ${spring.damping}`}
    >
      <Plane
        aria-label="Spring stiffness and damping"
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
            stroke="rgb(255 255 255 / 0.18)"
            x1="0"
            x2="240"
            y1="120"
            y2="120"
          />
          <path
            d={makeResponsePath(value)}
            fill="none"
            stroke="#34d399"
            strokeLinecap="round"
            strokeWidth="3"
          />
        </svg>
        <PlaneThumb
          className={EXAMPLE_THUMB_CLASS_NAME}
          getAriaValueText={formatSpring}
          onValueChange={setValue}
          value={value}
          xAriaLabel="Spring stiffness"
          yAriaLabel="Spring damping"
        />
      </Plane>
    </PlaneExampleFrame>
  );
}
