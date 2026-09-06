import { useState, type ReactNode } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from 'control-kit';

const EXAMPLE_PLANE_CLASS_NAME =
  'relative size-[240px] touch-none overflow-hidden rounded-2xl border border-black/12 [background-origin:border-box] bg-[#e6e8ec] max-sm:size-[220px]';
const EXAMPLE_THUMB_CLASS_NAME =
  'size-6 border-2 border-white bg-[#171718] shadow-[0_2px_10px_rgba(0,0,0,0.45)]';

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

const initialValue: PlaneValue = { x: 0.66, y: 0.34 };

function toShadowOffset(value: PlaneValue) {
  return {
    x: Math.round((0.5 - value.x) * 72),
    y: Math.round((value.y - 0.5) * 72),
  };
}

function formatLightSource(value: PlaneValue) {
  const offset = toShadowOffset(value);
  return `Light source ${Math.round(value.x * 100)}% from left, ${Math.round(value.y * 100)}% from bottom; shadow offset ${offset.x} pixels horizontally, ${offset.y} pixels vertically`;
}

export function DropShadowOffsetExample() {
  const [value, setValue] = useState(initialValue);
  const offset = toShadowOffset(value);

  return (
    <PlaneExampleFrame
      readout={`light ${Math.round(value.x * 100)}% left · ${Math.round(value.y * 100)}% bottom → shadows ${offset.x}px ${offset.y}px · 4 / 10 / 22px blur`}
    >
      <Plane
        aria-label="Drop shadow offset"
        className={EXAMPLE_PLANE_CLASS_NAME}
      >
        <div
          aria-hidden="true"
          data-shadow-object
          className="absolute top-1/2 left-1/2 size-20 -translate-1/2 rounded-2xl bg-gradient-to-br from-white to-white/75"
          style={{
            boxShadow: [
              `${Math.round(offset.x * 0.38)}px ${Math.round(offset.y * 0.38)}px 4px rgb(25 29 37 / 0.16)`,
              `${Math.round(offset.x * 0.7)}px ${Math.round(offset.y * 0.7)}px 10px rgb(25 29 37 / 0.12)`,
              `${offset.x}px ${offset.y}px 22px rgb(25 29 37 / 0.08)`,
            ].join(', '),
          }}
        />
        <PlaneThumb
          className={EXAMPLE_THUMB_CLASS_NAME}
          getAriaValueText={formatLightSource}
          onValueChange={setValue}
          value={value}
          xAriaLabel="Horizontal light position"
          yAriaLabel="Vertical light position"
        />
      </Plane>
    </PlaneExampleFrame>
  );
}
