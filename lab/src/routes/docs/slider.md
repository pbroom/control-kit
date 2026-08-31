# Slider

A composed one-dimensional color-channel control. Color Kit owns its interaction and color state; Control Kit uses the component in its Lab and documentation.

<!-- demo:basic -->

## Installation

### Manual

`ColorSlider` is owned by Color Kit and is not exported from `@color-kit/control-kit`. The Lab runs the Color Kit source directly.

1. Copy the Color Kit [`ColorSlider` source](https://github.com/pbroom/color-kit/blob/main/packages/react/src/color-slider.tsx) and its shared dependencies into your project.
2. Update the `color-kit/react` import path to match your project setup.
3. Import `ColorSlider` as shown below.

## Usage

Import `ColorSlider`, connect requested color state, and style the root and thumb for the application:

```tsx
import { ColorSlider, useColor } from 'color-kit/react';

function LightnessSlider() {
  const color = useColor({ defaultColor: 'oklch(0.64 0.24 28)' });

  return (
    <ColorSlider
      channel="l"
      requested={color.requested}
      onChangeRequested={color.setRequested}
    />
  );
}
```

The root renders a focusable `div` with slider semantics. Its first child is the positioned thumb. Rails, gradients, markers, and thumb styling remain consumer-owned.

## Examples

### Orientation

The default orientation is horizontal. Set `orientation="vertical"` and give the root an explicit height for a vertical control.

<!-- demo:vertical -->

### Range

Channel defaults are lightness `[0, 1]`, chroma `[0, 0.4]`, hue `[0, 360]`, and alpha `[0, 1]`. A custom range changes pointer mapping, keyboard movement, and accessible bounds together.

```tsx
<ColorSlider
  channel="h"
  range={[120, 240]}
  requested={color.requested}
  onChangeRequested={color.setRequested}
/>
```

### Styling

Style the root directly and target the generated thumb with `data-color-slider-thumb`.

```tsx
<ColorSlider
  channel="l"
  className="h-6 rounded-full bg-linear-to-r from-black to-white [&_[data-color-slider-thumb]]:size-6 [&_[data-color-slider-thumb]]:rounded-full [&_[data-color-slider-thumb]]:border-2 [&_[data-color-slider-thumb]]:border-white"
  requested={color.requested}
  onChangeRequested={color.setRequested}
/>
```

## API

### Important props

| Prop                              | Purpose                                                  |
| --------------------------------- | -------------------------------------------------------- |
| `channel`                         | Selects lightness, chroma, hue, or alpha.                |
| `requested` / `onChangeRequested` | Controls standalone requested color state.               |
| `range`                           | Overrides the channel's numeric domain.                  |
| `orientation`                     | Sets horizontal or vertical interaction and semantics.   |
| `aria-label` / `aria-valuetext`   | Overrides the generated channel name or announced value. |
| `dragEpsilon` / `maxPointerRate`  | Tunes minimum pointer movement and update frequency.     |

`ColorSlider` accepts native `div` styling and semantic props except `onChange`. Its pointer and keyboard handlers remain component-owned.

## Accessibility

The root has slider semantics, reports the active channel range and value, and exposes the matching `aria-orientation`. Arrow keys move one percent of the range; Shift + Arrow moves ten percent. Values clamp to the active range.

## Source

[Implementation](https://github.com/pbroom/color-kit/blob/main/packages/react/src/color-slider.tsx) · [Color API](https://github.com/pbroom/color-kit/blob/main/packages/driver/src/color-slider.ts) · [Color Kit issues](https://github.com/pbroom/color-kit/issues)
