import { ColorSlider, useColor } from 'color-kit/react';

export function SliderRangeExample() {
  const color = useColor({ defaultColor: 'oklch(0.64 0.24 180)' });

  return (
    <div className="grid min-h-[320px] content-center gap-3 p-8">
      <span className="text-sm text-white/60">Hue · 120° to 240°</span>
      <ColorSlider
        aria-label="Limited hue"
        aria-valuetext={`${Math.round(color.requested.h)} degrees`}
        channel="h"
        className="h-6 w-full rounded-full border border-white/10 bg-linear-to-r bg-origin-border bg-no-repeat from-emerald-500 via-cyan-500 to-blue-500 [&_[data-color-slider-thumb]]:size-6 [&_[data-color-slider-thumb]]:rounded-full [&_[data-color-slider-thumb]]:border-2 [&_[data-color-slider-thumb]]:border-white [&_[data-color-slider-thumb]]:bg-transparent [&_[data-color-slider-thumb]]:shadow-[0_1px_4px_rgb(0_0_0/0.5)]"
        onChangeRequested={color.setRequested}
        range={[120, 240]}
        requested={color.requested}
      />
    </div>
  );
}
