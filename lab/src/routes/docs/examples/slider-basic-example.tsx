import { ColorSlider, useColor } from 'color-kit/react';

export function SliderExample() {
  const color = useColor({ defaultColor: 'oklch(0.64 0.24 28)' });

  return (
    <div className="flex min-h-[320px] items-center justify-center p-8">
      <ColorSlider
        channel="l"
        className="h-6 w-full max-w-72 rounded-full border border-white/10 bg-linear-to-r bg-origin-border bg-no-repeat from-black to-white [&_[data-color-slider-thumb]]:size-6 [&_[data-color-slider-thumb]]:rounded-full [&_[data-color-slider-thumb]]:border-2 [&_[data-color-slider-thumb]]:border-white [&_[data-color-slider-thumb]]:bg-transparent [&_[data-color-slider-thumb]]:shadow-[0_1px_4px_rgb(0_0_0/0.5)]"
        onChangeRequested={color.setRequested}
        requested={color.requested}
      />
    </div>
  );
}
