# Plane

A composable two-dimensional input for selecting normalized X and Y values. `Plane` owns geometry and pointer routing while its children own their positions and visual layers.

<!-- demo:basic -->

## Anatomy

Import the parts and compose them together:

```tsx
import { Plane, PlaneThumb, PlaneAttachment } from '@pbroom/control-kit';

<Plane aria-label="Position">
  <PlaneThumb defaultValue={{ x: 0.5, y: 0.5 }} />
</Plane>;
```

`Plane` renders a `div` and routes pointer interaction to its thumbs. `PlaneThumb` owns a normalized position and renders a positioned `div` containing two visually hidden range inputs, one for each axis. Both parts forward their refs to their rendered `div`.

Top-level thumb coordinates are clamped from `0` to `1`. X increases from left to right. Y follows Cartesian direction and increases from bottom to top. Nested thumbs use signed offsets from their parent, measured in the same plane units.

## Usage guidelines

- Use a thumb's `onValueChange` for immediate visual feedback. Use `onValueCommitted` for persistence or expensive downstream work.
- In controlled mode, update the thumb's `value` from `onValueChange`. The rendered thumb only moves when the controlled value changes.
- Use `getAriaValueText` to express domain values instead of normalized percentages—for example, “50% saturation, 75% lightness” for a color plane.
- Hide decorative guides, canvas layers, and SVG content from assistive technology when they do not add information beyond the two axis controls.
- Don't clip the Plane root: a thumb is centred on its value, so at an edge or corner half of it sits outside the plane. Keep the root `overflow: visible` (the default) and put clipped surface content in an inner layer, so thumbs at the edges stay whole. The root's own background, border and radius need no clipping.

```tsx
<Plane
  aria-label="Position"
  className="relative size-72 rounded-xl border bg-zinc-900"
>
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
  >
    {/* Images, canvases, oversized guides: clipped here. */}
  </div>
  <PlaneThumb value={point} onValueChange={setPoint} />
</Plane>
```

## Controlled state

Use `value` and `onValueChange` when another part of your application owns the position.

```tsx
const [value, setValue] = React.useState({ x: 0.5, y: 0.5 });

<Plane>
  <PlaneThumb
    value={value}
    onValueChange={setValue}
    onValueCommitted={(nextValue, details) => {
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

## Snapping

Pass `snap` to quantize or attract a thumb's value. Targets are expressed in the thumb's own space: `0` to `1` for top-level thumbs, `-1` to `1` for nested offsets. Set targets on `Plane` to give every top-level thumb the same defaults; a thumb's own `snap` replaces them.

Drag near the guide lines and points, change the grid, lock an axis, or pick a snap transition. Hold Alt/Option while dragging to bypass snapping.

<!-- demo:snapping -->

```tsx
<Plane snap={[{ type: 'grid', x: 0.1, y: 0.1 }]}>
  <PlaneThumb
    aria-label="Anchor"
    snap={[
      { type: 'grid', x: 0.25 },
      { type: 'line', axis: 'y', at: 0.5 },
      { type: 'point', x: 0.75, y: 0.25, id: 'corner' },
    ]}
    snapRadius={10}
    onValueChange={(value, details) => {
      setValue(value);
      setGuide(details.snap?.target ?? null);
    }}
  />
