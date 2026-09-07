# Plane

A composable two-dimensional input for selecting normalized X and Y values. `Plane` owns geometry and pointer routing while its children own their positions and visual layers.

<!-- demo:basic -->

## Anatomy

Import the parts and compose them together:

```tsx
import { Plane, PlaneThumb, PlaneAttachment } from 'control-kit';

<Plane aria-label="Position">
  <PlaneThumb defaultValue={{ x: 0.5, y: 0.5 }} />
</Plane>;
```

`Plane` renders a `div` and routes pointer interaction to its thumbs. `PlaneThumb` owns a normalized position and renders a positioned `div` containing two visually hidden range inputs, one for each axis. Both parts forward their refs to their rendered `div`.

Top-level thumb coordinates are clamped from `0` to `1`. X increases from left to right. Y follows Cartesian direction and increases from bottom to top. Nested thumbs use signed offsets from their parent, measured in the same plane units.

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

Render a `PlaneThumb` for each independently controlled position. Direct presses always select the pressed thumb. With multiple thumbs, pressing empty plane space does nothing by default.

Set `pressBehavior="nearest"` to select the visually nearest eligible thumb on an empty-space press. Distance is measured in rendered pixels. Disabled and read-only thumbs, and thumbs with `pressBehavior="none"`, are excluded. A direct press still selects an enabled thumb with `pressBehavior="none"`.

<!-- demo:multiple -->

## Nested thumbs

Place a `PlaneThumb` inside another thumb to give it a position relative to that parent. One X unit is the full plane width; one Y unit is the full plane height, regardless of the parent marker's size. Nested offsets range from `-1` to `1` on each axis and default to `{ x: 0, y: 0 }`.

```tsx
const [center, setCenter] = React.useState({ x: 0.4, y: 0.6 });
const [radius, setRadius] = React.useState({ x: 0.3, y: 0 });

<Plane>
  <PlaneThumb
    aria-label="Gradient center"
    value={center}
    onValueChange={setCenter}
  >
    <PlaneThumb
      aria-label="Gradient radius"
      value={radius}
      onValueChange={setRadius}
    />
  </PlaneThumb>
</Plane>;
```

Moving a parent carries its descendants without changing their offsets or firing their value callbacks. Moving a child changes only that child's offset. Each child retains its own keyboard axes, controlled state, and form fields. Descendants can extend beyond the plane when their parent moves; their offsets are not shortened to keep the group inside the plane. Keep overflowing thumbs visible by clipping decorative content separately from the handles. Nested thumbs render into the plane root so their positioning is independent of their parent marker’s size; style each thumb directly rather than relying on DOM descendant selectors.

