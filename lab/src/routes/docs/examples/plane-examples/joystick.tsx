import { useState, type ReactNode } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from 'control-kit';

const EXAMPLE_PLANE_CLASS_NAME =
  'relative size-[240px] touch-none overflow-hidden rounded-2xl border border-white/12 [background-origin:border-box] bg-[#171718] max-sm:size-[220px]';

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

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function toCenteredVector(value: PlaneValue) {
  const x = value.x * 2 - 1;
  const y = value.y * 2 - 1;
  return {
    angle: (Math.atan2(y, x) * 180) / Math.PI,
    magnitude: Math.min(1, Math.hypot(x, y)),
    x,
    y,
  };
}

function projectToCircle(value: PlaneValue): PlaneValue {
  const { x, y } = toCenteredVector(value);
  const length = Math.hypot(x, y);
  if (length <= 1) return value;

  return { x: 0.5 + x / length / 2, y: 0.5 + y / length / 2 };
}

const initialValue: PlaneValue = { x: 0.5, y: 0.5 };

function formatJoystick(value: PlaneValue) {
  const vector = toCenteredVector(value);
  return `${formatPercent((vector.x + 1) / 2)} horizontal, ${formatPercent((vector.y + 1) / 2)} vertical`;
}

export function JoystickExample() {
  const [value, setValue] = useState(initialValue);
  const vector = toCenteredVector(value);

  return (
    <ExampleFrame
      description="A circular constraint turns Plane into a two-axis joystick."
      readout={`X ${vector.x.toFixed(2)} · Y ${vector.y.toFixed(2)}`}
    >
      <Plane
        aria-label="Virtual joystick"
        className={`${EXAMPLE_PLANE_CLASS_NAME} rounded-full border-white/20 bg-[radial-gradient(circle,#27272a_0_20%,#18181b_21%_58%,#0d0d0f_59%)] shadow-[inset_0_5px_18px_rgb(0_0_0/0.6)]`}
      >
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 h-2 origin-left rounded-full bg-zinc-500 shadow-sm"
          style={{
            width: `${vector.magnitude * 50}%`,
            transform: `translateY(-50%) rotate(${-vector.angle}deg)`,
          }}
        />
        <PlaneThumb
          className="size-12 border-2 border-zinc-300 bg-linear-to-b from-zinc-500 to-zinc-800 shadow-[0_8px_14px_rgb(0_0_0/0.55),inset_0_1px_0_rgb(255_255_255/0.35)]"
          getAriaValueText={formatJoystick}
          onValueChange={(nextValue) => setValue(projectToCircle(nextValue))}
          value={value}
          xAriaLabel="Steering left and right"
          yAriaLabel="Steering backward and forward"
        >
          <span
            aria-hidden="true"
            className="size-5 rounded-full border border-white/25 bg-zinc-700"
          />
        </PlaneThumb>
      </Plane>
    </ExampleFrame>
  );
}
