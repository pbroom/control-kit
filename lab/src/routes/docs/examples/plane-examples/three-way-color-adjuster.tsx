import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Plane, PlaneThumb, type PlaneValue } from '@color-kit/control-kit';

type Tone = {
  label: 'Highlights' | 'Midtones' | 'Shadows';
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
  { label: 'Highlights', value: { x: 0.54, y: 0.48 } },
  { label: 'Midtones', value: { x: 0.5, y: 0.5 } },
  { label: 'Shadows', value: { x: 0.46, y: 0.52 } },
];

function formatColorBalance(label: string, value: PlaneValue) {
  const { angle, magnitude } = toCenteredVector(value);
  return `${label}: ${Math.round(angle)} degrees, ${Math.round(magnitude * 100)} percent intensity`;
}

function BalanceTracks() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <span className="absolute top-[10%] bottom-1/2 left-2 w-14 rounded-tl-full border-t-[5px] border-l-[5px] border-[#ff454b] border-r-transparent border-b-transparent" />
      <span className="absolute top-1/2 bottom-[10%] left-2 w-14 rounded-bl-full border-b-[5px] border-l-[5px] border-[#515151] border-t-transparent border-r-transparent" />
      <span className="absolute top-[10%] right-8 bottom-1/2 w-14 rounded-tr-full border-t-[5px] border-r-[5px] border-[#d5d5d5] border-b-transparent border-l-transparent" />
      <span className="absolute top-1/2 right-8 bottom-[10%] w-14 rounded-br-full border-r-[5px] border-b-[5px] border-[#515151] border-t-transparent border-l-transparent" />
      <span className="absolute top-1/2 left-0 size-5 -translate-y-1/2 rounded-full border border-black/15 bg-[#c9c9c9] shadow-sm" />
      <span className="absolute top-1/2 right-6 size-5 -translate-y-1/2 rounded-full border border-black/15 bg-[#c9c9c9] shadow-sm" />
      <span className="absolute top-1/2 left-0 h-px w-2 -translate-x-3 bg-white/35" />
      <span className="absolute top-1/2 right-3 h-px w-2 translate-x-3 bg-white/35" />
    </div>
  );
}

function ToneWheel({
  onChange,
  tone,
}: {
  onChange: (value: PlaneValue) => void;
  tone: Tone;
}) {
  return (
    <div className="relative flex h-[208px] w-full max-w-[330px] items-center justify-center max-sm:h-[176px] max-sm:max-w-[276px]">
      <BalanceTracks />
      <Plane
        aria-label={`${tone.label} color balance`}
        className="relative size-[198px] touch-none overflow-hidden rounded-full border border-white/6 [background-origin:border-box] max-sm:size-[166px]"
        style={{
          backgroundImage:
            'radial-gradient(circle, #393939 0%, rgb(50 50 50 / 0.98) 31%, rgb(43 43 43 / 0.72) 53%, transparent 73%), conic-gradient(from -20deg, #e35c28 0deg, #d64b83 55deg, #744db3 95deg, #2878d4 140deg, #18b6c5 190deg, #1dbb8d 230deg, #7ca83d 285deg, #e3a62e 325deg, #e35c28 360deg)',
        }}
      >
        <Plus
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 z-0 size-14 -translate-x-1/2 -translate-y-1/2 text-[#727272]"
          strokeWidth={0.8}
        />
        <PlaneThumb
          className="z-10 size-8 border border-white/45 bg-[#c8c8c8] shadow-[0_1px_4px_rgb(0_0_0/0.5)]"
          getAriaValueText={(value) => formatColorBalance(tone.label, value)}
          onValueChange={(value) => onChange(projectToCircle(value))}
          value={tone.value}
          xAriaLabel={`${tone.label} cyan to red balance`}
          yAriaLabel={`${tone.label} blue to yellow balance`}
        />
      </Plane>
    </div>
  );
}

export function ThreeWayColorAdjusterExample() {
  const [tones, setTones] = useState(initialTones);

  const updateTone = (index: number, value: PlaneValue) => {
    setTones((current) =>
      current.map((tone, toneIndex) =>
        toneIndex === index ? { ...tone, value } : tone,
      ),
    );
  };

  return (
    <div className="flex min-h-[760px] items-center justify-center px-6 py-10 max-sm:min-h-[640px] max-sm:px-3 max-sm:py-8">
      <section
        aria-label="Color balance control"
        className="flex w-full max-w-[430px] flex-col items-center gap-5 max-sm:max-w-[340px] max-sm:gap-4"
        role="region"
      >
        {tones.map((tone, index) => (
          <ToneWheel
            key={tone.label}
            onChange={(value) => updateTone(index, value)}
            tone={tone}
          />
        ))}

        <output className="sr-only" aria-live="polite">
          {tones
            .map(({ label, value }) => {
              const { magnitude } = toCenteredVector(value);
              return `${label} ${Math.round(magnitude * 100)}`;
            })
            .join(', ')}
        </output>
      </section>
    </div>
  );
}
