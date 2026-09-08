import { useState } from 'react';
import {
  Plane,
  PlaneAttachment,
  PlaneThumb,
  type PlaneValue,
} from 'control-kit';

const THUMB_CLASS_NAME =
  'size-5 border-2 border-white bg-[#171718] shadow-[0_2px_10px_rgba(0,0,0,0.35)]';

export function GradientOriginExample() {
  const [origin, setOrigin] = useState<PlaneValue>({ x: 0.34, y: 0.7 });
  const [radiusOffset, setRadiusOffset] = useState<PlaneValue>({
    x: 0.36,
    y: -0.12,
  });
  const radius = Math.hypot(radiusOffset.x, radiusOffset.y);
  const cssY = 1 - origin.y;

  return (
    <div className="flex min-h-[380px] flex-col items-center justify-center gap-5 p-6 max-sm:p-4">
      <Plane
        aria-label="Radial gradient origin and radius"
        pressBehavior="nearest"
        dragBehavior="relative"
        className="relative size-[280px] touch-none rounded-2xl border border-white/12 bg-[#111827] p-0 [background-origin:border-box] max-sm:size-[240px] [&:is(:hover,:has([data-focus-visible])):not(:active):not([data-dragging])_circle]:opacity-100"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
          style={{
            backgroundImage: `radial-gradient(ellipse ${Math.max(radius, 0.001) * 100}% ${Math.max(radius, 0.001) * 100}% at ${origin.x * 100}% ${cssY * 100}%, #f8fafc 0%, #a78bfa 22%, #4f46e5 62%, #111827 100%)`,
          }}
        >
          <svg className="absolute inset-0 size-full" viewBox="0 0 100 100">
            <circle
              className="opacity-0"
              cx={origin.x * 100}
              cy={cssY * 100}
              r={radius * 100}
              fill="none"
              stroke="white"
              strokeOpacity="0.25"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              strokeDasharray="3 4"
            />
            <line
              x1={origin.x * 100}
              y1={cssY * 100}
              x2={(origin.x + radiusOffset.x) * 100}
              y2={(cssY - radiusOffset.y) * 100}
              stroke="white"
              strokeOpacity="0.65"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
        <PlaneThumb
          thumbId="gradient-origin"
          className={THUMB_CLASS_NAME}
          value={origin}
          onValueChange={setOrigin}
          xAriaLabel="Gradient origin horizontal position"
          yAriaLabel="Gradient origin vertical position"
        >
          <PlaneThumb
            thumbId="gradient-radius"
            className="size-4 border-2 border-white bg-[#a78bfa] shadow-[0_2px_10px_rgba(0,0,0,0.35)]"
            value={radiusOffset}
            onValueChange={setRadiusOffset}
            pressBehavior="none"
            xAriaLabel="Gradient radius horizontal offset"
            yAriaLabel="Gradient radius vertical offset"
            getAriaValueText={(offset) =>
              `Radius ${Math.round(Math.hypot(offset.x, offset.y) * 100)}% of the plane`
            }
          >
            <PlaneAttachment
              side="right"
              visibility="focus-within"
              className="pointer-events-none rounded-md bg-[#171718] px-2 py-1 font-mono text-[10px] text-white shadow-md"
            >
              {Math.round(radius * 100)}%
            </PlaneAttachment>
          </PlaneThumb>
        </PlaneThumb>
      </Plane>
      <output className="font-mono text-[11px] text-white/72">
        Origin {Math.round(origin.x * 100)}% / {Math.round(cssY * 100)}%{' · '}
        Radius {Math.round(radius * 100)}%
      </output>
    </div>
  );
}
