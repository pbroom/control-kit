import { useState, type ReactNode } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from '@color-kit/control-kit';

const EXAMPLE_PLANE_CLASS_NAME =
  'relative size-[240px] touch-none overflow-hidden rounded-2xl border border-white/12 bg-[#171718] max-sm:size-[220px]';
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

const initialValue: PlaneValue = { x: 0.68, y: 0.62 };

function formatBackgroundPosition(value: PlaneValue) {
  return `${formatPercent(value.x)} from the left, ${formatPercent(value.y)} from the bottom`;
}

export function BackgroundPositionExample() {
  const [value, setValue] = useState(initialValue);

  return (
    <PlaneExampleFrame
      description="Set which part of an oversized background stays in view."
      readout={`background-position: ${formatPercent(value.x)} ${formatPercent(1 - value.y)}`}
    >
      <Plane
        aria-label="Background position"
        className={EXAMPLE_PLANE_CLASS_NAME}
      >
        <div
          aria-hidden="true"
          className="absolute -inset-8 scale-125 bg-[radial-gradient(circle_at_72%_32%,#fbbf24_0_7%,transparent_8%),linear-gradient(150deg,#2563eb_0_44%,#1d4ed8_44%_52%,#166534_52%_70%,#14532d_70%)] opacity-90"
          style={{
            transform: `translate(${(0.5 - value.x) * 28}px, ${(value.y - 0.5) * 28}px) scale(1.25)`,
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-8 rounded-lg border-2 border-white/45 shadow-[0_0_0_999px_rgb(0_0_0/0.16)]"
        />
        <CrosshairLayer value={value} />
        <PlaneThumb
          className={EXAMPLE_THUMB_CLASS_NAME}
          getAriaValueText={formatBackgroundPosition}
          onValueChange={setValue}
          value={value}
          xAriaLabel="Horizontal background position"
          yAriaLabel="Vertical background position"
        />
      </Plane>
    </PlaneExampleFrame>
  );
}
