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

const COLOR_BALANCE_STOPS = [
  { color: [227, 92, 40], position: 0 },
  { color: [214, 75, 131], position: 55 },
  { color: [116, 77, 179], position: 95 },
  { color: [40, 120, 212], position: 140 },
  { color: [24, 182, 197], position: 190 },
  { color: [29, 187, 141], position: 230 },
  { color: [124, 168, 61], position: 285 },
  { color: [227, 166, 46], position: 325 },
  { color: [227, 92, 40], position: 360 },
] as const;

function getColorBalanceBias(value: PlaneValue) {
  const vector = toCenteredVector(value);
  if (vector.magnitude < 0.001) return 'rgb(112 112 112)';

  const wheelPosition = (vector.angle + 110 + 360) % 360;
  const endIndex = COLOR_BALANCE_STOPS.findIndex(
    (stop) => stop.position >= wheelPosition,
  );
  const start = COLOR_BALANCE_STOPS[Math.max(0, endIndex - 1)]!;
  const end = COLOR_BALANCE_STOPS[endIndex]!;
  const progress =
    (wheelPosition - start.position) / (end.position - start.position || 1);
  const color = start.color.map((channel, index) =>
    Math.round(channel + (end.color[index]! - channel) * progress),
  );

  return `rgb(${color.join(' ')})`;
}

function ToneSlider({
  kind,
  label,
  onChange,
  trackBackground,
  value,
}: {
  kind: 'luminance' | 'saturation';
  label: string;
  onChange: (value: number) => void;
  trackBackground: string;
  value: number;
}) {
  return (
    <label className="relative block h-6 w-full">
      <span className="sr-only">{label}</span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full"
        data-tone-slider-track={kind}
        style={{ background: trackBackground }}
      />
      <input
        aria-label={label}
        aria-orientation="horizontal"
        aria-valuetext={`${value}%`}
        className="absolute inset-0 m-0 h-6 w-full cursor-ew-resize appearance-none bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-[#ff535b]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111113] [&::-moz-range-thumb]:size-[14px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-black/20 [&::-moz-range-thumb]:bg-[#d0d0d0] [&::-moz-range-thumb]:shadow-[0_1px_3px_rgb(0_0_0/0.45)] [&::-moz-range-track]:h-6 [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-6 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:mt-[5px] [&::-webkit-slider-thumb]:size-[14px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-black/20 [&::-webkit-slider-thumb]:bg-[#d0d0d0] [&::-webkit-slider-thumb]:shadow-[0_1px_3px_rgb(0_0_0/0.45)]"
        data-tone-slider={kind}
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
  const biasColor = getColorBalanceBias(tone.value);

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
          kind="saturation"
          label={`${tone.label} saturation`}
          onChange={onSaturationChange}
          trackBackground={`linear-gradient(to right, #4b4b4b, ${biasColor})`}
          value={tone.saturation}
        />
        <ToneSlider
          kind="luminance"
          label={`${tone.label} luminance`}
          onChange={onLuminanceChange}
          trackBackground="linear-gradient(to right, #111111, #f2f2f2)"
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
