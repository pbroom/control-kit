import { ColorArea, ColorPlane, Thumb, useColor } from 'color-kit/react';

const RENDERERS = [
  { edgeBehavior: 'clamp', label: 'Clamped' },
  { edgeBehavior: 'transparent', label: 'Transparent' },
] as const;

export function ColorPlaneRenderingExample() {
  const color = useColor({
    defaultColor: 'oklch(0.64 0.24 28)',
    defaultGamut: 'display-p3',
  });

  return (
    <div className="grid min-h-[400px] grid-cols-2 items-center gap-6 p-8 max-sm:grid-cols-1 max-sm:p-5">
      {RENDERERS.map(({ edgeBehavior, label }) => (
        <figure className="grid justify-items-center gap-3" key={edgeBehavior}>
          <ColorArea
            className="rounded-2xl border border-white/10 bg-[#222224]"
            onChangeRequested={color.setRequested}
            requested={color.requested}
            style={{ aspectRatio: 1, width: 'min(220px, 100%)' }}
          >
            <ColorPlane
              aria-hidden="true"
              displayGamut="srgb"
              edgeBehavior={edgeBehavior}
              renderer="auto"
              resolutionScale={1}
              source="displayed"
            />
            <Thumb
              aria-label={`${label} lightness and chroma`}
              className="size-6 rounded-full border-2 border-white bg-transparent shadow-[0_1px_4px_rgb(0_0_0/0.5)]"
            />
          </ColorArea>
          <figcaption className="text-sm text-white/60">{label}</figcaption>
        </figure>
      ))}
    </div>
  );
}
