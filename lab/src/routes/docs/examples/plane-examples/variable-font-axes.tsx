import { useState, type ReactNode } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from 'control-kit';

const EXAMPLE_PLANE_CLASS_NAME =
  'relative size-[240px] touch-none overflow-hidden rounded-2xl border border-white/12 [background-origin:border-box] bg-[#171718] max-sm:size-[220px]';
const EXAMPLE_THUMB_CLASS_NAME =
  "size-6 border-0 bg-transparent shadow-none transition-opacity data-[dragging]:opacity-20 after:absolute after:top-1/2 after:left-1/2 after:size-4 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:border-2 after:border-white after:bg-white after:shadow-sm after:content-['']";

function PlaneExampleFrame({
  children,
  readout,
}: {
  children: ReactNode;
  readout: ReactNode;
}) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 p-6 max-sm:min-h-[340px] max-sm:p-4">
      {children}
      <div className="flex max-w-[300px] flex-col items-center gap-1.5 text-center">
        <output className="font-mono text-[11px] text-white/72">
          {readout}
        </output>
      </div>
    </div>
  );
}

function AxisLabels({ axes }: { axes: ReturnType<typeof toFontAxes> }) {
  const sampleClass =
    'absolute text-[0.9rem] leading-none text-white/30 select-none';

  const sampleStyle = (weight: number, width: number) => ({
    fontVariationSettings: `'wght' ${weight}, 'wdth' ${width}`,
    fontWeight: weight,
    transform: `scaleX(${width / 100})`,
  });

  return (
    <div aria-hidden="true" className="absolute inset-0">
      <span
        className={`${sampleClass} top-1/2 left-3 -translate-y-1/2`}
        style={sampleStyle(axes.weight, 75)}
      >
        W
      </span>
      <span
        className={`${sampleClass} top-1/2 right-3 -translate-y-1/2`}
        style={sampleStyle(axes.weight, 125)}
      >
        W
      </span>
      <span
        className={`${sampleClass} top-3 left-1/2 -translate-x-1/2`}
        style={sampleStyle(900, axes.width)}
      >
        W
      </span>
      <span
        className={`${sampleClass} bottom-3 left-1/2 -translate-x-1/2`}
        style={sampleStyle(100, axes.width)}
      >
        W
      </span>
    </div>
  );
}

const initialValue: PlaneValue = { x: 0.48, y: 0.64 };

function toFontAxes(value: PlaneValue) {
  return {
    weight: Math.round(100 + value.y * 800),
    width: Math.round(75 + value.x * 50),
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
    <PlaneExampleFrame readout={`wght ${axes.weight} · wdth ${axes.width}`}>
      <Plane
        aria-label="Variable font weight and width"
        className={EXAMPLE_PLANE_CLASS_NAME}
      >
        <AxisLabels axes={axes} />
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
          xAriaLabel="Font width"
          yAriaLabel="Font weight"
        />
      </Plane>
    </PlaneExampleFrame>
  );
}
