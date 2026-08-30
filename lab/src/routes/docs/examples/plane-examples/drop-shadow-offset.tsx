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

const initialValue: PlaneValue = { x: 0.66, y: 0.34 };

function toShadowOffset(value: PlaneValue) {
  return {
    x: Math.round((value.x - 0.5) * 72),
    y: Math.round((0.5 - value.y) * 72),
  };
}

function formatShadowOffset(value: PlaneValue) {
  const offset = toShadowOffset(value);
  return `Shadow offset ${offset.x} pixels horizontally, ${offset.y} pixels vertically`;
}

export function DropShadowOffsetExample() {
  const [value, setValue] = useState(initialValue);
  const offset = toShadowOffset(value);

  return (
    <PlaneExampleFrame
      description="Position a drop shadow relative to its source object."
      readout={`drop-shadow(${offset.x}px ${offset.y}px 12px)`}
    >
      <Plane
        aria-label="Drop shadow offset"
        className={EXAMPLE_PLANE_CLASS_NAME}
      >
        <GridLayer />
        <div
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 size-20 -translate-1/2 rounded-2xl bg-gradient-to-br from-white to-white/75"
          style={{
            filter: `drop-shadow(${offset.x}px ${offset.y}px 12px rgb(0 0 0 / 0.75))`,
          }}
        />
        <PlaneThumb
          className={EXAMPLE_THUMB_CLASS_NAME}
          getAriaValueText={formatShadowOffset}
          onValueChange={setValue}
          value={value}
          xAriaLabel="Horizontal shadow offset"
          yAriaLabel="Vertical shadow offset"
        />
      </Plane>
    </PlaneExampleFrame>
  );
}
