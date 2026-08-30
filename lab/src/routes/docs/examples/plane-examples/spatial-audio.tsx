import { useState, type ReactNode } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from '@color-kit/control-kit';

const EXAMPLE_PLANE_CLASS_NAME =
  'relative size-[240px] touch-none overflow-hidden rounded-2xl border border-white/12 [background-origin:border-box] bg-[#171718] max-sm:size-[220px]';

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

const initialValue: PlaneValue = { x: 0.7, y: 0.62 };

function formatAudioPosition(value: PlaneValue) {
  return `${formatPercent(value.x)} from left, ${formatPercent(value.y)} from back to front`;
}

export function SpatialAudioExample() {
  const [value, setValue] = useState(initialValue);
  const pan = value.x * 2 - 1;
  const depth = value.y * 2 - 1;

  return (
    <ExampleFrame
      description="Place a sound source around the listener in a top-down room."
      readout={`Pan ${pan >= 0 ? 'R' : 'L'} ${Math.abs(pan).toFixed(2)} · Depth ${depth.toFixed(2)}`}
    >
      <Plane
        aria-label="Spatial audio source position"
        className={`${EXAMPLE_PLANE_CLASS_NAME} bg-[linear-gradient(rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.04)_1px,transparent_1px),#12151c] bg-size-[20%_20%]`}
      >
        <div
          aria-hidden="true"
          className="absolute inset-3 rounded-xl border border-white/10"
        >
          <span className="absolute top-1/2 left-1/2 flex size-10 -translate-1/2 items-center justify-center rounded-full border border-violet-300/35 bg-violet-400/10 text-lg">
            ◉
          </span>
          <span className="absolute top-2 left-2 text-xs text-white/35">L</span>
          <span className="absolute top-2 right-2 text-xs text-white/35">
            R
          </span>
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] text-white/35">
            LISTENER
          </span>
        </div>
        <PlaneThumb
          className="size-8 border-2 border-violet-100 bg-violet-500 text-white shadow-[0_0_0_6px_rgb(139_92_246/0.12),0_3px_12px_rgb(0_0_0/0.5)]"
          getAriaValueText={formatAudioPosition}
          onValueChange={setValue}
          value={value}
          xAriaLabel="Sound pan"
          yAriaLabel="Sound depth"
        >
          <span aria-hidden="true" className="text-xs">
            ♪
          </span>
        </PlaneThumb>
      </Plane>
    </ExampleFrame>
  );
}
