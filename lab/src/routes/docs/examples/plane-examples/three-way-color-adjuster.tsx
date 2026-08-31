import { useState } from 'react';
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

function ToneSlider({
  accent,
  label,
  onChange,
  value,
}: {
  accent: string;
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className="relative block h-6 w-full">
      <span className="sr-only">{label}</span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full"
        style={{
          background: `linear-gradient(to right, ${accent} 0%, ${accent} ${value}%, #4b4b4b ${value}%, #4b4b4b 100%)`,
        }}
      />
      <input
        aria-label={label}
        aria-orientation="horizontal"
        aria-valuetext={`${value}%`}
        className="absolute inset-0 m-0 h-6 w-full cursor-ew-resize appearance-none bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-[#ff535b]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111113] [&::-moz-range-thumb]:size-[14px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-black/20 [&::-moz-range-thumb]:bg-[#d0d0d0] [&::-moz-range-thumb]:shadow-[0_1px_3px_rgb(0_0_0/0.45)] [&::-moz-range-track]:h-6 [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-6 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:mt-[5px] [&::-webkit-slider-thumb]:size-[14px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-black/20 [&::-webkit-slider-thumb]:bg-[#d0d0d0] [&::-webkit-slider-thumb]:shadow-[0_1px_3px_rgb(0_0_0/0.45)]"
        data-tone-slider=""
        max={100}
        min={0}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        step={1}
        type="range"
        value={value}
      />
    </label>
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
    <div
      className="flex min-w-0 flex-col items-center gap-3"
      data-tone-control=""
    >
      <Plane
        aria-label={`${tone.label} color balance`}
        className="relative size-[100px] touch-none overflow-hidden rounded-full border border-white/6 [background-origin:border-box] max-sm:size-[84px]"
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
      <span
        className="text-[13px] leading-none font-medium tracking-[-0.01em] text-white/80"
        data-tone-label=""
      >
        {tone.label}
      </span>
      <div className="flex w-full max-w-[120px] flex-col gap-2 max-sm:max-w-[96px]">
        <ToneSlider
          accent="#ff535b"
          label={`${tone.label} saturation`}
          onChange={onSaturationChange}
          value={tone.saturation}
        />
        <ToneSlider
          accent="#d8d8d8"
          label={`${tone.label} luminance`}
          onChange={onLuminanceChange}
          value={tone.luminance}
        />
      </div>
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
    <div className="flex min-h-[320px] items-center justify-center px-6 py-8 max-sm:px-3">
      <section
        aria-label="Color balance control"
        className="grid w-full max-w-[520px] grid-cols-3 items-start gap-6 max-sm:gap-2"
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
