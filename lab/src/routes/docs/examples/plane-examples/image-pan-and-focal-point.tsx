import { useState } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from 'control-kit';
import owlPhotoUrl from './image-pan-and-focal-point.webp';

function describePosition({ x, y }: PlaneValue) {
  return `${Math.round(x * 100)}% from the left, ${Math.round(y * 100)}% from the bottom`;
}

export function ImagePanAndFocalPointExample() {
  const [pan, setPan] = useState<PlaneValue>({ x: 0.5, y: 0.5 });
  const [focalPoint, setFocalPoint] = useState<PlaneValue>({
    x: 0.72,
    y: 0.65,
  });

  return (
    <div className="flex min-h-[380px] scroll-mt-24 flex-col items-center justify-center gap-4 bg-[#111112] p-6 max-sm:p-4">
      <Plane
        aria-label="Image pan and focal point"
        className="relative aspect-[4/3] w-full max-w-[360px] cursor-grab touch-none overflow-hidden rounded-2xl border border-white/12 bg-[#233d45] [background-origin:border-box] data-[dragging]:cursor-grabbing"
        dragBehavior="relative"
        pressBehavior="nearest"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1/2"
          style={{
            transform: `translate(${(pan.x - 0.5) * 50}%, ${(0.5 - pan.y) * 50}%)`,
          }}
        >
          <img
            alt=""
            className="size-full object-cover"
            draggable={false}
            src={owlPhotoUrl}
          />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-5 rounded-lg border border-white/35"
        />
        <PlaneThumb
          aria-label="Image pan"
          className="size-7 border-white/60 bg-[#16363e]/80 text-white shadow-lg"
          getAriaValueText={describePosition}
          onValueChange={setPan}
          thumbId="image-pan"
          value={pan}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          >
            <path d="M10 3v14M3 10h14M7 6l3-3 3 3M7 14l3 3 3-3M6 7l-3 3 3 3M14 7l3 3-3 3" />
          </svg>
        </PlaneThumb>
        <PlaneThumb
          aria-label="Focal point"
          className="z-[2] size-8 border-2 border-[#ffdab9] bg-[#9d513c]/65 text-[#ffdab9] shadow-lg"
          getAriaValueText={describePosition}
          onValueChange={setFocalPoint}
          pressBehavior="none"
          thumbId="focal-point"
          value={focalPoint}
        >
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-current"
          />
        </PlaneThumb>
      </Plane>
      <div className="flex max-w-[360px] flex-col items-center gap-2 text-center">
        <output className="font-mono text-[10px] leading-5 text-white/65">
          Pan {Math.round(pan.x * 100)} / {Math.round(pan.y * 100)}
          <span aria-hidden="true" className="mx-3 opacity-40">
            ·
          </span>
          Focus {Math.round(focalPoint.x * 100)} /{' '}
          {Math.round(focalPoint.y * 100)}
        </output>
        <a
          className="text-[9px] text-white/45 underline decoration-white/25 underline-offset-2"
          href="https://unsplash.com/photos/brown-owl-sI6MbZDxUas"
          rel="noreferrer"
          target="_blank"
        >
          Photo by David Clode on Unsplash
        </a>
      </div>
    </div>
  );
}
