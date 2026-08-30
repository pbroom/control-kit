import { useState } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from '@color-kit/control-kit';

const initialValue: PlaneValue = { x: 0.62, y: 0.58 };

function getAzimuth(value: PlaneValue) {
  return Math.round((value.x - 0.5) * 360);
}

function getElevation(value: PlaneValue) {
  return Math.round((value.y - 0.5) * 180);
}

function describeOrbit(value: PlaneValue) {
  return `${getAzimuth(value)} degrees azimuth, ${getElevation(value)} degrees elevation`;
}

export function CameraOrbitExample() {
  const [value, setValue] = useState(initialValue);
  const azimuth = getAzimuth(value);
  const elevation = getElevation(value);

  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 p-6 max-sm:min-h-[340px] max-sm:p-4">
      <Plane
        aria-label="Camera orbit"
        className="relative size-[240px] touch-none overflow-hidden rounded-2xl border border-white/12 [background-origin:border-box] bg-[#111722] max-sm:size-[220px]"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgb(255 255 255 / 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.08) 1px, transparent 1px)',
            backgroundSize: '12.5% 12.5%',
          }}
        />
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-200/30 bg-[radial-gradient(circle_at_38%_30%,#7089a6,#273548_58%,#10151d)]"
          style={{ transform: `translate(-50%, -50%) rotate(${azimuth}deg)` }}
        >
          <span
            className="absolute top-1/2 right-1 left-1 h-px bg-sky-100/35"
            style={{ transform: `translateY(${-elevation / 4}px)` }}
          />
          <span className="absolute top-3 bottom-3 left-1/2 w-px rounded-full bg-sky-100/20" />
        </span>
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 size-36 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/15"
          style={{
            transform: `translate(-50%, -50%) rotateX(${elevation}deg)`,
          }}
        />
        <PlaneThumb
          aria-label="Camera orbit angle"
          className="size-6 border-2 border-white bg-sky-300 shadow-[0_2px_10px_rgba(0,0,0,0.45)]"
          getAriaValueText={describeOrbit}
          onValueChange={setValue}
          value={value}
          xAriaLabel="Camera azimuth"
          yAriaLabel="Camera elevation"
        />
      </Plane>
      <div className="flex max-w-[300px] flex-col items-center gap-1.5 text-center">
        <output className="font-mono text-[11px] text-white/72">
          Azimuth {azimuth}° · Elevation {elevation}°
        </output>
        <p className="m-0 text-xs leading-5 text-white/42">
          Orbit a camera around a subject with azimuth and elevation.
        </p>
      </div>
    </div>
  );
}
