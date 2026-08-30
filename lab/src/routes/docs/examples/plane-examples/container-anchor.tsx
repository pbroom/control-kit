import { useState, type ReactNode } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from '@color-kit/control-kit';

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

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

const initialValue: PlaneValue = { x: 0.25, y: 0.75 };

function formatContainerAnchor(value: PlaneValue) {
  return `Anchor ${formatPercent(value.x)} from the left, ${formatPercent(value.y)} from the bottom`;
}

export function ContainerAnchorExample() {
  const [value, setValue] = useState(initialValue);

  return (
    <PlaneExampleFrame
      description="Place an anchor anywhere inside a container."
      readout={`anchor ${formatPercent(value.x)} · ${formatPercent(value.y)}`}
    >
      <Plane
        aria-label="Container anchor point"
        className={EXAMPLE_PLANE_CLASS_NAME}
      >
        <GridLayer subdivisions={3} />
        <div
          aria-hidden="true"
          className="absolute inset-5 rounded-xl border border-dashed border-white/30"
        />
        <PlaneThumb
          className={`${EXAMPLE_THUMB_CLASS_NAME} !rounded-md`}
          getAriaValueText={formatContainerAnchor}
          onValueChange={setValue}
          value={value}
          xAriaLabel="Anchor horizontal position"
          yAriaLabel="Anchor vertical position"
        >
          <span aria-hidden="true" className="size-1.5 rounded-full bg-white" />
        </PlaneThumb>
      </Plane>
    </PlaneExampleFrame>
  );
}
