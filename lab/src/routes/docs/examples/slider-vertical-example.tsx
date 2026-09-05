import { ColorSlider, useColor } from 'color-kit/react';

export function SliderVerticalExample() {
  const color = useColor({ defaultColor: 'oklch(0.64 0.24 28)' });

  return (
    <div className="flex min-h-[320px] items-center justify-center p-8">
      <ColorSlider
        channel="c"
        className="h-64 w-6 rounded-full border border-white/10 bg-linear-to-t bg-origin-border bg-no-repeat from-neutral-800 to-rose-500 [&_[data-color-slider-thumb]]:size-6 [&_[data-color-slider-thumb]]:rounded-full [&_[data-color-slider-thumb]]:border-2 [&_[data-color-slider-thumb]]:border-white [&_[data-color-slider-thumb]]:bg-transparent [&_[data-color-slider-thumb]]:shadow-[0_1px_4px_rgb(0_0_0/0.5)]"
        onChangeRequested={color.setRequested}
        orientation="vertical"
        requested={color.requested}
      />
    </div>
  );
}
