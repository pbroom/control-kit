import { ColorArea, ColorPlane, Thumb, useColor } from 'color-kit/react';

export function ColorPlaneAxesExample() {
  const color = useColor({
    defaultColor: 'oklch(0.64 0.24 28)',
    defaultGamut: 'display-p3',
  });

  return (
    <div className="flex min-h-[400px] items-center justify-center p-8 max-sm:min-h-[340px] max-sm:p-5">
      <ColorArea
        axes={{
          x: { channel: 'h', range: [0, 360] },
          y: { channel: 'c', range: [0, 0.4] },
        }}
        className="rounded-2xl border border-white/10 bg-[#171718]"
        onChangeRequested={color.setRequested}
        requested={color.requested}
        style={{ aspectRatio: 1, width: 'min(280px, 100%)' }}
      >
        <ColorPlane aria-hidden="true" />
        <Thumb
          aria-label="Hue and chroma"
          className="size-6 rounded-full border-2 border-white bg-transparent shadow-[0_1px_4px_rgb(0_0_0/0.5)]"
        />
      </ColorArea>
    </div>
  );
}
