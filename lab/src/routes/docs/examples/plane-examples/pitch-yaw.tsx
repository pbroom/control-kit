import { useState } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from '@color-kit/control-kit';

const initialValue: PlaneValue = { x: 0.42, y: 0.6 };

function getYaw(value: PlaneValue) {
  return Math.round((value.x - 0.5) * 180);
}

function getPitch(value: PlaneValue) {
  return Math.round((value.y - 0.5) * 180);
}

function describeAim(value: PlaneValue) {
  return `${getPitch(value)} degrees pitch, ${getYaw(value)} degrees yaw`;
}

export function PitchYawExample() {
  const [value, setValue] = useState(initialValue);
  const yaw = getYaw(value);
  const pitch = getPitch(value);

  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 p-6 max-sm:min-h-[340px] max-sm:p-4">
      <Plane
        aria-label="Pitch and yaw"
        className="relative size-[240px] touch-none overflow-hidden rounded-2xl border border-white/12 [background-origin:border-box] bg-[radial-gradient(circle_at_center,#26384a_0%,#111820_68%)] max-sm:size-[220px]"
      >
        <div aria-hidden="true" className="absolute inset-0">
          <span className="absolute top-1/2 left-1/2 h-px w-28 -translate-x-1/2 bg-cyan-200/35" />
          <span className="absolute top-1/2 left-1/2 h-28 w-px -translate-y-1/2 bg-cyan-200/35" />
          <span
            className="absolute top-1/2 left-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-100/30"
            style={{
              transform: `translate(calc(-50% + ${yaw / 2}px), calc(-50% - ${pitch / 2}px))`,
            }}
          />
          <span
            className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-100/75"
            style={{
              transform: `translate(calc(-50% + ${yaw / 2}px), calc(-50% - ${pitch / 2}px))`,
            }}
          />
        </div>
        <PlaneThumb
          aria-label="Aim direction"
          className="size-6 border-2 border-white bg-cyan-200 shadow-[0_2px_10px_rgba(0,0,0,0.45)]"
          getAriaValueText={describeAim}
          onValueChange={setValue}
          value={value}
          xAriaLabel="Yaw"
          yAriaLabel="Pitch"
        />
      </Plane>
      <div className="flex max-w-[300px] flex-col items-center gap-1.5 text-center">
        <output className="font-mono text-[11px] text-white/72">
          Pitch {pitch}° · Yaw {yaw}°
        </output>
        <p className="m-0 text-xs leading-5 text-white/42">
          Aim a view or game camera with pitch and yaw.
        </p>
      </div>
    </div>
  );
}
