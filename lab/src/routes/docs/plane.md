# Plane

A composable two-dimensional input for selecting normalized X and Y values. `Plane` owns geometry and pointer routing while its children own their positions and visual layers.

<!-- demo:basic -->

## Anatomy

Import the parts and compose them together:

```tsx
import { Plane, PlaneThumb } from 'control-kit';

<Plane aria-label="Position">
  <PlaneThumb defaultValue={{ x: 0.5, y: 0.5 }} />
</Plane>;
```

`Plane` renders a `div` and routes pointer interaction to its thumbs. `PlaneThumb` owns a normalized position and renders a positioned `div` containing two visually hidden range inputs, one for each axis. Both parts forward their refs to their rendered `div`.

Coordinates are clamped from `0` to `1`. X increases from left to right. Y follows Cartesian direction and increases from bottom to top.

## Usage guidelines

- Use a thumb's `onValueChange` for immediate visual feedback. Use `onValueCommit` for persistence or expensive downstream work.
- In controlled mode, update the thumb's `value` from `onValueChange`. The rendered thumb only moves when the controlled value changes.
- Use `getAriaValueText` to express domain values instead of normalized percentages—for example, “50% saturation, 75% lightness” for a color plane.
- Hide decorative guides, canvas layers, and SVG content from assistive technology when they do not add information beyond the two axis controls.

## Controlled state

Use `value` and `onValueChange` when another part of your application owns the position.

```tsx
const [value, setValue] = React.useState({ x: 0.5, y: 0.5 });

<Plane>
  <PlaneThumb
    value={value}
    onValueChange={setValue}
    onValueCommit={(nextValue, details) => {
      savePosition(nextValue, details.interaction);
    }}
    xAriaLabel="Saturation"
    yAriaLabel="Lightness"
    getAriaValueText={({ x, y }) =>
      `${Math.round(x * 100)}% saturation, ${Math.round(y * 100)}% lightness`
    }
  />
</Plane>;
```

## Multiple thumbs

Render a `PlaneThumb` for each independently controlled position. Direct presses always move the pressed thumb. With multiple thumbs, pressing empty plane space does nothing by default.

Set `pressBehavior="nearest"` to move the visually nearest interactive thumb to an empty-space press. Distance is measured in rendered pixels. Disabled and read-only thumbs are excluded.

<!-- demo:multiple -->

## Form

Set `xName` and `yName` to include both coordinates in form data. Use `form` to associate the thumb with a form outside its DOM ancestry. Resetting the form restores an uncontrolled thumb to its `defaultValue`; controlled state remains owned by the application.

```tsx
<form id="position-form">
  <Plane>
    <PlaneThumb
      defaultValue={{ x: 0.5, y: 0.5 }}
      xName="position.x"
      yName="position.y"
    />
  </Plane>
  <button type="reset">Reset</button>
</form>
```

## API reference

### Plane

Groups the visual layers and routes pointer interaction. `PlaneProps` includes native `div` props except `defaultValue` and `onChange`.

<!-- props:plane -->

`pressBehavior="auto"` moves the only thumb when empty plane space is pressed. It does nothing when multiple thumbs are present. `pressBehavior="none"` disables empty-space movement, and `pressBehavior="nearest"` moves the visually nearest interactive thumb.

The root captures the primary pointer for a drag and measures its bounds once at the start. Changing the root to `disabled` or `readOnly` during a drag ends the interaction without committing. Native pointer handlers run before Plane's internal handling, so calling `preventDefault()` cancels the corresponding internal step.

`onHoverValueChange` reports normalized mouse and hovering-pen coordinates without moving a thumb. It receives `null` when the pointer leaves. `details.pointerType` identifies the pointer, and `details.originalEvent` exposes the native pointer event. Touch input does not report hover values.

**Data attributes**

| Attribute           | When present                           |
| ------------------- | -------------------------------------- |
| `data-slot="plane"` | Always.                                |
| `data-dragging`     | While a pointer interaction is active. |
| `data-disabled`     | When `disabled` is `true`.             |
| `data-readonly`     | When `readOnly` is `true`.             |

### PlaneThumb

Owns a normalized position, renders its visible marker, and supplies two accessible slider axes. `PlaneThumbProps` includes native `div` props except `defaultValue` and `onChange`.

<!-- props:plane-thumb -->

`onValueChange` and `onValueCommit` receive `details.interaction`, which groups changes as `'pointer'` or `'keyboard'`. `details.reason` identifies `'thumb-drag'`, `'plane-press'`, `'keyboard'`, or `'input-change'`, and `details.originalEvent` exposes the native event when available. When `thumbId` is set, callbacks also receive it as `details.thumbId`.

A pointer interaction commits on release, cancellation, or lost capture. Changing a thumb to `disabled` or `readOnly` during a drag ends the interaction without committing. Non-positive and non-finite step values fall back to their defaults.

