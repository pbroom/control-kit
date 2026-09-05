import { useState } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from '@color-kit/control-kit';

const initialValue: PlaneValue = { x: 0.78, y: 0.72 };

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
  const x = value.x * 2 - 1;
  const y = value.y * 2 - 1;
  const length = Math.hypot(x, y);

  return length <= 1
    ? value
    : { x: 0.5 + x / length / 2, y: 0.5 + y / length / 2 };
}

function describeLight(value: PlaneValue) {
  const vector = toCenteredVector(value);
  return `${Math.round(vector.angle)} degrees, ${Math.round(vector.magnitude * 100)}% strength`;
}

export function LightDirectionExample() {
  const [value, setValue] = useState(initialValue);
  const vector = toCenteredVector(value);

  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 p-6 max-sm:min-h-[340px] max-sm:p-4">
      <Plane
        aria-label="Light direction"
        className="relative size-[240px] touch-none overflow-hidden rounded-full border border-white/12 [background-origin:border-box] bg-[radial-gradient(circle,#30343b_0_32%,#15171b_33%_100%)] max-sm:size-[220px]"
      >
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 h-px origin-left bg-amber-200/60"
          style={{
            transform: `rotate(${-vector.angle}deg)`,
            width: `${vector.magnitude * 50}%`,
          }}
        />
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_35%_30%,#f4f4f5,#9ca3af_55%,#34383f)]"
          style={{
            boxShadow: `${-vector.x * 16}px ${vector.y * 16}px 20px rgb(0 0 0 / 0.72)`,
          }}
        />
        <PlaneThumb
          aria-label="Directional light"
          className="size-6 border-2 border-amber-100 bg-amber-300 shadow-[0_2px_10px_rgba(0,0,0,0.45)]"
          getAriaValueText={describeLight}
          onValueChange={(nextValue) => setValue(projectToCircle(nextValue))}
          value={value}
          xAriaLabel="Horizontal light direction"
          yAriaLabel="Vertical light direction"
        />
      </Plane>
      <div className="flex max-w-[300px] flex-col items-center gap-1.5 text-center">
        <output className="font-mono text-[11px] text-white/72">
          {describeLight(value)}
        </output>
        <p className="m-0 text-xs leading-5 text-white/42">
          Aim a directional light; distance from center controls strength.
        </p>
      </div>
    </div>
  );
}
