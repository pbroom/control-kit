# ColorPlane

A rendered color field for selecting two color channels inside a composable `ColorArea`. `ColorArea` owns interaction and color state while `ColorPlane` supplies the canvas layer.

<!-- demo:basic -->

## Anatomy

Import the parts from Color Kit and compose the render layer and thumb inside the area:

```tsx
import { ColorArea, ColorPlane, Thumb } from 'color-kit/react';

<ColorArea requested={color} onChangeRequested={setColor}>
  <ColorPlane />
  <Thumb aria-label="Lightness and chroma" />
</ColorArea>;
```

`ColorArea` renders a `div`, routes pointer input, and provides the resolved axes to its children. `ColorPlane` renders an absolutely positioned `canvas`. `Thumb` renders the keyboard-focusable marker above the visual layers.

## Usage guidelines

- Keep `ColorPlane` inside `ColorArea`; it reads axes, color state, and quality settings from the area context.
- Use `requested` and `onChangeRequested` together for standalone controlled state, or place the area inside a Color Kit `Color` provider.
- Choose distinct X and Y channels. Use explicit ranges when the editing domain differs from Color Kit's channel defaults.
- Treat the canvas as visual output. The `Thumb` provides the keyboard and accessible value semantics.

## Axes

The default axes are lightness on X and chroma on Y. Pass `axes` to choose another pair or change either channel range.

```tsx
<ColorArea
  axes={{
    x: { channel: 'h', range: [0, 360] },
    y: { channel: 'c', range: [0, 0.4] },
  }}
  requested={color}
  onChangeRequested={setColor}
>
  <ColorPlane />
  <Thumb aria-label="Hue and chroma" />
</ColorArea>
```

## Rendering

`renderer="auto"` selects the supported renderer. `edgeBehavior="clamp"` maps displayed out-of-gamut pixels to the nearest in-gamut edge; `"transparent"` leaves those pixels transparent. `resolutionScale` multiplies the canvas backing-store resolution beyond the device pixel ratio.

## API reference

### ColorArea

Groups the visual layers and owns pointer interaction. `ColorAreaProps` includes native `div` props except `onChange`.

<!-- props:color-area -->

**Data attributes**

| Attribute                  | When present                           |
| -------------------------- | -------------------------------------- |
| `data-color-area`          | Always.                                |
| `data-dragging`            | While pointer interaction is active.   |
| `data-performance-profile` | Always, with the active profile.       |
| `data-quality-level`       | Always, with the current quality tier. |

### ColorPlane

Renders the color field into a canvas using the surrounding `ColorArea` context. `ColorPlaneProps` includes native `canvas` props except `onChange`.

<!-- props:color-plane -->

**Data attributes**

| Attribute               | When present                      |
| ----------------------- | --------------------------------- |
| `data-color-area-plane` | Always.                           |
| `data-source`           | Always, with the rendered source. |
| `data-renderer`         | Always, with the active renderer. |
| `data-edge-behavior`    | Always.                           |

### Thumb

Renders the interactive marker. `ThumbProps` includes native `div` props except `onChange`.

<!-- props:color-area-thumb -->

**Data attributes**

| Attribute               | When present                               |
| ----------------------- | ------------------------------------------ |
| `data-color-area-thumb` | Always.                                    |
| `data-gamut`            | Always, with the active output gamut.      |
| `data-out-of-gamut`     | When the current color is out of gamut.    |
| `data-x` / `data-y`     | Always, with normalized thumb coordinates. |

## Accessibility

`Thumb` has slider semantics, is keyboard focusable, and reports the active axis values through `aria-valuetext`. Arrow keys change the corresponding axis by `stepRatio`; Shift + Arrow uses `shiftStepRatio`. Provide an `aria-label` that names the color dimensions when the surrounding context does not already do so.

The canvas is noninteractive and should not replace the thumb's semantic value. Additional decorative layers should remain hidden from assistive technology unless they communicate information not represented by the control.

## Types

| Type                          | Contract                                                  |
| ----------------------------- | --------------------------------------------------------- |
| `ColorAreaAxes`               | X and Y channel descriptors with optional numeric ranges. |
| `ColorAreaPerformanceProfile` | `'auto'`, `'quality'`, `'balanced'`, or `'performance'`.  |
| `ColorPlaneRenderer`          | `'auto'`, `'gpu'`, `'cpu'`, `'webgl'`, or `'canvas2d'`.   |
| `ColorPlaneEdgeBehavior`      | `'transparent'` or `'clamp'`.                             |
| `ColorPlaneSource`            | `'requested'` or `'displayed'`.                           |

## Source

[ColorArea implementation](https://github.com/pbroom/color-kit/blob/main/packages/react/src/color-area.tsx) · [ColorPlane implementation](https://github.com/pbroom/color-kit/blob/main/packages/react/src/color-plane.tsx) · [Issues](https://github.com/pbroom/color-kit/issues)
