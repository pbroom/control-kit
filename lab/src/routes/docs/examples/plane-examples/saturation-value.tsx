import { useState, type ReactNode } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from 'control-kit';

const EXAMPLE_PLANE_CLASS_NAME =
  'relative size-[240px] touch-none rounded-2xl border border-white/12 [background-origin:border-box] bg-[#171718] max-sm:size-[220px]';
const EXAMPLE_THUMB_CLASS_NAME =
  'size-6 border-2 border-white bg-[#171718] shadow-[0_2px_10px_rgba(0,0,0,0.45)]';

function PlaneExampleFrame({
  children,
  description,
  readout,
}: {
  children: ReactNode;
  description: string;
  readout: ReactNode;
}) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 p-6 max-sm:min-h-[340px] max-sm:p-4">
      {children}
      <div className="flex max-w-[300px] flex-col items-center gap-1.5 text-center">
        <output className="text-[11px] text-white/72">{readout}</output>
        <p className="m-0 text-xs leading-5 text-white/42">{description}</p>
      </div>
    </div>
  );
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

const initialValue: PlaneValue = { x: 0.72, y: 0.78 };

function formatSaturationValue(value: PlaneValue) {
  return `Saturation ${formatPercent(value.x)}, value ${formatPercent(value.y)}`;
}

export function SaturationValueExample() {
  const [value, setValue] = useState(initialValue);
  const saturation = value.x * 100;
  const lightness = Math.max(7, value.y * (100 - saturation * 0.42));

  return (
    <PlaneExampleFrame
      description="Choose saturation horizontally and brightness vertically."
      readout={`S ${formatPercent(value.x)} V ${formatPercent(value.y)}`}
    >
      <Plane
        aria-label="Saturation and value"
        className={EXAMPLE_PLANE_CLASS_NAME}
        style={{
          backgroundColor: 'hsl(214 100% 50%)',
          backgroundImage:
            'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)',
        }}
      >
        <PlaneThumb
          className={EXAMPLE_THUMB_CLASS_NAME}
          getAriaValueText={formatSaturationValue}
          onValueChange={setValue}
          value={value}
          xAriaLabel="Saturation"
          yAriaLabel="Value"
          style={{ backgroundColor: `hsl(214 ${saturation}% ${lightness}%)` }}
        />
      </Plane>
    </PlaneExampleFrame>
  );
}
