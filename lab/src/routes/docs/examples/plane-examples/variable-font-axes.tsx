import { useState, type ReactNode } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from 'control-kit';

const EXAMPLE_PLANE_CLASS_NAME =
  'relative size-[240px] touch-none overflow-hidden rounded-2xl border border-white/12 [background-origin:border-box] bg-[#171718] max-sm:size-[220px]';
const EXAMPLE_THUMB_CLASS_NAME =
  "size-6 border-0 bg-transparent shadow-none transition-opacity data-[dragging]:opacity-20 after:absolute after:top-1/2 after:left-1/2 after:size-4 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:border-2 after:border-white after:bg-white after:shadow-sm after:content-['']";

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

function AxisLabels() {
  const labelClass =
    'absolute rounded bg-black/35 px-1.5 py-1 text-[9px] font-medium tracking-wide text-white/70 backdrop-blur-sm';

  return (
    <div aria-hidden="true" className="absolute inset-0">
      <span className={`${labelClass} top-1/2 left-2 -translate-y-1/2`}>
        Light
      </span>
      <span className={`${labelClass} top-1/2 right-2 -translate-y-1/2`}>
        Black
      </span>
      <span className={`${labelClass} top-2 left-1/2 -translate-x-1/2`}>
        Wide
      </span>
      <span className={`${labelClass} bottom-2 left-1/2 -translate-x-1/2`}>
        Narrow
      </span>
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
        <AxisLabels />
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
