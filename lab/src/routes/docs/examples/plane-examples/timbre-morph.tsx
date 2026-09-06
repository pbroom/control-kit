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

const initialValue: PlaneValue = { x: 0.36, y: 0.67 };

function formatTimbre(value: PlaneValue) {
  return `${Math.round(value.x * 100)}% from soft to metallic, ${Math.round(value.y * 100)}% from warm to glassy`;
}

export function TimbreMorphExample() {
  const [value, setValue] = useState(initialValue);
  const horizontalWeight = Math.round((1 - value.x) * 100);
  const verticalWeight = Math.round((1 - value.y) * 100);
  const bottomColor = `color-mix(in oklab, #f59e0b ${horizontalWeight}%, #10b981)`;
  const topColor = `color-mix(in oklab, #e879f9 ${horizontalWeight}%, #38bdf8)`;
  const sampleColor = `color-mix(in oklab, ${bottomColor} ${verticalWeight}%, ${topColor})`;

  return (
    <ExampleFrame
      description="Every point blends continuously between four timbral characters."
      readout={`Morph ${formatPercent(value.x)} · ${formatPercent(value.y)}`}
    >
      <Plane
        aria-label="Timbre morph pad"
        className={`${EXAMPLE_PLANE_CLASS_NAME} bg-[radial-gradient(circle_at_0_0,#e879f9,transparent_62%),radial-gradient(circle_at_100%_0,#38bdf8,transparent_62%),radial-gradient(circle_at_0_100%,#f59e0b,transparent_62%),radial-gradient(circle_at_100%_100%,#10b981,transparent_62%),#171718]`}
      >
        <CornerLabels
          bottomLeft="Warm"
          bottomRight="Hollow"
          topLeft="Glassy"
          topRight="Metallic"
        />
        <PlaneThumb
          className={`${EXAMPLE_THUMB_CLASS_NAME} size-8`}
          getAriaValueText={formatTimbre}
          onValueChange={setValue}
          style={{ backgroundColor: sampleColor }}
          value={value}
          xAriaLabel="Soft to metallic"
          yAriaLabel="Warm to glassy"
        />
      </Plane>
    </ExampleFrame>
  );
}
