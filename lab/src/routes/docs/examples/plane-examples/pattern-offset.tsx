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

function CrosshairLayer({ value }: { value: PlaneValue }) {
  return (
    <div aria-hidden="true" className="absolute inset-0">
      <span
        className="absolute inset-y-0 w-px bg-white/12"
        style={{ left: `${value.x * 100}%` }}
      />
      <span
        className="absolute inset-x-0 h-px bg-white/12"
        style={{ bottom: `${value.y * 100}%` }}
      />
    </div>
  );
}

const initialValue: PlaneValue = { x: 0.58, y: 0.38 };

function toOffset(value: PlaneValue) {
  return {
    x: Math.round((value.x - 0.5) * 64),
    y: Math.round((value.y - 0.5) * 64),
  };
}

function formatPatternOffset(value: PlaneValue) {
  const offset = toOffset(value);
  return `Pattern offset ${offset.x} pixels horizontally, ${offset.y} pixels vertically`;
}

export function PatternOffsetExample() {
  const [value, setValue] = useState(initialValue);
  const offset = toOffset(value);

  return (
    <PlaneExampleFrame
      description="Translate a repeating texture along both axes."
      readout={`offset ${offset.x}px · ${offset.y}px`}
    >
      <Plane
        aria-label="Pattern offset"
        className={EXAMPLE_PLANE_CLASS_NAME}
        style={{
          backgroundColor: '#18181b',
          backgroundImage:
            'linear-gradient(45deg, #fb7185 25%, transparent 25%), linear-gradient(-45deg, #fb7185 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #38bdf8 75%), linear-gradient(-45deg, transparent 75%, #38bdf8 75%)',
          backgroundPosition: `${offset.x}px ${-offset.y}px, ${offset.x}px ${16 - offset.y}px, ${16 + offset.x}px ${-16 - offset.y}px, ${-16 + offset.x}px ${-offset.y}px`,
          backgroundSize: '32px 32px',
        }}
      >
        <CrosshairLayer value={value} />
        <PlaneThumb
          className={EXAMPLE_THUMB_CLASS_NAME}
          getAriaValueText={formatPatternOffset}
          onValueChange={setValue}
          value={value}
          xAriaLabel="Horizontal pattern offset"
          yAriaLabel="Vertical pattern offset"
        />
      </Plane>
    </PlaneExampleFrame>
  );
}
