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

const initialValue: PlaneValue = { x: 0.7, y: 0.66 };

function formatFocalPoint(value: PlaneValue) {
  return `Crop focal point ${formatPercent(value.x)} from the left, ${formatPercent(value.y)} from the bottom`;
}

export function CropFocalPointExample() {
  const [value, setValue] = useState(initialValue);

  return (
    <PlaneExampleFrame
      description="Choose the subject that should remain visible when an image is cropped."
      readout={`${formatPercent(value.x)} · ${formatPercent(value.y)}`}
    >
      <Plane
        aria-label="Image crop focal point"
        className={EXAMPLE_PLANE_CLASS_NAME}
        style={{
          backgroundImage:
            'radial-gradient(circle at 72% 34%, #fef3c7 0 6%, transparent 6.5%), linear-gradient(155deg, #38bdf8 0 48%, #0ea5e9 48% 54%, #15803d 54% 70%, #14532d 70%)',
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-x-10 inset-y-5 rounded-lg border-2 border-white/70 shadow-[0_0_0_999px_rgb(0_0_0/0.28)]"
        >
          <span className="absolute -top-0.5 -left-0.5 size-3 border-t-2 border-l-2 border-white" />
          <span className="absolute -top-0.5 -right-0.5 size-3 border-t-2 border-r-2 border-white" />
          <span className="absolute -bottom-0.5 -left-0.5 size-3 border-b-2 border-l-2 border-white" />
          <span className="absolute -right-0.5 -bottom-0.5 size-3 border-r-2 border-b-2 border-white" />
        </div>
        <CrosshairLayer value={value} />
        <PlaneThumb
          className={EXAMPLE_THUMB_CLASS_NAME}
          getAriaValueText={formatFocalPoint}
          onValueChange={setValue}
          value={value}
          xAriaLabel="Crop focal point horizontal position"
          yAriaLabel="Crop focal point vertical position"
        />
      </Plane>
    </PlaneExampleFrame>
  );
}
