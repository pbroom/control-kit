import { useState, type ReactNode } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from '@color-kit/control-kit';

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

const initialValue: PlaneValue = { x: 0.58, y: 0.46 };

function getCutoff(value: PlaneValue) {
  return Math.round(20 * 1000 ** value.x);
}

function formatFilter(value: PlaneValue) {
  return `${getCutoff(value)} hertz cutoff, ${formatPercent(value.y)} resonance`;
}

export function FilterCutoffResonanceExample() {
  const [value, setValue] = useState(initialValue);
  const cutoffX = 8 + value.x * 76;
  const peakY = 78 - value.y * 52;

  return (
    <ExampleFrame
      description="Cutoff sweeps horizontally while resonance raises the filter peak."
      readout={`${getCutoff(value).toLocaleString()} Hz · Q ${(0.5 + value.y * 19.5).toFixed(1)}`}
    >
      <Plane
        aria-label="Filter cutoff and resonance"
        className={`${EXAMPLE_PLANE_CLASS_NAME} bg-[#101418]`}
      >
        <GridLayer subdivisions={6} />
        <svg
          aria-hidden="true"
          className="absolute inset-0 size-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <path
            d={`M 0 78 L ${Math.max(0, cutoffX - 14)} 78 C ${cutoffX - 8} 78, ${cutoffX - 5} ${peakY}, ${cutoffX} ${peakY} C ${cutoffX + 5} ${peakY}, ${cutoffX + 8} 92, 100 96`}
            fill="none"
            stroke="rgb(74 222 128)"
            strokeWidth="2"
          />
          <path
            d={`M 0 78 L ${Math.max(0, cutoffX - 14)} 78 C ${cutoffX - 8} 78, ${cutoffX - 5} ${peakY}, ${cutoffX} ${peakY} C ${cutoffX + 5} ${peakY}, ${cutoffX + 8} 92, 100 96 L 100 100 L 0 100 Z`}
            fill="rgb(74 222 128 / 0.12)"
          />
        </svg>
        <PlaneThumb
          className={`${EXAMPLE_THUMB_CLASS_NAME} border-green-200 bg-green-500`}
          getAriaValueText={formatFilter}
          onValueChange={setValue}
          value={value}
          xAriaLabel="Filter cutoff"
          yAriaLabel="Filter resonance"
        />
      </Plane>
    </ExampleFrame>
  );
}
