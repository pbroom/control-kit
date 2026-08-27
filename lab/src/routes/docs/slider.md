# Slider

A one-dimensional color-channel input. `ColorSlider` maps pointer and keyboard interaction to a requested Color Kit color.

<!-- demo:basic -->

## Anatomy

Import `ColorSlider` from Color Kit and connect requested color state:

```tsx
import { ColorSlider } from 'color-kit/react';

<ColorSlider channel="l" requested={color} onChangeRequested={setColor} />;
```

The root renders a focusable `div` with slider semantics. Its first child is the positioned thumb. Visual rails, gradients, markers, and thumb styling remain consumer-owned.

## Usage guidelines

- Use one slider per color channel and label it when the surrounding UI does not already identify the channel.
- Pass `requested` and `onChangeRequested` together for standalone state, or render inside a Color Kit `Color` provider.
- Use the default channel ranges unless the editing workflow intentionally narrows the available domain.
- Keep the rendered gradient consistent with `channel`, `range`, and the requested color used by the interaction model.

## Orientation and range

The default orientation is horizontal. Channel defaults are lightness `[0, 1]`, chroma `[0, 0.4]`, hue `[0, 360]`, and alpha `[0, 1]`. A custom `range` changes both pointer mapping and accessible bounds.

## API reference

### ColorSlider

`ColorSliderProps` accepts native `div` styling and semantic props except `onChange`. The component owns its pointer and keyboard handlers.

<!-- props:slider -->

**Data attributes**

| Attribute                 | When present                               |
| ------------------------- | ------------------------------------------ |
| `data-color-slider`       | Always.                                    |
| `data-channel`            | Always, with the controlled channel.       |
| `data-orientation`        | Always.                                    |
| `data-dragging`           | While pointer interaction is active.       |
| `data-color-slider-thumb` | Always on the positioned thumb.            |
| `data-value`              | Always on the thumb as a normalized value. |

## Accessibility

The root has slider semantics, reports its channel range and current channel value, and is keyboard focusable. Horizontal and vertical sliders expose the matching `aria-orientation`.

Arrow Right and Arrow Up increase the channel by one percent of the active range; Arrow Left and Arrow Down decrease it. Shift + Arrow moves by ten percent. Values clamp to the active range.

## Types

| Type                     | Contract                                            |
| ------------------------ | --------------------------------------------------- |
| `ColorSliderChannel`     | `'l'`, `'c'`, `'h'`, or `'alpha'`.                  |
| `ColorSliderOrientation` | `'horizontal'` or `'vertical'`.                     |
| `ColorSliderProps`       | Channel state, range, orientation, and drag tuning. |

## Source

[Implementation](https://github.com/pbroom/color-kit/blob/main/packages/react/src/color-slider.tsx) · [Color API](https://github.com/pbroom/color-kit/blob/main/packages/driver/src/color-slider.ts) · [Issues](https://github.com/pbroom/color-kit/issues)
