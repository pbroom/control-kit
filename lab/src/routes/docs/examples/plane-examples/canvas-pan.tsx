import { useState } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from '@color-kit/control-kit';

const initialValue: PlaneValue = { x: 0.58, y: 0.42 };

function describePan(value: PlaneValue) {
  return `Canvas pan ${Math.round(value.x * 100)}% · ${Math.round(value.y * 100)}%`;
}

export function CanvasPanExample() {
  const [value, setValue] = useState(initialValue);
  const offsetX = Math.round((value.x - 0.5) * 120);
  const offsetY = Math.round((value.y - 0.5) * -120);

  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 p-6 max-sm:min-h-[340px] max-sm:p-4">
      <Plane
        aria-label="Canvas pan position"
        className="relative size-[240px] touch-none overflow-hidden rounded-2xl border border-white/12 bg-[#15171a] max-sm:size-[220px]"
      >
        <div
          aria-hidden="true"
          className="absolute -inset-24"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgb(255 255 255 / 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.08) 1px, transparent 1px)',
            backgroundPosition: `${offsetX}px ${offsetY}px`,
            backgroundSize: '24px 24px',
          }}
        >
          <span
            className="absolute top-28 left-24 size-12 rounded-lg border border-fuchsia-300/30 bg-fuchsia-400/16"
            style={{ transform: `translate(${offsetX}px, ${offsetY}px)` }}
          />
          <span
            className="absolute right-24 bottom-32 h-10 w-16 rounded-lg border border-cyan-300/30 bg-cyan-400/16"
            style={{ transform: `translate(${offsetX}px, ${offsetY}px)` }}
          />
        </div>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/55"
        />
        <PlaneThumb
          aria-label="Canvas pan"
          className="size-6 border-2 border-white bg-cyan-300 shadow-[0_2px_10px_rgba(0,0,0,0.45)]"
          getAriaValueText={describePan}
          onValueChange={setValue}
          value={value}
          xAriaLabel="Horizontal pan"
          yAriaLabel="Vertical pan"
        />
      </Plane>
      <div className="flex max-w-[300px] flex-col items-center gap-1.5 text-center">
        <output className="font-mono text-[11px] text-white/72">
          Pan X {offsetX}px · Y {-offsetY}px
        </output>
        <p className="m-0 text-xs leading-5 text-white/42">
          Pan an infinite canvas while keeping the viewport fixed.
        </p>
      </div>
    </div>
  );
}