**Data attributes**

| Attribute                 | When present                                     |
| ------------------------- | ------------------------------------------------ |
| `data-slot="plane-thumb"` | Always.                                          |
| `data-thumb-id`           | When `thumbId` is set.                           |
| `data-hovered`            | While a mouse or hovering pen is over the thumb. |
| `data-dragging`           | While this thumb is being dragged.               |
| `data-disabled`           | When `disabled` is `true`.                       |
| `data-readonly`           | When `readOnly` is `true`.                       |
| `data-focused`            | While either axis input contains focus.          |
| `data-focus-visible`      | While keyboard focus is visible.                 |

## Accessibility

Each `PlaneThumb` renders two visually hidden `input[type="range"]` elements ranging from `0` to `1`. Each axis has its own accessible label and orientation. Both share the value text returned by `getAriaValueText`.

When a pointer interaction ends, keyboard focus returns to the manipulated thumb without showing its focus ring. Press Tab once to reveal keyboard focus without leaving the thumb. Once focus is visible, Tab and Shift + Tab move to the next or previous focusable element. Arrow keys can continue from the pointer position immediately and switch the active axis internally.

Plane repeats movement while any arrow key remains held. Holding horizontal and vertical arrows moves diagonally; releasing either one continues movement in the remaining direction. Opposing directions cancel movement on their shared axis.

For multiple thumbs, use `aria-label` on each thumb to prefix its default axis labels. For example, `aria-label="Outgoing handle"` produces “Outgoing handle, horizontal position” and “Outgoing handle, vertical position”. `xAriaLabel` and `yAriaLabel` replace those defaults.

| Key                      | Action                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------- |
| Left Arrow / Right Arrow | Decreases or increases X by `step`.                                                    |
| Down Arrow / Up Arrow    | Decreases or increases Y by `step`.                                                    |
| Two held arrow keys      | Moves both axes when a horizontal and vertical direction are held together.            |
| Alt/Option + Arrow       | Changes the corresponding axis by `smallStep`. Alt/Option takes precedence over Shift. |
| Shift + Arrow            | Changes the corresponding axis by `largeStep`.                                         |
| Page Down / Page Up      | Changes the focused axis by `largeStep`.                                               |
| Home / End               | Sets the focused axis to `0` or `1`.                                                   |
| Tab / Shift + Tab        | Reveals focus after pointer use, then moves to the next or previous focusable element. |

Held-arrow changes commit when the final arrow is released. Other keyboard changes commit on keyup. Changes from the native range inputs commit immediately. Values clamp at every edge.

## Utilities

### usePlaneContext

Returns `{ disabled, readOnly, dragging }` for a descendant visual layer. It throws when called outside `Plane`.

### usePlaneThumbContext

Returns `{ value, hovered, dragging, focused, focusVisible, disabled, readOnly }` for a descendant of `PlaneThumb`. It throws when called outside `PlaneThumb`.

### clampPlaneValue

Clamps both coordinates to the `0` to `1` range. Non-finite coordinates become `0`.

### getPlaneValueFromPoint

Converts viewport coordinates and element bounds to a clamped Cartesian `PlaneValue`. A zero-sized axis resolves to `0`.

## Types

| Type                           | Contract                                                                                |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| `PlaneValue`                   | `{ x: number; y: number }` normalized from `0` to `1`.                                  |
| `PlaneInteraction`             | `'pointer' \| 'keyboard'`.                                                              |
| `PlaneHoverValueChangeDetails` | The pointer type and native pointer event for a hover-position change.                  |
| `PlaneValueChangeReason`       | `'thumb-drag' \| 'plane-press' \| 'keyboard' \| 'input-change'`.                        |
| `PlaneValueChangeDetails`      | Interaction, reason, optional thumb ID, and optional original event for a value change. |
| `PlanePoint`                   | `{ clientX: number; clientY: number }`.                                                 |
| `PlaneBounds`                  | `{ left: number; top: number; width: number; height: number }`.                         |
| `PlanePressBehavior`           | `'auto' \| 'none' \| 'nearest'`.                                                        |
| `PlaneContextValue`            | The root `disabled`, `readOnly`, and `dragging` state.                                  |
| `PlaneThumbContextValue`       | The thumb's value, interaction, hover, focus, `disabled`, and `readOnly` states.        |
| `PlaneProps`                   | Native `div` props plus root interaction options.                                       |
| `PlaneThumbProps`              | Native `div` props plus value, interaction, form, and axis options.                     |

## Source

[Implementation](https://github.com/pbroom/control-kit/blob/main/src/plane.tsx) · [Tests](https://github.com/pbroom/control-kit/blob/main/__tests__/plane.test.tsx) · [Issues](https://github.com/pbroom/control-kit/issues)
