import { useState } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from 'control-kit';

const initialValue: PlaneValue = { x: 0.34, y: 0.48 };

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function getScale(value: PlaneValue) {
  return Math.round(3 + value.x * 25);
}

function describeNoise(value: PlaneValue) {
  return `${getScale(value)}px grain, ${formatPercent(value.y)} intensity`;
}

export function NoiseScaleIntensityExample() {
  const [value, setValue] = useState(initialValue);
  const scale = getScale(value);

  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 p-6 max-sm:min-h-[340px] max-sm:p-4">
      <Plane
        aria-label="Noise scale and intensity"
        className="relative size-[240px] touch-none overflow-hidden rounded-2xl border border-white/12 [background-origin:border-box] bg-[#232129] max-sm:size-[220px]"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgb(216 180 254 / 0.9) 0 1px, transparent 1.5px), radial-gradient(circle, rgb(96 165 250 / 0.85) 0 1px, transparent 1.5px)',
            backgroundPosition: `0 0, ${scale / 2}px ${scale / 2}px`,
            backgroundSize: `${scale}px ${scale}px`,
            opacity: 0.12 + value.y * 0.78,
          }}
        />
        <PlaneThumb
          aria-label="Noise texture"
          className="size-6 border-2 border-white bg-[#171718] shadow-[0_2px_10px_rgba(0,0,0,0.45)]"
          getAriaValueText={describeNoise}
          onValueChange={setValue}
          value={value}
          xAriaLabel="Noise scale"
          yAriaLabel="Noise intensity"
        />
      </Plane>
      <div className="flex max-w-[300px] flex-col items-center gap-1.5 text-center">
        <output className="font-mono text-[11px] text-white/72">
          Scale {scale}px · Intensity {formatPercent(value.y)}
        </output>
        <p className="m-0 text-xs leading-5 text-white/42">
          Shape a procedural texture by changing its grain and strength.
        </p>
      </div>
    </div>
  );
}
