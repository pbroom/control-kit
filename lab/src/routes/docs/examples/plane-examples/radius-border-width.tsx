import { useState } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from '@color-kit/control-kit';

const initialValue: PlaneValue = { x: 0.45, y: 0.28 };

function getRadius(value: PlaneValue) {
  return Math.round(value.x * 40);
}

function getBorderWidth(value: PlaneValue) {
  return Math.round(1 + value.y * 11);
}

function describeStyle(value: PlaneValue) {
  return `${getRadius(value)}px radius, ${getBorderWidth(value)}px border`;
}

export function RadiusBorderWidthExample() {
  const [value, setValue] = useState(initialValue);
  const radius = getRadius(value);
  const borderWidth = getBorderWidth(value);

  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 p-6 max-sm:min-h-[340px] max-sm:p-4">
      <Plane
        aria-label="Radius and border width"
        className="relative size-[240px] touch-none overflow-hidden rounded-2xl border border-white/12 [background-origin:border-box] bg-[#121827] max-sm:size-[220px]"
      >
        <div aria-hidden="true" className="absolute inset-0">
          <span
            className="absolute inset-y-0 w-px bg-white/12"
            style={{ left: `${value.x * 100}%` }}
          />
          <span
            className="absolute inset-x-0 h-px bg-white/12"
            style={{ bottom: `${value.y * 100}%` }}
          />
        </div>
        <div
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 size-24 -translate-x-1/2 -translate-y-1/2 bg-indigo-400/20"
          style={{
            borderColor: 'rgb(165 180 252 / 0.9)',
            borderRadius: radius,
            borderStyle: 'solid',
            borderWidth,
          }}
        />
        <PlaneThumb
          aria-label="Surface style"
          className="size-6 border-2 border-white bg-[#171718] shadow-[0_2px_10px_rgba(0,0,0,0.45)]"
          getAriaValueText={describeStyle}
          onValueChange={setValue}
          value={value}
          xAriaLabel="Border radius"
          yAriaLabel="Border width"
        />
      </Plane>
      <div className="flex max-w-[300px] flex-col items-center gap-1.5 text-center">
        <output className="font-mono text-[11px] text-white/72">
          Radius {radius}px · Border {borderWidth}px
        </output>
        <p className="m-0 text-xs leading-5 text-white/42">
          Explore how corner softness and outline weight work together.
        </p>
      </div>
    </div>
  );
}
