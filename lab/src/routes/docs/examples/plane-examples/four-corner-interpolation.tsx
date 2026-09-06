import { useState, type ReactNode } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from 'control-kit';

const EXAMPLE_PLANE_CLASS_NAME =
  'relative size-[240px] touch-none overflow-hidden rounded-2xl border border-white/12 [background-origin:border-box] bg-[#171718] max-sm:size-[220px]';
const EXAMPLE_THUMB_CLASS_NAME =
  'size-6 border-2 border-white bg-[#171718] shadow-[0_2px_10px_rgba(0,0,0,0.45)]';

function ExampleFrame({
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

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

const initialValue: PlaneValue = { x: 0.45, y: 0.58 };

function formatBlend(value: PlaneValue) {
  return `${formatPercent((1 - value.x) * value.y)} calm, ${formatPercent(value.x * value.y)} bold, ${formatPercent((1 - value.x) * (1 - value.y))} precise, ${formatPercent(value.x * (1 - value.y))} playful`;
}

export function FourCornerInterpolationExample() {
  const [value, setValue] = useState(initialValue);
  const weights = {
    calm: (1 - value.x) * value.y,
    bold: value.x * value.y,
    precise: (1 - value.x) * (1 - value.y),
    playful: value.x * (1 - value.y),
  };
  const strongest = Object.entries(weights).sort((a, b) => b[1] - a[1])[0];

  return (
    <ExampleFrame
      description="Bilinear weights blend all four corner states at once."
      readout={`${strongest[0]} leads at ${formatPercent(strongest[1])}`}
    >
      <Plane
        aria-label="Four state interpolation"
        className={`${EXAMPLE_PLANE_CLASS_NAME} bg-[radial-gradient(circle_at_0_0,#60a5fa,transparent_62%),radial-gradient(circle_at_100%_0,#f472b6,transparent_62%),radial-gradient(circle_at_0_100%,#34d399,transparent_62%),radial-gradient(circle_at_100%_100%,#fbbf24,transparent_62%),#171718]`}
      >
        <CornerLabels
          bottomLeft="Precise"
          bottomRight="Playful"
          topLeft="Calm"
          topRight="Bold"
        />
        <PlaneThumb
          className={`${EXAMPLE_THUMB_CLASS_NAME} bg-white`}
          getAriaValueText={formatBlend}
          onValueChange={setValue}
          value={value}
          xAriaLabel="Precise to playful"
          yAriaLabel="Grounded to expressive"
        />
      </Plane>
    </ExampleFrame>
  );
}