</Plane>
```

| Target                              | Behavior                                                                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `{ type: 'grid', x?, y?, origin? }` | Always rounds each given axis to `origin + k × size`. An omitted axis stays free.                                                          |
| `{ type: 'line', axis, at }`        | Magnetic within `snapRadius`. `axis: 'x'` is a vertical line at `x = at`.                                                                  |
| `{ type: 'point', x, y, id? }`      | Magnetic within `snapRadius`, measured as a pixel distance.                                                                                |
| `{ type: 'custom', resolve }`       | Runs first, in declaration order. Return a value to snap there, or `null` to defer. A value that clamps back to the raw value also defers. |

- **Pipeline.** Pointer value → relative drag → axis lock → snap → clamp → `onValueChange`. Relative drags snap the resulting value, not the pointer delta.
- **Priority.** Custom, then point, then line, then grid. A point fixes both axes. Without one, the nearest line on each axis fixes that axis, so a vertical and a horizontal line combine at their intersection. A grid quantizes any axis left free. The nearest target of a kind wins, and ties keep declaration order. Targets outside the thumb's range are ignored.
- **Radius.** `snapRadius` (default `8`) is in CSS pixels and converted per axis from the measured plane size, so magnetism is the same horizontally and vertically on non-square planes.
- **Hysteresis.** An engaged point, or each engaged line independently, releases only beyond 1.5 × the radius, so the thumb does not flicker at the edge.
- **Bypass.** Holding Alt/Option during a drag disables snapping. Set `snapBypass="meta"` to use Command/Windows instead, or `false` to never bypass. Alt was chosen because it already means “finer, unsnapped” on the keyboard (Alt + Arrow uses `smallStep`), and the Windows key is reserved by the OS.
- **Controlled values** set by the parent are never snapped. Removing or replacing a target clears a snapped state that referred to it.

Use `axisLock="x"` or `axisLock="y"` to restrict pointer movement to one axis; the other stays at its value from the start of the drag. With `axisLock="dominant-with-shift"`, holding Shift during a drag locks to the axis with the greater pixel travel since the drag began. A locked axis is never snapped, and points do not engage while an axis is locked.

`onValueChange` and `onValueCommitted` report the snap as `details.snap`: `{ target, index, axes, parts? }`. `target` and `index` (its position in the resolved `snap` array) name the highest-priority target applied, and `axes` lists every snapped axis. When more than one target applied, such as two perpendicular lines or a line plus a grid, `parts` lists each one with its own `axes`. `usePlaneThumbContext().snapped` exposes the same hit for descendants, and the thumb receives `data-snapped` and `data-snapped-axis`. Both keys are omitted entirely when nothing snapped, so a Plane without snapping reports exactly the same details as before.

### Keyboard

With a grid on an axis, arrow keys move to the next grid line in that direction instead of adding `step`. Shift + Arrow and Page Up/Page Down move `largeStep`, rounded to the grid, but always at least one line. Past the last grid line in a direction, keys move to the bound, so a grid that does not divide the range (such as `0.3`) still reaches both ends. Home and End go to the outermost grid line when it lies beyond the value, and otherwise to the bound; they never move away from it. Only axes the grid actually moved are reported as snapped. Alt/Option + Arrow moves by `smallStep` and ignores the grid, matching the pointer bypass. Magnetic targets do not affect keyboard input.

Each axis input's native `step` is the grid size while its value sits on a grid line aligned with the input's minimum, and `"any"` otherwise, so the browser never rewrites an off-grid value. Native input changes are rounded to the grid. `aria-valuetext` always describes the snapped value.

## Motion

Snapping is instant by default. Callbacks always receive the snapped value immediately; motion only changes where the thumb is drawn. Hover and nearest-thumb hit-testing use the logical value.

For CSS transitions, animate the inline `left` and `top` only while a snap changes the position. `data-snap-transition` is present on updates that enter, move between, or leave snap positions, and is removed by the next free update, so ordinary dragging stays immediate:

```css
[data-slot='plane-thumb'][data-snap-transition] {
  transition:
    left 120ms ease-out,
    top 120ms ease-out;
}
```

The attribute persists until the next unsnapped update rather than lasting a single frame, because removing a transition mid-flight cancels it.

For JavaScript motion, pass `motion` to a thumb (or to `Plane` as a default). `springMotion({ stiffness, damping, mass })` is built in; it settles instantly when the user prefers reduced motion. Motion animates snap transitions (entering, moving between, or leaving targets), keyboard changes, and programmatic value changes. Free drag samples follow the pointer instantly unless the motion sets `smoothDrag: true`. One animation-frame loop runs only while the thumb is moving; new targets retarget it without restarting. Nested thumbs follow their parent's drawn position.

```tsx
const spring = springMotion({ stiffness: 500, damping: 38 });

