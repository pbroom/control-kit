import { ColorArea, ColorPlane, Thumb, useColor } from 'color-kit/react';

export function ColorPlaneInteractionExample() {
  const color = useColor({ defaultColor: 'oklch(0.64 0.24 28)' });

  const thumb = (
    <Thumb
      aria-label="Fine lightness and chroma control"
      className="grid size-8 place-items-center rounded-full border border-white bg-[#171718] text-[10px] font-medium text-white shadow-[0_1px_4px_rgb(0_0_0/0.5)]"
      shiftStepRatio={0.05}
      stepRatio={0.005}
    >
      +
    </Thumb>
  );

  return (
    <div className="flex min-h-[400px] items-center justify-center p-8 max-sm:min-h-[340px] max-sm:p-5">
      <ColorArea
        className="rounded-2xl border border-white/10 bg-[#171718]"
        dragEpsilon={0.001}
        maxUpdateHz={30}
        onChangeRequested={color.setRequested}
        performanceProfile="balanced"
        requested={color.requested}
        showDefaultThumb={false}
        style={{ aspectRatio: 1, width: 'min(280px, 100%)' }}
        thumb={thumb}
      >
        <ColorPlane aria-hidden="true" />
      </ColorArea>
    </div>
  );
}
