# ColorPlane

A composed color-field control for editing two color channels. Color Kit owns the color state, interaction, and rendering; Control Kit uses the component in its Lab and documentation.

<!-- demo:basic -->

## Usage

Import the parts from Color Kit, connect requested color state, and compose the canvas and thumb inside `ColorArea`:

```tsx
import { ColorArea, ColorPlane, Thumb, useColor } from 'color-kit/react';

function ColorField() {
  const color = useColor({ defaultColor: 'oklch(0.64 0.24 28)' });

  return (
    <ColorArea
      requested={color.requested}
      onChangeRequested={color.setRequested}
    >
      <ColorPlane aria-hidden="true" />
      <Thumb aria-label="Lightness and chroma" />
    </ColorArea>
  );
}
```

## Composition

- `ColorArea` owns the requested color, channel axes, and pointer interaction.
- `ColorPlane` renders the color field into a canvas using the surrounding area state.
- `Thumb` provides the focusable marker and keyboard interaction above the visual layers.

Add guides, gamut boundaries, backgrounds, or other visual layers as children of `ColorArea`. Keep `ColorPlane` inside the area because it reads its color, axis, and quality settings from context.

## Examples

### Axes

The default axes are lightness on X and chroma on Y. Pass `axes` to choose another channel pair or to narrow either range.

<!-- demo:axes -->

### Rendering

`renderer="auto"` selects a supported backend. Edge behavior and resolution can be adjusted independently.

```tsx
<ColorPlane edgeBehavior="transparent" renderer="auto" resolutionScale={1} />
```

`edgeBehavior="clamp"` maps displayed out-of-gamut pixels to the nearest in-gamut edge. `edgeBehavior="transparent"` leaves those pixels transparent.

## API

### Important `ColorArea` props

| Prop                              | Purpose                                                |
| --------------------------------- | ------------------------------------------------------ |
| `requested` / `onChangeRequested` | Controls standalone requested color state.             |
| `axes`                            | Selects the X and Y channels and their numeric ranges. |
| `performanceProfile`              | Chooses the runtime quality and responsiveness policy. |
| `thumb` / `showDefaultThumb`      | Replaces or suppresses the default top-most thumb.     |
| `maxUpdateHz` / `dragEpsilon`     | Tunes pointer-update frequency and minimum movement.   |

### Important `ColorPlane` props

| Prop              | Purpose                                                    |
| ----------------- | ---------------------------------------------------------- |
| `source`          | Renders the requested or gamut-mapped displayed color.     |
| `displayGamut`    | Selects the output gamut for displayed-source pixels.      |
| `renderer`        | Selects automatic, GPU, or CPU rendering.                  |
| `edgeBehavior`    | Clamps or makes displayed out-of-gamut pixels transparent. |
| `resolutionScale` | Multiplies the canvas backing-store resolution.            |

### Important `Thumb` props

| Prop                            | Purpose                                     |
| ------------------------------- | ------------------------------------------- |
| `aria-label` / `aria-valuetext` | Names and describes the two-axis value.     |
| `stepRatio` / `shiftStepRatio`  | Sets the standard and large keyboard steps. |

Each part also accepts the native props for its rendered element: `ColorArea` and `Thumb` render `div` elements, while `ColorPlane` renders a `canvas`.

## Accessibility

The canvas is visual output. `Thumb` supplies slider semantics, focus, keyboard interaction, and the announced value. Arrow keys move the corresponding axis; Shift + Arrow uses `shiftStepRatio`.

## Source

[ColorArea implementation](https://github.com/pbroom/color-kit/blob/main/packages/react/src/color-area.tsx) · [ColorPlane implementation](https://github.com/pbroom/color-kit/blob/main/packages/react/src/color-plane.tsx) · [Color Kit issues](https://github.com/pbroom/color-kit/issues)
