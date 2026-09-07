import { useState } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from 'control-kit';

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
          <svg
            className="size-full"
            preserveAspectRatio="xMidYMid slice"
            viewBox="0 0 960 720"
          >
            <rect width="960" height="720" fill="#a7c0c2" />
            <circle cx="650" cy="235" r="47" fill="#f3dec0" />
            <path
              d="M0 500 235 160 415 390 575 210 960 535V720H0Z"
              fill="#688b91"
            />
            <path d="m178 243 57-83 84 109-62-32-22-39-22 42Z" fill="#d4ddda" />
            <path
              d="M0 505 270 348 440 490 745 300 960 450V720H0Z"
              fill="#3c626b"
            />
            <path d="M0 570Q220 445 455 547T960 480V720H0Z" fill="#24464f" />
            <path d="M380 720 462 558 547 515 502 592 510 720" fill="#86a9ab" />
            <path
              d="M0 660Q230 555 385 646L356 720H0Zm620 60-92-91q254-71 432-14v105Z"
              fill="#18373f"
            />
          </svg>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-5 rounded-lg border border-white/35"
        >
          <span className="absolute top-2 left-2 rounded bg-black/25 px-2 py-1 font-mono text-[9px] tracking-wider text-white/80">
            FRAME 01
          </span>
        </div>
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
        <p className="m-0 text-xs leading-5 text-white/60">
          Drag the image to reframe. Grab the peach point to move focus. Both
          stay where you grabbed them—nothing jumps to the cursor.
        </p>
      </div>
    </div>
  );
}