<PlaneThumb snap={[{ type: 'grid', x: 0.25, y: 0.25 }]} motion={spring} />;
```

Hoist `springMotion()` outside the component or wrap it in `useMemo`. An inline `motion={springMotion()}` still works and keeps its momentum across renders, because velocity is tracked per drawn position rather than per instance, but it allocates on every render.

A custom `PlaneMotion` implements `step(current, target, dtMs, { reason })` and returns `{ value, done }`. `reason` is `'snap'`, `'keyboard'`, `'programmatic'`, or (with `smoothDrag`) `'drag'`. `current` is the object returned by the previous step, so per-thumb state can be keyed on it. `dtMs` comes from animation-frame timestamps.

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

`onValueChange` and `onValueCommitted` receive `details.interaction`, which groups changes as `'pointer'` or `'keyboard'`. `details.reason` identifies `'thumb-drag'`, `'plane-press'`, `'keyboard'`, or `'input-change'`, and `details.originalEvent` exposes the native event when available. When `thumbId` is set, callbacks also receive it as `details.thumbId`. `details.snap` is the snap hit that produced the value; it is omitted when nothing snapped.

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
| `data-snapped`            | While the value rests on a snap target.          |
| `data-snapped-axis`       | `x`, `y`, or `both`: the snapped axes.           |
| `data-snap-transition`    | From a snap change until the next free update.   |

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
| Left Arrow / Right Arrow | Decreases or increases X by `step`, or to the next grid line when X has a grid.        |
| Down Arrow / Up Arrow    | Decreases or increases Y by `step`, or to the next grid line when Y has a grid.        |
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

Returns `{ value, worldValue, element, hovered, dragging, focused, focusedWithin, focusVisible, disabled, readOnly, snapped }` for a descendant of `PlaneThumb`. `snapped` is the snap hit the current value rests on; the key is omitted when unsnapped. `value` is the thumb's own position or offset; `worldValue` is its accumulated plane position. `element` is its rendered element, and `focusedWithin` includes focus in descendant controls. Descendants inherit their parent thumb's `disabled` and `readOnly` states. It throws when called outside `PlaneThumb`.

### clampPlaneValue

Clamps both coordinates to the `0` to `1` range. Non-finite coordinates become `0`.

### resolvePlaneSnap

`resolvePlaneSnap(raw, { targets, boundsPx, previous, bypass, radiusPx, space })` is the pure resolver PlaneThumb uses, returning `{ value, hit }`. Pass the previous `hit` back as `previous` for hysteresis. `space` is `'unit'` (`0` to `1`, default) or `'local'` (`-1` to `1`). The result is not clamped.

### springMotion

`springMotion({ stiffness = 500, damping = 38, mass = 1, smoothDrag = false })` returns a `PlaneMotion` for the `motion` prop. It is solved in closed form, so every accepted option and frame length is stable. The damping ratio is kept between `0.05` and `10` times critical so it always settles, and any animation ends within 3 seconds. Drawn positions are always clamped to the thumb's range. One instance can drive several thumbs. Hoist it or memoize it.

### getPlaneValueFromPoint

Converts viewport coordinates and element bounds to a clamped Cartesian `PlaneValue`. A zero-sized axis resolves to `0`.

## Types

| Type                           | Contract                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `PlaneValue`                   | `{ x: number; y: number }`: a normalized position or signed nested offset.                             |
| `PlaneInteraction`             | `'pointer' \| 'keyboard'`.                                                                             |
| `PlaneHoverValueChangeDetails` | The pointer type and native pointer event for a hover-position change.                                 |
| `PlaneValueChangeReason`       | `'thumb-drag' \| 'plane-press' \| 'keyboard' \| 'input-change'`.                                       |
| `PlaneValueChangeDetails`      | Interaction, reason, snap hit, optional thumb ID, and optional original event.                         |
| `PlaneSnapTarget`              | A `grid`, `line`, `point`, or `custom` snap target.                                                    |
| `PlaneSnapHit`                 | `{ target; index; axes; parts? }`: the targets that produced a value and the snapped axes.             |
| `PlaneSnapHitPart`             | `{ target; index; axes }`: one applied target in `PlaneSnapHit.parts`.                                 |
| `PlaneMotionReason`            | `'drag' \| 'snap' \| 'keyboard' \| 'programmatic'`.                                                    |
| `PlaneAxisLock`                | `'x' \| 'y' \| 'dominant-with-shift'`.                                                                 |
| `PlaneSnapBypass`              | `'alt' \| 'meta' \| false`.                                                                            |
| `PlaneMotion`                  | `{ step(current, target, dtMs, { reason }): { value; done }; smoothDrag? }`: presentation-only motion. |
| `PlaneSnapProps`               | `snap`, `snapRadius`, `axisLock`, `snapBypass`, and `motion`, shared by both parts.                    |
| `PlanePoint`                   | `{ clientX: number; clientY: number }`.                                                                |
| `PlaneBounds`                  | `{ left: number; top: number; width: number; height: number }`.                                        |
| `PlanePressBehavior`           | `'auto' \| 'none' \| 'nearest'`.                                                                       |
| `PlaneDragBehavior`            | `'absolute' \| 'relative'`.                                                                            |
| `PlaneThumbPressBehavior`      | `'inherit' \| 'none'`.                                                                                 |
| `PlaneContextValue`            | The root `disabled`, `readOnly`, and `dragging` state.                                                 |
| `PlaneThumbContextValue`       | The thumb's value, interaction, hover, focus, snap, `disabled`, and `readOnly` states.                 |
| `PlaneProps`                   | Native `div` props plus root interaction options.                                                      |
| `PlaneThumbProps`              | Native `div` props plus value, interaction, form, and axis options.                                    |
| `PlaneAttachmentProps`         | Native `div` props plus placement, collision, portal, and visibility options.                          |

## Source

[Implementation](https://github.com/pbroom/control-kit/blob/main/src/plane.tsx) · [Tests](https://github.com/pbroom/control-kit/blob/main/__tests__/plane.test.tsx) · [Issues](https://github.com/pbroom/control-kit/issues)
