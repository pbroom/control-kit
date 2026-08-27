import { useState } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from '@color-kit/control-kit';

const initialValue: PlaneValue = { x: 0.5, y: 0.5 };

function formatPosition(value: PlaneValue) {
  return `${Math.round(value.x * 100)}% horizontal, ${Math.round(value.y * 100)}% vertical`;
}

export function PlaneExample() {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="flex min-h-[440px] flex-col items-center justify-center gap-5 p-8 max-sm:min-h-[360px] max-sm:p-5">
      <Plane
        aria-label="Normalized position"
        className="size-[300px] rounded-2xl border border-white/10 bg-[#171718] max-sm:size-[240px]"
      >
        <PlaneThumb
          className="size-6 border-white/30 bg-white shadow-none"
          getAriaValueText={formatPosition}
          largeStep={0.1}
          onValueChange={setValue}
          step={0.01}
          value={value}
          xAriaLabel="Horizontal position"
          yAriaLabel="Vertical position"
        >
          <span
            aria-hidden="true"
            className="size-3 rounded-full bg-[#171717]"
          />
        </PlaneThumb>
      </Plane>
      <output className="font-mono text-[11px] text-white/48">
        X {value.x.toFixed(2)} · Y {value.y.toFixed(2)}
      </output>
    </div>
  );
}