[Try gradient origin and radius](/docs/plane-examples#plane-examples-position-and-alignment).

## Controls inside a thumb

A thumb can contain ordinary elements directly. Buttons, text fields, links, and other interactive descendants handle their own input without starting a thumb drag. Non-interactive decoration remains part of the thumb's drag target.

```tsx
<PlaneThumb aria-label="Named point">
  <div className="absolute left-full top-0 ml-3">
    <input aria-label="Point name" defaultValue="Highlight" />
  </div>
</PlaneThumb>
```

Use the optional `PlaneAttachment` when you want placement and collision handling instead of positioning that content yourself. It follows the thumb, can flip or shift at a boundary, and portals by default. It does not own a plane value or add dialog semantics.

```tsx
<PlaneThumb aria-label="Named point">
  <PlaneAttachment side="right" visibility="focus-within">
    <input aria-label="Point name" defaultValue="Highlight" />
  </PlaneAttachment>
</PlaneThumb>
```

## Drag without jumping

Set `dragBehavior="relative"` on `Plane` to preserve the selected thumb's offset from the pointer. Pressing does not change its value; dragging moves it by the pointer's distance, normalized to the plane bounds. The selected thumb stays locked for the gesture, and its resulting coordinates remain within the selected thumb's range. The default, `dragBehavior="absolute"`, places the selected thumb at the pointer on press and during dragging.

Set `dragSensitivity` to scale relative pointer movement. The default `1` follows the pointer at full speed; `0.25` moves the thumb one quarter of the pointer's drag distance for finer control. The scale is fixed when each gesture begins, so controlled updates do not accumulate rounding drift. Non-finite and negative values fall back to `1`.

Selection and movement are independent. For image panning with a directly draggable focal point, make the focal point opt out of empty-space selection:

```tsx
<Plane pressBehavior="nearest" dragBehavior="relative">
  <PlaneThumb aria-label="Image pan" defaultValue={{ x: 0.5, y: 0.5 }} />
  <PlaneThumb
    aria-label="Focal point"
    pressBehavior="none"
    defaultValue={{ x: 0.7, y: 0.65 }}
  />
</Plane>
```

Pressing anywhere except the focal point selects the image-pan thumb, the only eligible nearest candidate. Pressing the focal point selects it directly. Neither thumb jumps on press, and both retain their keyboard controls. Thumb dimensions continue to describe the visible hit area; no oversized background thumb is needed.

[Try image panning and focal-point dragging](/docs/plane-examples#image-pan-and-focal-point).

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

`pressBehavior="auto"` selects the only thumb when empty plane space is pressed, provided it is interactive and has not opted out. It does nothing when multiple thumbs are present, even if only one is eligible. `pressBehavior="none"` disables empty-space selection, and `pressBehavior="nearest"` selects the visually nearest eligible thumb.

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

Owns a position, renders its visible marker, and supplies two accessible slider axes. A top-level thumb owns a normalized plane position; a nested thumb owns a signed parent-relative offset. `PlaneThumbProps` includes native `div` props except `defaultValue` and `onChange`.

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

### PlaneAttachment

Positions ordinary UI relative to its nearest parent thumb. `PlaneAttachmentProps` includes native `div` props and Base UI positioning options. It requires a `PlaneThumb` ancestor.

<!-- props:plane-attachment -->

`visibility="hover"` keeps the attachment visible while the thumb or attachment is hovered or contains focus, with a short leave delay to cross the gap. `visibility="focus-within"` keeps it visible while focus is in the thumb or attached controls, including portaled content. Neither mode moves focus automatically.

Set `portal={false}` to render in place. Portaled form controls need their own `form` attribute to associate with a form outside the portal. For custom boundaries, pass `collisionBoundary` and `collisionPadding`; `collisionAvoidance` controls flipping and shifting. Style the wrapper using `className`, `style`, or `data-slot="plane-attachment"`.

## Accessibility

Each `PlaneThumb` renders two visually hidden `input[type="range"]` elements. Top-level axes range from `0` to `1`; nested axes range from `-1` to `1`. Each axis has its own accessible label and orientation. Both share the value text returned by `getAriaValueText`.

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
| Home / End               | Sets the focused axis to its minimum or maximum.                                       |
| Tab / Shift + Tab        | Reveals focus after pointer use, then moves to the next or previous focusable element. |

Held-arrow changes commit when the final arrow is released. Other keyboard changes commit on keyup. Changes from the native range inputs commit immediately. Values clamp at every edge.

## Utilities

### usePlaneContext

Returns `{ disabled, readOnly, dragging }` for a descendant visual layer. It throws when called outside `Plane`.

### usePlaneThumbContext

Returns `{ value, worldValue, element, hovered, dragging, focused, focusedWithin, focusVisible, disabled, readOnly }` for a descendant of `PlaneThumb`. `value` is the thumb's own position or offset; `worldValue` is its accumulated plane position. `element` is its rendered element, and `focusedWithin` includes focus in descendant controls. Descendants inherit their parent thumb's `disabled` and `readOnly` states. It throws when called outside `PlaneThumb`.

### clampPlaneValue

Clamps both coordinates to the `0` to `1` range. Non-finite coordinates become `0`.

### getPlaneValueFromPoint

Converts viewport coordinates and element bounds to a clamped Cartesian `PlaneValue`. A zero-sized axis resolves to `0`.

## Types

| Type                           | Contract                                                                                |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| `PlaneValue`                   | `{ x: number; y: number }`: a normalized position or signed nested offset.              |
| `PlaneInteraction`             | `'pointer' \| 'keyboard'`.                                                              |
| `PlaneHoverValueChangeDetails` | The pointer type and native pointer event for a hover-position change.                  |
| `PlaneValueChangeReason`       | `'thumb-drag' \| 'plane-press' \| 'keyboard' \| 'input-change'`.                        |
| `PlaneValueChangeDetails`      | Interaction, reason, optional thumb ID, and optional original event for a value change. |
| `PlanePoint`                   | `{ clientX: number; clientY: number }`.                                                 |
| `PlaneBounds`                  | `{ left: number; top: number; width: number; height: number }`.                         |
| `PlanePressBehavior`           | `'auto' \| 'none' \| 'nearest'`.                                                        |
| `PlaneDragBehavior`            | `'absolute' \| 'relative'`.                                                             |
| `PlaneThumbPressBehavior`      | `'inherit' \| 'none'`.                                                                  |
| `PlaneContextValue`            | The root `disabled`, `readOnly`, and `dragging` state.                                  |
| `PlaneThumbContextValue`       | The thumb's value, interaction, hover, focus, `disabled`, and `readOnly` states.        |
| `PlaneProps`                   | Native `div` props plus root interaction options.                                       |
| `PlaneThumbProps`              | Native `div` props plus value, interaction, form, and axis options.                     |
| `PlaneAttachmentProps`         | Native `div` props plus placement, collision, portal, and visibility options.           |

## Source

[Implementation](https://github.com/pbroom/control-kit/blob/main/src/plane.tsx) · [Tests](https://github.com/pbroom/control-kit/blob/main/__tests__/plane.test.tsx) · [Issues](https://github.com/pbroom/control-kit/issues)
