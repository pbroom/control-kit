import { useState } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from '@color-kit/control-kit';

const initialValue: PlaneValue = { x: 0.62, y: 0.68 };

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function describeRecommendation(value: PlaneValue) {
  return `${formatPercent(value.x)} novel, ${formatPercent(value.y)} adventurous`;
}

export function RecommendationMatrixExample() {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 p-6 max-sm:min-h-[340px] max-sm:p-4">
      <Plane
        aria-label="Recommendation style"
        className="relative size-[240px] touch-none overflow-hidden rounded-2xl border border-white/12 [background-origin:border-box] bg-[linear-gradient(135deg,#24324a_0%,#253e35_48%,#6c3a2e_100%)] max-sm:size-[220px]"
      >
        <div aria-hidden="true" className="absolute inset-0">
          <span className="absolute top-2 left-2 rounded bg-black/35 px-1.5 py-1 text-[9px] font-medium tracking-wide text-white/70 backdrop-blur-sm">
            Familiar · adventurous
          </span>
          <span className="absolute top-2 right-2 rounded bg-black/35 px-1.5 py-1 text-[9px] font-medium tracking-wide text-white/70 backdrop-blur-sm">
            Novel · adventurous
          </span>
          <span className="absolute bottom-2 left-2 rounded bg-black/35 px-1.5 py-1 text-[9px] font-medium tracking-wide text-white/70 backdrop-blur-sm">
            Familiar · safe
          </span>
          <span className="absolute right-2 bottom-2 rounded bg-black/35 px-1.5 py-1 text-[9px] font-medium tracking-wide text-white/70 backdrop-blur-sm">
            Novel · safe
          </span>
        </div>
        <PlaneThumb
          aria-label="Recommendation balance"
          className="size-6 border-2 border-white bg-[#171718] shadow-[0_2px_10px_rgba(0,0,0,0.45)]"
          getAriaValueText={describeRecommendation}
          onValueChange={setValue}
          value={value}
          xAriaLabel="Novelty"
          yAriaLabel="Adventure"
        />
      </Plane>
      <div className="flex max-w-[300px] flex-col items-center gap-1.5 text-center">
        <output className="font-mono text-[11px] text-white/72">
          {describeRecommendation(value)}
        </output>
        <p className="m-0 text-xs leading-5 text-white/42">
          Tune discovery along two independent recommendation dimensions.
        </p>
      </div>
    </div>
  );
}
