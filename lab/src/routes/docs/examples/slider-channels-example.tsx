import { ColorSlider, useColor } from 'color-kit/react';

const CHANNELS = [
  { channel: 'l', label: 'Lightness', gradient: 'from-black to-white' },
  { channel: 'c', label: 'Chroma', gradient: 'from-neutral-800 to-rose-500' },
  {
    channel: 'h',
    label: 'Hue',
    gradient: 'from-red-500 via-emerald-500 to-blue-500',
  },
  {
    channel: 'alpha',
    label: 'Alpha',
    gradient: 'from-transparent to-white',
  },
] as const;

export function SliderChannelsExample() {
  const color = useColor({ defaultColor: 'oklch(0.64 0.24 28)' });

  return (
    <div className="grid min-h-[360px] content-center gap-5 p-8">
      {CHANNELS.map(({ channel, gradient, label }) => (
        <label className="grid gap-2 text-sm text-white/60" key={channel}>
          {label}
          <ColorSlider
            aria-label={label}
            channel={channel}
            className={`h-6 w-full rounded-full border border-white/10 bg-linear-to-r bg-origin-border bg-no-repeat ${gradient} [&_[data-color-slider-thumb]]:size-6 [&_[data-color-slider-thumb]]:rounded-full [&_[data-color-slider-thumb]]:border-2 [&_[data-color-slider-thumb]]:border-white [&_[data-color-slider-thumb]]:bg-transparent [&_[data-color-slider-thumb]]:shadow-[0_1px_4px_rgb(0_0_0/0.5)]`}
            onChangeRequested={color.setRequested}
            requested={color.requested}
          />
        </label>
      ))}
    </div>
  );
}
