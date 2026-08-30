import { useState } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from '@color-kit/control-kit';

const initialValue: PlaneValue = { x: 0.38, y: 0.55 };

function getElevation(value: PlaneValue) {
  return Math.round(value.x * 24);
}

function getBlur(value: PlaneValue) {
  return Math.round(2 + value.y * 42);
}

function describeShadow(value: PlaneValue) {
  return `${getElevation(value)}px elevation, ${getBlur(value)}px blur`;
}

export function ElevationBlurExample() {
  const [value, setValue] = useState(initialValue);
  const elevation = getElevation(value);
  const blur = getBlur(value);

  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 p-6 max-sm:min-h-[340px] max-sm:p-4">
      <Plane
        aria-label="Elevation and blur"
        className="relative size-[240px] touch-none overflow-hidden rounded-2xl border border-white/12 [background-origin:border-box] bg-[#25272c] max-sm:size-[220px]"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgb(255 255 255 / 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.08) 1px, transparent 1px)',
            backgroundSize: '16.666% 16.666%',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 flex size-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border border-white/15 bg-[#363941] text-[10px] font-medium tracking-wide text-white/55"
          style={{
            boxShadow: `${elevation}px ${elevation}px ${blur}px rgb(0 0 0 / 0.65)`,
          }}
        >
          SURFACE
        </div>
        <PlaneThumb
          aria-label="Shadow character"
          className="size-6 border-2 border-white bg-[#171718] shadow-[0_2px_10px_rgba(0,0,0,0.45)]"
          getAriaValueText={describeShadow}
          onValueChange={setValue}
          value={value}
          xAriaLabel="Elevation"
          yAriaLabel="Blur"
        />
      </Plane>
      <div className="flex max-w-[300px] flex-col items-center gap-1.5 text-center">
        <output className="font-mono text-[11px] text-white/72">
          Elevation {elevation}px · Blur {blur}px
        </output>
        <p className="m-0 text-xs leading-5 text-white/42">
          Balance a surface's apparent height against shadow softness.
        </p>
      </div>
    </div>
  );
}
