import { useState, type ReactNode } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from '@color-kit/control-kit';

const EXAMPLE_PLANE_CLASS_NAME =
  'relative size-[240px] touch-none overflow-hidden rounded-2xl border border-white/12 bg-[#171718] max-sm:size-[220px]';
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

function CrosshairLayer({ value }: { value: PlaneValue }) {
  return (
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

const initialValue: PlaneValue = { x: 0.62, y: 0.42 };

function formatSynth(value: PlaneValue) {
  return `${formatPercent(value.x)} brightness, ${formatPercent(value.y)} modulation`;
}

export function XySynthPadExample() {
  const [value, setValue] = useState(initialValue);

  return (
    <ExampleFrame
      description="Morph brightness and modulation together for expressive sound design."
      readout={`Brightness ${formatPercent(value.x)} · Mod ${formatPercent(value.y)}`}
    >
      <Plane
        aria-label="XY synthesizer pad"
        className={`${EXAMPLE_PLANE_CLASS_NAME} bg-[radial-gradient(circle_at_80%_15%,rgb(34_211_238/0.55),transparent_48%),radial-gradient(circle_at_15%_85%,rgb(168_85_247/0.65),transparent_55%),#121216]`}
      >
        <GridLayer subdivisions={8} />
        <CrosshairLayer value={value} />
        <CornerLabels
          bottomLeft="Dark / dry"
          bottomRight="Bright / dry"
          topLeft="Dark / mod"
          topRight="Bright / mod"
        />
        <PlaneThumb
          className={`${EXAMPLE_THUMB_CLASS_NAME} bg-white`}
          getAriaValueText={formatSynth}
          onValueChange={setValue}
          value={value}
          xAriaLabel="Timbre brightness"
          yAriaLabel="Modulation depth"
        />
      </Plane>
    </ExampleFrame>
  );
}
