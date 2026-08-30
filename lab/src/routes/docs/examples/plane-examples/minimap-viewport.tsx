import { useState } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from '@color-kit/control-kit';

const initialValue: PlaneValue = { x: 0.3, y: 0.65 };

function describeViewport(value: PlaneValue) {
  return `Viewport center ${Math.round(value.x * 100)}% · ${Math.round(value.y * 100)}%`;
}

export function MinimapViewportExample() {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 p-6 max-sm:min-h-[340px] max-sm:p-4">
      <Plane
        aria-label="Diagram minimap"
        className="relative size-[240px] touch-none overflow-hidden rounded-2xl border border-white/12 [background-origin:border-box] bg-[#101820] max-sm:size-[220px]"
      >
        <div aria-hidden="true" className="absolute inset-4 opacity-70">
          <span className="absolute top-[12%] left-[8%] h-7 w-12 rounded bg-sky-400/40" />
          <span className="absolute top-[20%] right-[9%] h-10 w-16 rounded bg-violet-400/35" />
          <span className="absolute bottom-[9%] left-[20%] h-12 w-10 rounded bg-emerald-400/35" />
          <span className="absolute right-[21%] bottom-[24%] h-8 w-14 rounded bg-amber-300/30" />
          <span className="absolute top-[25%] left-[28%] h-px w-[46%] rotate-12 bg-white/20" />
          <span className="absolute top-[48%] left-[23%] h-px w-[42%] -rotate-35 bg-white/20" />
          <span className="absolute top-[62%] left-[35%] h-px w-[38%] rotate-24 bg-white/20" />
        </div>
        <div
          aria-hidden="true"
          className="absolute h-[30%] w-[38%] -translate-x-1/2 translate-y-1/2 rounded border-2 border-white/75 bg-white/6 shadow-[0_0_0_999px_rgba(0,0,0,0.22)]"
          style={{ bottom: `${value.y * 100}%`, left: `${value.x * 100}%` }}
        />
        <PlaneThumb
          aria-label="Minimap viewport center"
          className="size-4 border-2 border-white bg-sky-300 shadow-[0_2px_10px_rgba(0,0,0,0.45)]"
          getAriaValueText={describeViewport}
          onValueChange={setValue}
          value={value}
          xAriaLabel="Horizontal viewport position"
          yAriaLabel="Vertical viewport position"
        />
      </Plane>
      <div className="flex max-w-[300px] flex-col items-center gap-1.5 text-center">
        <output className="font-mono text-[11px] text-white/72">
          {describeViewport(value)}
        </output>
        <p className="m-0 text-xs leading-5 text-white/42">
          Move the visible window through a larger diagram from its minimap.
        </p>
      </div>
    </div>
  );
}
