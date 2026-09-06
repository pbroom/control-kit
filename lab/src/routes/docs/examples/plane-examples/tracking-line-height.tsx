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

const initialValue: PlaneValue = { x: 0.35, y: 0.42 };

function toTypography(value: PlaneValue) {
  return {
    lineHeight: 1 + value.y,
    tracking: -0.03 + value.x * 0.18,
  };
}

function formatTypography(value: PlaneValue) {
  const typography = toTypography(value);
  return `Letter spacing ${typography.tracking.toFixed(2)} em, line height ${typography.lineHeight.toFixed(2)}`;
}

export function TrackingLineHeightExample() {
  const [value, setValue] = useState(initialValue);
  const typography = toTypography(value);

  return (
    <PlaneExampleFrame
      description="Tune horizontal character spacing and vertical reading rhythm together."
      readout={`tracking ${typography.tracking.toFixed(2)}em · leading ${typography.lineHeight.toFixed(2)}`}
    >
      <Plane
        aria-label="Tracking and line height"
        className={EXAMPLE_PLANE_CLASS_NAME}
      >
        <GridLayer />
        <p
          aria-hidden="true"
          className="absolute inset-8 m-0 flex items-center text-[13px] text-white/55"
          style={{
            letterSpacing: `${typography.tracking}em`,
            lineHeight: typography.lineHeight,
          }}
        >
          Space shapes the voice.
          <br />
          Rhythm guides the eye.
          <br />
          Type becomes texture.
        </p>
        <PlaneThumb
          className={EXAMPLE_THUMB_CLASS_NAME}
          getAriaValueText={formatTypography}
          onValueChange={setValue}
          value={value}
          xAriaLabel="Letter spacing"
          yAriaLabel="Line height"
        />
      </Plane>
    </PlaneExampleFrame>
  );
}
