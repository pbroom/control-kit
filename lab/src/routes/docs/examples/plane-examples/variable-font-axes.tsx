import { useState, type ReactNode } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from 'control-kit';

const EXAMPLE_PLANE_CLASS_NAME =
  'relative size-[240px] touch-none overflow-hidden rounded-2xl border border-white/12 [background-origin:border-box] bg-[#171718] max-sm:size-[220px]';
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
        <output className="font-mono text-[11px] text-white/72">
          {readout}
        </output>
        <p className="m-0 text-xs leading-5 text-white/42">{description}</p>
      </div>
    </div>
  );
}

function GridLayer({ subdivisions = 4 }: { subdivisions?: number }) {
  const step = 100 / subdivisions;
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0"
      style={{
        backgroundImage:
          'linear-gradient(to right, rgb(255 255 255 / 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.08) 1px, transparent 1px)',
        backgroundSize: `${step}% ${step}%`,
      }}
    />
  );
}

function CornerLabels({
  bottomLeft,
  bottomRight,
  topLeft,
  topRight,
}: {
  bottomLeft: string;
  bottomRight: string;
  topLeft: string;
  topRight: string;
}) {
  const labelClass =
    'absolute rounded bg-black/35 px-1.5 py-1 text-[9px] font-medium tracking-wide text-white/70 backdrop-blur-sm';

  return (
    <div aria-hidden="true" className="absolute inset-0">
      <span className={`${labelClass} top-2 left-2`}>{topLeft}</span>
      <span className={`${labelClass} top-2 right-2`}>{topRight}</span>
      <span className={`${labelClass} bottom-2 left-2`}>{bottomLeft}</span>
      <span className={`${labelClass} right-2 bottom-2`}>{bottomRight}</span>
    </div>
  );
}

const initialValue: PlaneValue = { x: 0.64, y: 0.48 };

function toFontAxes(value: PlaneValue) {
  return {
    weight: Math.round(100 + value.x * 800),
    width: Math.round(75 + value.y * 50),
  };
}

function formatFontAxes(value: PlaneValue) {
  const axes = toFontAxes(value);
  return `Font weight ${axes.weight}, width ${axes.width} percent`;
}

export function VariableFontAxesExample() {
  const [value, setValue] = useState(initialValue);
  const axes = toFontAxes(value);

  return (
    <PlaneExampleFrame
      description="Explore two variable-font axes as one connected design space."
      readout={`wght ${axes.weight} · wdth ${axes.width}`}
    >
      <Plane
        aria-label="Variable font weight and width"
        className={EXAMPLE_PLANE_CLASS_NAME}
      >
        <GridLayer />
        <CornerLabels
          bottomLeft="Light / narrow"
          bottomRight="Black / narrow"
          topLeft="Light / wide"
          topRight="Black / wide"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center text-7xl leading-none text-white/18"
          style={{
            fontVariationSettings: `'wght' ${axes.weight}, 'wdth' ${axes.width}`,
            fontWeight: axes.weight,
            transform: `scaleX(${axes.width / 100})`,
          }}
        >
          Aa
        </span>
        <PlaneThumb
          className={EXAMPLE_THUMB_CLASS_NAME}
          getAriaValueText={formatFontAxes}
          onValueChange={setValue}
          value={value}
          xAriaLabel="Font weight"
          yAriaLabel="Font width"
        />
      </Plane>
    </PlaneExampleFrame>
  );
}
