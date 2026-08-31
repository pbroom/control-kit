# ColorPlane

A composed color-field control for editing two color channels. Color Kit owns the color state, interaction, and rendering; Control Kit uses the component in its Lab and documentation.

<!-- demo:basic -->

## Installation

### Manual

`ColorPlane` is owned by Color Kit and is not exported from `@color-kit/control-kit`. The Lab runs the Color Kit source directly.

1. Copy the Color Kit [`ColorArea` source](https://github.com/pbroom/color-kit/blob/main/packages/react/src/color-area.tsx), [`ColorPlane` source](https://github.com/pbroom/color-kit/blob/main/packages/react/src/color-plane.tsx), and [`Thumb` source](https://github.com/pbroom/color-kit/blob/main/packages/react/src/thumb.tsx) files with their shared dependencies into your project.
2. Update the `color-kit/react` import path to match your project setup.
3. Import the parts as shown below.

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

<!-- demo:rendering -->

`edgeBehavior="clamp"` maps displayed out-of-gamut pixels to the nearest in-gamut edge. `edgeBehavior="transparent"` leaves those pixels transparent.

### Interaction tuning

Use the explicit `thumb` slot when the marker is wrapped or supplied across a module boundary. Performance and pointer-update props can be tuned together for a particular surface.

<!-- demo:interaction -->

## API reference

### ColorArea

Owns requested color state, axis mapping, pointer interaction, and runtime quality policy.

<!-- props:color-area -->

### ColorPlane

Renders the color field into a canvas using the surrounding `ColorArea` state.

<!-- props:color-plane -->

### Thumb

Provides the focusable marker and keyboard interaction above the visual layers.

<!-- props:thumb -->

Each part also accepts the native props for its rendered element: `ColorArea` and `Thumb` render `div` elements, while `ColorPlane` renders a `canvas`.

## Accessibility

The canvas is visual output. `Thumb` supplies slider semantics, focus, keyboard interaction, and the announced value. Arrow keys move the corresponding axis; Shift + Arrow uses `shiftStepRatio`.

## Source

[ColorArea implementation](https://github.com/pbroom/color-kit/blob/main/packages/react/src/color-area.tsx) · [ColorPlane implementation](https://github.com/pbroom/color-kit/blob/main/packages/react/src/color-plane.tsx) · [Color Kit issues](https://github.com/pbroom/color-kit/issues)
