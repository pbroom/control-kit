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

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

const initialValue: PlaneValue = { x: 0.34, y: 0.7 };

function formatGradientOrigin(value: PlaneValue) {
  return `Gradient origin ${formatPercent(value.x)} from the left, ${formatPercent(value.y)} from the bottom`;
}

export function GradientOriginExample() {
  const [value, setValue] = useState(initialValue);
  const cssY = 1 - value.y;

  return (
    <PlaneExampleFrame
      description="Move the focal origin that shapes a radial gradient."
      readout={`at ${formatPercent(value.x)} ${formatPercent(cssY)}`}
    >
      <Plane
        aria-label="Radial gradient origin"
        className={EXAMPLE_PLANE_CLASS_NAME}
        style={{
          backgroundImage: `radial-gradient(circle at ${value.x * 100}% ${cssY * 100}%, #f8fafc 0%, #a78bfa 18%, #4f46e5 46%, #111827 82%)`,
        }}
      >
        <CrosshairLayer value={value} />
        <PlaneThumb
          className={EXAMPLE_THUMB_CLASS_NAME}
          getAriaValueText={formatGradientOrigin}
          onValueChange={setValue}
          value={value}
          xAriaLabel="Gradient origin horizontal position"
          yAriaLabel="Gradient origin vertical position"
        />
      </Plane>
    </PlaneExampleFrame>
  );
}
