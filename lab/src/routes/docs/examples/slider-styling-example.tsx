import { ColorSlider, useColor } from 'color-kit/react';

export function SliderStylingExample() {
  const color = useColor({ defaultColor: 'oklch(0.64 0.24 28)' });

  return (
    <div className="flex min-h-[320px] items-center justify-center p-8">
      <ColorSlider
        aria-label="Styled lightness"
        channel="l"
        className="h-3 w-full max-w-72 rounded-full bg-linear-to-r bg-origin-border bg-no-repeat from-black to-white [&_[data-color-slider-thumb]]:size-7 [&_[data-color-slider-thumb]]:rounded-md [&_[data-color-slider-thumb]]:border-2 [&_[data-color-slider-thumb]]:border-white [&_[data-color-slider-thumb]]:bg-[#171718]"
        onChangeRequested={color.setRequested}
        requested={color.requested}
      />
    </div>
  );
}
