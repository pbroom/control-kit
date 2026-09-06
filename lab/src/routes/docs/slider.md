# Slider

A composed one-dimensional color-channel control. Control Kit supplies the shared Base UI slider foundation; the Color Kit adapter supplies color-channel state and markers.

<!-- demo:basic -->

## Installation

### Manual

`ColorSlider` is owned by Color Kit and is not exported from `control-kit`. The Lab uses a local Color Kit adapter composed over `ColorValueSlider` from `control-kit`.

1. Install `control-kit` and its `@base-ui/react` peer, then copy the Lab [`ColorSlider` adapter](https://github.com/pbroom/control-kit/blob/main/lab/src/vendor/color-kit/react/color-slider.tsx) and its shared Color Kit dependencies into your project.
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

The root contains a Base UI control and thumb. Base UI supplies the hidden range input used for keyboard and assistive-technology access. Rails, gradients, markers, and thumb styling remain consumer-owned.

## Shared numeric sliders

Use `Slider` from `control-kit` for a numeric value. Use `ColorValueSlider` for a numeric color control with a gradient supplied by the application. Both use the same Base UI interaction and accessible input; the color adapter omits the filled indicator.

```tsx
import { ColorValueSlider, Slider } from 'control-kit';

<Slider aria-label="Flow" defaultValue={50} min={0} max={100} />;
<ColorValueSlider
  aria-label="Saturation"
  defaultValue={50}
  min={0}
  max={100}
  trackProps={{ style: { background: 'linear-gradient(to right, gray, red)' } }}
/>;
```

Both components accept a single numeric `value` or `defaultValue`, `onValueChange`, `onValueCommitted`, `min`, `max`, `step`, `largeStep`, `disabled`, and `orientation`. Style parts with `controlProps`, `trackProps`, and `thumbProps`. Set `unstyled` to retain interaction and positioning while supplying all rail and thumb visuals. Accessible label and value-text props on the root are forwarded to the thumb input.

## Examples

### Orientation

The default orientation is horizontal. Set `orientation="vertical"` and give the root an explicit height for a vertical control.

<!-- demo:vertical -->

### Channels

Use `channel` to bind the slider to lightness, chroma, hue, or alpha. Each channel receives its own default range.

<!-- demo:channels -->

### Range

Channel defaults are lightness `[0, 1]`, chroma `[0, 0.4]`, hue `[0, 360]`, and alpha `[0, 1]`. A custom range changes pointer mapping, keyboard movement, and accessible bounds together.

<!-- demo:range -->

### Styling

Style the root directly and target the generated thumb with `data-color-slider-thumb`.

<!-- demo:styling -->

## API reference

### ColorSlider

Controls one color channel through the shared Base UI slider foundation.

<!-- props:color-slider -->

`ColorSlider` accepts native `div` styling and semantic props except `onChange` and `defaultValue`. Base UI owns pointer capture and positioning; the color adapter supplies channel keyboard steps.

## Accessibility

The thumb input has slider semantics, reports the active channel range and value, and exposes the matching `aria-orientation`. Arrow keys move one percent of the range; Shift + Arrow moves ten percent. Home and End select the range endpoints. Values clamp to the active range.

## Source

[Implementation](https://github.com/pbroom/control-kit/blob/main/lab/src/vendor/color-kit/react/color-slider.tsx) · [Color API](https://github.com/pbroom/color-kit/blob/main/packages/driver/src/color-slider.ts) · [Color Kit issues](https://github.com/pbroom/color-kit/issues)
