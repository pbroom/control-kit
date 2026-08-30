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

function toCenteredVector(value: PlaneValue) {
  const x = value.x * 2 - 1;
  const y = value.y * 2 - 1;
  const magnitude = Math.min(1, Math.hypot(x, y));
  const angle = (Math.atan2(y, x) * 180) / Math.PI;

  return { angle, magnitude, x, y };
}

function projectToCircle(value: PlaneValue): PlaneValue {
  const vector = toCenteredVector(value);
  if (Math.hypot(vector.x, vector.y) <= 1) return value;

  const length = Math.hypot(vector.x, vector.y);
  return {
    x: 0.5 + vector.x / length / 2,
    y: 0.5 + vector.y / length / 2,
  };
}

const initialValues = [
  { label: 'Shadows', value: { x: 0.4, y: 0.58 } },
  { label: 'Midtones', value: { x: 0.5, y: 0.5 } },
  { label: 'Highlights', value: { x: 0.62, y: 0.56 } },
] satisfies Array<{ label: string; value: PlaneValue }>;

function formatColorBalance(label: string, value: PlaneValue) {
  const { angle, magnitude } = toCenteredVector(value);
  return `${label}: ${Math.round(angle)} degrees, ${Math.round(magnitude * 100)} percent intensity`;
}

export function ThreeWayColorAdjusterExample() {
  const [tones, setTones] = useState(initialValues);

  return (
    <PlaneExampleFrame
      description="Balance shadows, midtones, and highlights independently."
      readout={tones
        .map(({ label, value }) => {
          const { magnitude } = toCenteredVector(value);
          return `${label[0]} ${Math.round(magnitude * 100)}`;
        })
        .join(' · ')}
    >
      <div className="flex items-center gap-3 max-sm:gap-2">
        {tones.map((tone, index) => (
          <div className="flex flex-col items-center gap-2" key={tone.label}>
            <Plane
              aria-label={`${tone.label} color balance`}
              className={`${EXAMPLE_PLANE_CLASS_NAME} !size-28 !rounded-full max-sm:!size-24`}
              style={{
                background:
                  'conic-gradient(from 0deg, #ef4444, #facc15, #22c55e, #22d3ee, #3b82f6, #a855f7, #ef4444)',
              }}
            >
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-[radial-gradient(circle,#f5f5f4_0%,transparent_72%)]"
              />
              <PlaneThumb
                className={`${EXAMPLE_THUMB_CLASS_NAME} !size-5`}
                getAriaValueText={(value) =>
                  formatColorBalance(tone.label, value)
                }
                onValueChange={(value) => {
                  const constrainedValue = projectToCircle(value);
                  setTones((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, value: constrainedValue }
                        : item,
                    ),
                  );
                }}
                value={tone.value}
                xAriaLabel={`${tone.label} cyan to red balance`}
                yAriaLabel={`${tone.label} blue to yellow balance`}
              />
            </Plane>
            <span className="text-[10px] font-medium text-white/60">
              {tone.label}
            </span>
          </div>
        ))}
      </div>
    </PlaneExampleFrame>
  );
}
