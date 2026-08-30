import { useState } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from '@color-kit/control-kit';

const initialValue: PlaneValue = { x: 0.72, y: 0.34 };

function describeLocation(value: PlaneValue) {
  return `Floor-plan position ${Math.round(value.x * 100)}% · ${Math.round(value.y * 100)}%`;
}

export function FloorPlanPositionExample() {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 p-6 max-sm:min-h-[340px] max-sm:p-4">
      <Plane
        aria-label="Floor plan position"
        className="relative size-[240px] touch-none overflow-hidden rounded-2xl border border-white/12 bg-[#20231f] max-sm:size-[220px]"
      >
        <div
          aria-hidden="true"
          className="absolute inset-5 border-2 border-white/30"
        >
          <span className="absolute top-0 bottom-[42%] left-[42%] w-0 border-l-2 border-white/30" />
          <span className="absolute top-[58%] right-0 left-0 h-0 border-t-2 border-white/30" />
          <span className="absolute top-[58%] right-[30%] bottom-0 w-0 border-l-2 border-white/30" />
          <span className="absolute top-2 left-2 text-[9px] tracking-wide text-white/35">
            STUDIO
          </span>
          <span className="absolute top-2 right-2 text-[9px] tracking-wide text-white/35">
            OFFICE
          </span>
          <span className="absolute bottom-2 left-2 text-[9px] tracking-wide text-white/35">
            LOUNGE
          </span>
          <span className="absolute right-2 bottom-2 text-[9px] tracking-wide text-white/35">
            ENTRY
          </span>
        </div>
        <PlaneThumb
          aria-label="Device location"
          className="size-5 border-2 border-amber-100 bg-amber-400 shadow-[0_2px_10px_rgba(0,0,0,0.45)]"
          getAriaValueText={describeLocation}
          onValueChange={setValue}
          value={value}
          xAriaLabel="East-west position"
          yAriaLabel="North-south position"
        >
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-black/60"
          />
        </PlaneThumb>
      </Plane>
      <div className="flex max-w-[300px] flex-col items-center gap-1.5 text-center">
        <output className="font-mono text-[11px] text-white/72">
          {describeLocation(value)}
        </output>
        <p className="m-0 text-xs leading-5 text-white/42">
          Place a device or point of interest within a bounded floor plan.
        </p>
      </div>
    </div>
  );
}
