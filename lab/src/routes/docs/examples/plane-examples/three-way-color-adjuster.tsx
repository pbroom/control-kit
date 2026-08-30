import { useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Plus } from 'lucide-react';
import { Plane, PlaneThumb, type PlaneValue } from '@color-kit/control-kit';

type Tone = {
  label: 'Highlights' | 'Midtones' | 'Shadows';
  luminance: number;
  saturation: number;
  value: PlaneValue;
};

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

const initialTones: Tone[] = [
  {
    label: 'Highlights',
    luminance: 72,
    saturation: 64,
    value: { x: 0.54, y: 0.48 },
  },
  {
    label: 'Midtones',
    luminance: 56,
    saturation: 52,
    value: { x: 0.5, y: 0.5 },
  },
  {
    label: 'Shadows',
    luminance: 42,
    saturation: 58,
    value: { x: 0.46, y: 0.52 },
  },
];

function formatColorBalance(label: string, value: PlaneValue) {
  const { angle, magnitude } = toCenteredVector(value);
  return `${label}: ${Math.round(angle)} degrees, ${Math.round(magnitude * 100)} percent intensity`;
}

const ARC_CENTER_X = 120;
const ARC_CENTER_Y = 65;
const ARC_RADIUS = 69;
const ARC_SWEEP_RADIANS = (55 * Math.PI) / 180;

function ArcSlider({
  label,
  onChange,
  side,
  value,
}: {
  label: string;
  onChange: (value: number) => void;
  side: 'left' | 'right';
  value: number;
}) {
  const normalizedValue = value / 100;
  const angle =
    side === 'left'
      ? Math.PI + (normalizedValue - 0.5) * ARC_SWEEP_RADIANS * 2
      : (0.5 - normalizedValue) * ARC_SWEEP_RADIANS * 2;
  const thumbX = ARC_CENTER_X + Math.cos(angle) * ARC_RADIUS;
  const thumbY = ARC_CENTER_Y + Math.sin(angle) * ARC_RADIUS;
  const activeClipBottom = 100 - (thumbY / (ARC_CENTER_Y * 2)) * 100;
  const railClipPath =
    side === 'left'
      ? 'polygon(0 10%, 50% 10%, 50% 90%, 0 90%)'
      : 'polygon(50% 10%, 100% 10%, 100% 90%, 50% 90%)';
  const updateFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const pointerRatio = (event.clientY - rect.top) / rect.height;
    onChange(Math.round(Math.max(0, Math.min(1, 1 - pointerRatio)) * 100));
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const changes: Record<string, number> = {
      ArrowDown: -1,
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: 1,
      PageDown: -10,
      PageUp: 10,
    };

    if (event.key === 'Home') {
      event.preventDefault();
      onChange(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      onChange(100);
      return;
    }

    const change = changes[event.key];
    if (change === undefined) return;
    event.preventDefault();
    onChange(Math.max(0, Math.min(100, value + change)));
  };

  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 size-[138px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[4px] border-[#4b4b4b]"
        style={{ clipPath: railClipPath }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 0 ${activeClipBottom}% 0)` }}
      >
        <span
          className={`absolute top-1/2 left-1/2 size-[138px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[4px] ${side === 'left' ? 'border-[#ff535b]' : 'border-[#d8d8d8]'}`}
          style={{ clipPath: railClipPath }}
        />
      </span>
      <div
        aria-label={label}
        aria-orientation="vertical"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={value}
        aria-valuetext={`${value}%`}
        className={`absolute top-2 z-20 h-[114px] w-12 touch-none cursor-ns-resize rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#ff535b]/80 ${side === 'left' ? 'left-7' : 'right-7'}`}
        onKeyDown={handleKeyDown}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          updateFromPointer(event);
        }}
        onPointerMove={(event) => {
          if (event.buttons === 1) {
            updateFromPointer(event);
          }
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        role="slider"
        tabIndex={0}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute z-30 size-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/20 bg-[#d0d0d0] shadow-[0_1px_3px_rgb(0_0_0/0.45)]"
        style={{ left: thumbX, top: thumbY }}
      />
    </>
  );
}

function ToneWheel({
  onLuminanceChange,
  onSaturationChange,
  onValueChange,
  tone,
}: {
  onLuminanceChange: (value: number) => void;
  onSaturationChange: (value: number) => void;
  onValueChange: (value: PlaneValue) => void;
  tone: Tone;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative flex h-[130px] w-[240px] items-center justify-center">
        <ArcSlider
          label={`${tone.label} saturation`}
          onChange={onSaturationChange}
          side="left"
          value={tone.saturation}
        />
        <ArcSlider
          label={`${tone.label} luminance`}
          onChange={onLuminanceChange}
          side="right"
          value={tone.luminance}
        />
        <Plane
          aria-label={`${tone.label} color balance`}
          className="relative z-10 size-[100px] touch-none overflow-hidden rounded-full border border-white/6 [background-origin:border-box]"
          style={{
            backgroundImage:
              'radial-gradient(circle, #393939 0%, rgb(50 50 50 / 0.98) 31%, rgb(43 43 43 / 0.72) 53%, transparent 73%), conic-gradient(from -20deg, #e35c28 0deg, #d64b83 55deg, #744db3 95deg, #2878d4 140deg, #18b6c5 190deg, #1dbb8d 230deg, #7ca83d 285deg, #e3a62e 325deg, #e35c28 360deg)',
          }}
        >
          <Plus
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 z-0 size-8 -translate-x-1/2 -translate-y-1/2 text-[#727272]"
            strokeWidth={0.8}
          />
          <PlaneThumb
            className="z-10 size-[18px] border border-white/45 bg-[#c8c8c8] shadow-[0_1px_3px_rgb(0_0_0/0.5)]"
            getAriaValueText={(value) => formatColorBalance(tone.label, value)}
            onValueChange={(value) => onValueChange(projectToCircle(value))}
            value={tone.value}
            xAriaLabel={`${tone.label} cyan to red balance`}
            yAriaLabel={`${tone.label} blue to yellow balance`}
          />
        </Plane>
      </div>
      <span className="text-[15px] leading-none font-medium tracking-[-0.01em] text-white/80">
        {tone.label}
      </span>
    </div>
  );
}

export function ThreeWayColorAdjusterExample() {
  const [tones, setTones] = useState(initialTones);

  const updateTone = (index: number, update: Partial<Tone>) => {
    setTones((current) =>
      current.map((tone, toneIndex) =>
        toneIndex === index ? { ...tone, ...update } : tone,
      ),
    );
  };

  return (
    <div className="flex min-h-[560px] items-center justify-center px-6 py-8 max-sm:px-3">
      <section
        aria-label="Color balance control"
        className="flex w-full max-w-[300px] flex-col items-center gap-4"
        role="region"
      >
        {tones.map((tone, index) => (
          <ToneWheel
            key={tone.label}
            onLuminanceChange={(luminance) => updateTone(index, { luminance })}
            onSaturationChange={(saturation) =>
              updateTone(index, { saturation })
            }
            onValueChange={(value) => updateTone(index, { value })}
            tone={tone}
          />
        ))}

        <output className="sr-only" aria-live="polite">
          {tones
            .map(({ label, luminance, saturation, value }) => {
              const { magnitude } = toCenteredVector(value);
              return `${label} ${Math.round(magnitude * 100)}, saturation ${saturation}, luminance ${luminance}`;
            })
            .join(', ')}
        </output>
      </section>
    </div>
  );
}
