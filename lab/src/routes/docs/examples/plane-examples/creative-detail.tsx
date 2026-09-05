import { useState } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from 'control-kit';

const initialValue: PlaneValue = { x: 0.7, y: 0.42 };

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function describeGeneration(value: PlaneValue) {
  return `${formatPercent(value.x)} creative, ${formatPercent(value.y)} detailed`;
}

export function CreativeDetailExample() {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 p-6 max-sm:min-h-[340px] max-sm:p-4">
      <Plane
        aria-label="Creative and detailed generation"
        className="relative size-[240px] touch-none overflow-hidden rounded-2xl border border-white/12 [background-origin:border-box] bg-[radial-gradient(circle_at_100%_0%,#7c3aed_0%,transparent_55%),radial-gradient(circle_at_0%_100%,#0f766e_0%,transparent_55%),#172033] max-sm:size-[220px]"
      >
        <div aria-hidden="true" className="absolute inset-0">
          <span className="absolute top-2 left-2 rounded bg-black/35 px-1.5 py-1 text-[9px] font-medium tracking-wide text-white/70 backdrop-blur-sm">
            Literal · detailed
          </span>
          <span className="absolute top-2 right-2 rounded bg-black/35 px-1.5 py-1 text-[9px] font-medium tracking-wide text-white/70 backdrop-blur-sm">
            Creative · detailed
          </span>
          <span className="absolute bottom-2 left-2 rounded bg-black/35 px-1.5 py-1 text-[9px] font-medium tracking-wide text-white/70 backdrop-blur-sm">
            Literal · concise
          </span>
          <span className="absolute right-2 bottom-2 rounded bg-black/35 px-1.5 py-1 text-[9px] font-medium tracking-wide text-white/70 backdrop-blur-sm">
            Creative · concise
          </span>
        </div>
        <PlaneThumb
          aria-label="Generation style"
          className="size-6 border-2 border-white bg-violet-300 shadow-[0_2px_10px_rgba(0,0,0,0.45)]"
          getAriaValueText={describeGeneration}
          onValueChange={setValue}
          value={value}
          xAriaLabel="Creativity"
          yAriaLabel="Detail"
        />
      </Plane>
      <div className="flex max-w-[300px] flex-col items-center gap-1.5 text-center">
        <output className="font-mono text-[11px] text-white/72">
          {describeGeneration(value)}
        </output>
        <p className="m-0 text-xs leading-5 text-white/42">
          Tune a generative result from literal to creative and concise to
          detailed.
        </p>
      </div>
    </div>
  );
}
