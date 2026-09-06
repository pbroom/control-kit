import { useState } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from 'control-kit';

const initialValue: PlaneValue = { x: 0.76, y: 0.72 };

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function describePriority(value: PlaneValue) {
  return `${formatPercent(value.x)} important, ${formatPercent(value.y)} urgent`;
}

export function ImportanceUrgencyExample() {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 p-6 max-sm:min-h-[340px] max-sm:p-4">
      <Plane
        aria-label="Importance and urgency matrix"
        className="relative size-[240px] touch-none overflow-hidden rounded-2xl border border-white/12 [background-origin:border-box] bg-[linear-gradient(45deg,#25332e_0%,#3b3425_48%,#682f36_100%)] max-sm:size-[220px]"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgb(255 255 255 / 0.12) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.12) 1px, transparent 1px)',
            backgroundSize: '50% 50%',
          }}
        />
        <div aria-hidden="true" className="absolute inset-0">
          <span className="absolute top-2 left-2 rounded bg-black/35 px-1.5 py-1 text-[9px] font-medium tracking-wide text-white/70 backdrop-blur-sm">
            Delegate
          </span>
          <span className="absolute top-2 right-2 rounded bg-black/35 px-1.5 py-1 text-[9px] font-medium tracking-wide text-white/70 backdrop-blur-sm">
            Do now
          </span>
          <span className="absolute bottom-2 left-2 rounded bg-black/35 px-1.5 py-1 text-[9px] font-medium tracking-wide text-white/70 backdrop-blur-sm">
            Eliminate
          </span>
          <span className="absolute right-2 bottom-2 rounded bg-black/35 px-1.5 py-1 text-[9px] font-medium tracking-wide text-white/70 backdrop-blur-sm">
            Schedule
          </span>
        </div>
        <PlaneThumb
          aria-label="Work priority"
          className="size-6 border-2 border-white bg-rose-300 shadow-[0_2px_10px_rgba(0,0,0,0.45)]"
          getAriaValueText={describePriority}
          onValueChange={setValue}
          value={value}
          xAriaLabel="Importance"
          yAriaLabel="Urgency"
        />
      </Plane>
      <div className="flex max-w-[300px] flex-col items-center gap-1.5 text-center">
        <output className="font-mono text-[11px] text-white/72">
          {describePriority(value)}
        </output>
        <p className="m-0 text-xs leading-5 text-white/42">
          Position work by importance and urgency to expose priority.
        </p>
      </div>
    </div>
  );
}
