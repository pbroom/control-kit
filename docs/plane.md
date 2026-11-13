# Plane

A composable two-dimensional input for selecting normalized X and Y values. `Plane` owns geometry and pointer routing while its children own their positions and visual layers.

Example: Normalized position

```tsx
import { useState } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from '@pbroom/control-kit';

const initialValue: PlaneValue = { x: 0.5, y: 0.5 };

function formatPosition(value: PlaneValue) {
  return `${Math.round(value.x * 100)}% horizontal, ${Math.round(value.y * 100)}% vertical`;
}

export function PlaneExample() {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="flex min-h-[440px] flex-col items-center justify-center gap-5 p-8 max-sm:min-h-[360px] max-sm:p-5">
      <Plane
        aria-label="Normalized position"
        className="size-[300px] rounded-2xl border border-white/10 bg-[#171718] max-sm:size-[240px]"
      >
        <PlaneThumb
          className="size-6 border-white/30 bg-white shadow-none"
          getAriaValueText={formatPosition}
          largeStep={0.1}
          onValueChange={setValue}
          step={0.01}
          value={value}
          xAriaLabel="Horizontal position"
          yAriaLabel="Vertical position"
        >
          <span
            aria-hidden="true"
            className="size-3 rounded-full bg-[#171717]"
          />
        </PlaneThumb>
      </Plane>
      <output className="font-mono text-[11px] text-white/48">
        X {value.x.toFixed(2)} · Y {value.y.toFixed(2)}
      </output>
    </div>
  );
}
```

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

Example: Multiple thumbs

```tsx
import { useState } from 'react';
import {
  Checkbox,
  Plane,
  PlaneThumb,
  type PlaneValue,
} from '@pbroom/control-kit';

const initialPoints = [
  { id: 'top-left', value: { x: 0.25, y: 0.75 } },
  { id: 'top-right', value: { x: 0.75, y: 0.75 } },
  { id: 'bottom-left', value: { x: 0.25, y: 0.25 } },
  { id: 'bottom-right', value: { x: 0.75, y: 0.25 } },
] satisfies Array<{ id: string; value: PlaneValue }>;

export function MultipleThumbsExample() {
  const [points, setPoints] = useState(initialPoints);
  const [movesNearestPoint, setMovesNearestPoint] = useState(true);

  return (
    <div className="flex min-h-[440px] flex-col items-center justify-center gap-5 p-8 max-sm:min-h-[360px] max-sm:p-5">
      <Plane
        aria-label="Mesh control points"
        className="size-[300px] rounded-2xl border border-white/10 bg-[#171718] max-sm:size-[240px]"
        pressBehavior={movesNearestPoint ? 'nearest' : 'none'}
      >
        {points.map((point, index) => (
          <PlaneThumb
            aria-label={`Control point ${index + 1}`}
            className="size-6 border-white/30 bg-white font-mono text-[10px] shadow-none"
            key={point.id}
            onValueChange={(value) => {
              setPoints((current) =>
                current.map((item) =>
                  item.id === point.id ? { ...item, value } : item,
                ),
              );
            }}
            thumbId={point.id}
            value={point.value}
          >
            {index + 1}
          </PlaneThumb>
        ))}
      </Plane>
      <Checkbox
        checked={movesNearestPoint}
        className="text-white/48"
        onCheckedChange={setMovesNearestPoint}
      >
        Press empty space to move the nearest point.
      </Checkbox>
    </div>
  );
}
```

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

[Try gradient origin and radius](https://github.com/pbroom/control-kit/tree/main/lab/src/routes/docs/examples/plane-examples).

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

[Try image panning and focal-point dragging](https://github.com/pbroom/control-kit/tree/main/lab/src/routes/docs/examples/plane-examples).

## Snapping

Pass `snap` to quantize or attract a thumb's value. Targets are expressed in the thumb's own space: `0` to `1` for top-level thumbs, `-1` to `1` for nested offsets. Set targets on `Plane` to give every top-level thumb the same defaults; a thumb's own `snap` replaces them.

Drag near the guide lines and points, change the grid, lock an axis, or pick a snap transition. Hold Alt/Option while dragging to bypass snapping.

Example: Snapping

```tsx
import { useMemo, useState } from 'react';
import {
  Checkbox,
  ControlInput,
  Plane,
  PlaneThumb,
  ToggleGroup,
  ToggleGroupItem,
  springMotion,
  type PlaneAxisLock,
  type PlaneSnapHit,
  type PlaneSnapTarget,
  type PlaneValue,
} from '@pbroom/control-kit';

const guides: PlaneSnapTarget[] = [
  { type: 'line', axis: 'x', at: 0.5 },
  { type: 'line', axis: 'y', at: 0.5 },
  { type: 'point', x: 0.25, y: 0.75, id: 'A' },
  { type: 'point', x: 0.75, y: 0.25, id: 'B' },
];

function gridLines(size: number | null) {
  if (!size || size <= 0) return [];
  const lines: number[] = [];
  for (let at = size; at < 1 - 1e-9; at += size) lines.push(at);
  return lines;
}

function describeSnap(hit: PlaneSnapHit | undefined) {
  if (!hit) return 'free';
  return (hit.parts ?? [hit])
    .map(({ target, axes }) => {
      const name =
        target.type === 'point'
          ? `point ${target.id}`
          : target.type === 'line'
            ? `line ${target.axis}=${target.at}`
            : target.type;
      return `${name} (${axes.join('')})`;
    })
    .join(' + ');
}

export function PlaneSnappingExample() {
  // Memoized so every render shares one motion.
  const spring = useMemo(() => springMotion(), []);
  const [value, setValue] = useState<PlaneValue>({ x: 0.4, y: 0.6 });
  const [hit, setHit] = useState<PlaneSnapHit | undefined>();
  const [gridOn, setGridOn] = useState(true);
  const [gridX, setGridX] = useState<number | null>(0.125);
  const [gridY, setGridY] = useState<number | null>(0.125);
  const [axisLock, setAxisLock] = useState<string | null>('none');
  const [transition, setTransition] = useState<string | null>('css');

  const gx = gridOn && gridX && gridX > 0 ? gridX : undefined;
  const gy = gridOn && gridY && gridY > 0 ? gridY : undefined;
  const snap = useMemo<PlaneSnapTarget[]>(
    () => (gx || gy ? [...guides, { type: 'grid', x: gx, y: gy }] : guides),
    [gx, gy],
  );
  const active = new Set(
    (hit ? (hit.parts ?? [hit]) : []).map((part) => part.index),
  );

  return (
    <div className="flex min-h-[520px] flex-col items-center justify-center gap-5 p-8 max-sm:p-5">
      <Plane
        aria-label="Snapping position"
        className="relative size-[300px] rounded-2xl border border-white/10 bg-[#171718] max-sm:size-[240px]"
      >
        {/* Decorations are clipped in an inner layer; the thumb never is. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
        >
          {gridLines(gx ?? null).map((at) => (
            <span
              key={`gx${at}`}
              className="absolute inset-y-0 w-px bg-white/[0.06]"
              style={{ left: `${at * 100}%` }}
            />
          ))}
          {gridLines(gy ?? null).map((at) => (
            <span
              key={`gy${at}`}
              className="absolute inset-x-0 h-px bg-white/[0.06]"
              style={{ top: `${(1 - at) * 100}%` }}
            />
          ))}
          {guides.map((target, index) => {
            const tone = active.has(index) ? 'bg-sky-400' : 'bg-white/25';
            if (target.type === 'line') {
              return (
                <span
                  key={index}
                  data-snap-guide={index}
                  data-active={active.has(index) || undefined}
                  className={`absolute ${tone} ${
                    target.axis === 'x' ? 'inset-y-0 w-px' : 'inset-x-0 h-px'
                  }`}
                  style={
                    target.axis === 'x'
                      ? { left: `${target.at * 100}%` }
                      : { top: `${(1 - target.at) * 100}%` }
                  }
                />
              );
            }
            if (target.type !== 'point') return null;
            return (
              <span
                key={index}
                data-snap-guide={index}
                data-active={active.has(index) || undefined}
                className={`absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${tone}`}
                style={{
                  left: `${target.x * 100}%`,
                  top: `${(1 - target.y) * 100}%`,
                }}
              />
            );
          })}
        </div>
        <PlaneThumb
          aria-label="Snapped point"
          value={value}
          onValueChange={setValue}
          // Fires on every snap change, even when the value is unchanged.
          onSnapChange={setHit}
          snap={snap}
          axisLock={
            axisLock === 'none' || !axisLock
              ? undefined
              : (axisLock as PlaneAxisLock)
          }
          motion={transition === 'spring' ? spring : undefined}
          // Transition only the axes a snap made jump; the axis following
          // the pointer is never eased.
          className={`size-5 border-white/30 bg-white shadow-none data-[snapped]:border-sky-400 ${
            transition === 'css'
              ? 'data-[snap-transition]:duration-[120ms] data-[snap-transition]:ease-out data-[snap-transition=x]:transition-[left] data-[snap-transition=y]:transition-[top] data-[snap-transition=x_y]:transition-[left,top]'
              : ''
          }`}
        />
      </Plane>
      <output
        data-snapping-readout
        className="font-mono text-[11px] text-white/55"
      >
        X {value.x.toFixed(3)} · Y {value.y.toFixed(3)} · {describeSnap(hit)}
      </output>
      <div className="flex w-full max-w-[340px] flex-col gap-3 text-[11px] text-white/55">
        <div className="flex items-center gap-2">
          <Checkbox checked={gridOn} onCheckedChange={setGridOn}>
            Grid
          </Checkbox>
          <ControlInput
            label="Grid X"
            handle="X"
            size="sm"
            min={0}
            max={1}
            step={0.025}
            precision={3}
            value={gridX}
            onValueChange={setGridX}
            disabled={!gridOn}
          />
          <ControlInput
            label="Grid Y"
            handle="Y"
            size="sm"
            min={0}
            max={1}
            step={0.025}
            precision={3}
            value={gridY}
            onValueChange={setGridY}
            disabled={!gridOn}
          />
        </div>
        <ToggleGroup
          aria-label="Axis lock"
          value={axisLock}
          onValueChange={(next) => next && setAxisLock(next)}
        >
          <ToggleGroupItem value="none">Free</ToggleGroupItem>
          <ToggleGroupItem value="x">X only</ToggleGroupItem>
          <ToggleGroupItem value="y">Y only</ToggleGroupItem>
          <ToggleGroupItem value="dominant-with-shift">Shift</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup
          aria-label="Snap transition"
          value={transition}
          onValueChange={(next) => next && setTransition(next)}
        >
          <ToggleGroupItem value="none">Instant</ToggleGroupItem>
          <ToggleGroupItem value="css">CSS</ToggleGroupItem>
          <ToggleGroupItem value="spring">Spring</ToggleGroupItem>
        </ToggleGroup>
        <p>Hold Alt/Option while dragging to bypass snapping.</p>
      </div>
    </div>
  );
}
```

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

Use `onSnapChange(hit, details)` to track snap changes. `details.snap` only arrives with value changes, but a snap can change without the value changing, for example when a point engages on a grid line the thumb already sits on. `onSnapChange` fires whenever the snap changes: entering, leaving, or switching targets, parts, or axes. It does not fire while the same snap holds, at mount, or when snapping is not configured. In an interaction it fires after `onValueChange`. `hit` is `undefined` when the snap ends. `details` carries the `interaction`, `reason`, `thumbId`, and `originalEvent` of the pointer or keyboard input. Snaps that end without input use `interaction: 'programmatic'` with reason `'external-value-change'` (a controlled update or form reset replaced the value) or `'snap-targets-change'` (the snapped targets were removed or replaced). Set it on `Plane` as a default for top-level thumbs.

### Keyboard

With a grid on an axis, arrow keys move to the next grid line in that direction instead of adding `step`. Shift + Arrow and Page Up/Page Down move `largeStep`, rounded to the grid, but always at least one line. Past the last grid line in a direction, keys move to the bound, so a grid that does not divide the range (such as `0.3`) still reaches both ends. Home and End go to the outermost grid line when it lies beyond the value, and otherwise to the bound; they never move away from it. Only axes the grid actually moved are reported as snapped. Alt/Option + Arrow moves by `smallStep` and ignores the grid, matching the pointer bypass. Magnetic targets do not affect keyboard input.

Each axis input's native `step` is the grid size while its value sits on a grid line aligned with the input's minimum, and `"any"` otherwise, so the browser never rewrites an off-grid value. Native input changes are rounded to the grid. `aria-valuetext` always describes the snapped value.

## Motion

Snapping is instant by default. Callbacks always receive the snapped value immediately; motion only changes where the thumb is drawn. Hover and nearest-thumb hit-testing use the logical value.

For CSS transitions, animate only the axes a snap moved. `data-snap-transition` lists the axes whose value jumped discontinuously because of snapping: `"x"`, `"y"`, or `"x y"`. A jump happens when an axis enters, leaves, or switches targets, and on every step from one grid line to the next. An axis stays listed while the same target holds it, so a transition can finish and a new jump retargets it. It is removed as soon as that axis tracks the pointer continuously again. An axis that tracks the pointer, such as the free axis while sliding along a guide line or any axis while snapping is bypassed, is never listed, so it never lags:

```css
[data-slot='plane-thumb'][data-snap-transition~='x'] {
  transition: left 120ms ease-out;
}
[data-slot='plane-thumb'][data-snap-transition~='y'] {
  transition: top 120ms ease-out;
}
[data-slot='plane-thumb'][data-snap-transition='x y'] {
  transition:
    left 120ms ease-out,
    top 120ms ease-out;
}
```

Avoid transitioning both `left` and `top` whenever the attribute is present. While the thumb slides along a line, the snapped axis is listed but the other axis follows the pointer, and an eased free axis lags behind it.

For JavaScript motion, pass `motion` to a thumb (or to `Plane` as a default). `springMotion({ stiffness, damping, mass })` is built in; it settles instantly when the user prefers reduced motion. Motion animates the axes a snap transition moved (entering, moving between, or leaving targets), keyboard changes, and programmatic value changes. During a drag, axes that jump because of snapping, including grid steps, animate. An axis that tracks the pointer continuously, such as the free axis while the other is snapped, is drawn at the pointer in the same render unless the motion sets `smoothDrag: true`. One animation-frame loop runs only while the thumb is moving; new targets retarget it without restarting. Nested thumbs follow their parent's drawn position.

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

Props for `Plane`:

| Prop                   | Type                                                                         | Default         | Description                                                                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pressBehavior`        | `PlanePressBehavior \| undefined`                                            | `'auto'`        | Controls what happens when empty plane space is pressed.                                                                                                                |
| `dragBehavior`         | `PlaneDragBehavior \| undefined`                                             | `'absolute'`    | Absolute movement places the selected thumb at the pointer. Relative movement preserves its starting offset and applies the pointer drag distance.                      |
| `dragSensitivity`      | `number \| undefined`                                                        | `1`             | Scales pointer distance during relative dragging. Smaller values provide finer control.                                                                                 |
| `snap`                 | `readonly PlaneSnapTarget[] \| undefined`                                    | —               | Default snap targets for top-level thumbs, in 0–1 plane space. Nested thumbs do not inherit them.                                                                       |
| `snapRadius`           | `number \| undefined`                                                        | `8`             | Magnetic radius for line and point targets, in CSS pixels, converted per axis from the measured plane size.                                                             |
| `axisLock`             | `PlaneAxisLock \| undefined`                                                 | —               | Restricts pointer movement to one axis. dominant-with-shift locks to the axis of greater travel while Shift is held during a drag.                                      |
| `snapBypass`           | `PlaneSnapBypass \| undefined`                                               | `'alt'`         | Modifier that disables snapping while held during a pointer drag. false never bypasses.                                                                                 |
| `motion`               | `PlaneMotion \| undefined`                                                   | `instant`       | Presentation-only motion for snap transitions, keyboard, and programmatic changes; free drags follow the pointer. Hoist or memoize springMotion(). Callbacks never lag. |
| `onSnapChange`         | `(hit: PlaneSnapHit \| undefined, details: PlaneSnapChangeDetails) => void`  | —               | Default for top-level thumbs: called whenever the snap changes, even without a value change. Nested thumbs do not inherit it.                                           |
| `onHoverValueChange`   | `(value: PlaneValue \| null, details: PlaneHoverValueChangeDetails) => void` | —               | Called with the normalized position while a mouse or hovering pen moves over the plane, and null when it leaves.                                                        |
| `disabled`             | `boolean \| undefined`                                                       | `false`         | Prevents changes and disables every thumb axis input.                                                                                                                   |
| `readOnly`             | `boolean \| undefined`                                                       | `false`         | Prevents changes while keeping every thumb axis input available to assistive technology.                                                                                |
| `role`                 | `React.AriaRole \| undefined`                                                | `'group'`       | The root element's role.                                                                                                                                                |
| `aria-label`           | `string \| undefined`                                                        | `'2D position'` | The accessible name for the group.                                                                                                                                      |
| `aria-roledescription` | `string \| undefined`                                                        | `'2D control'`  | The human-readable description of the root role.                                                                                                                        |

`pressBehavior="auto"` selects the only thumb when empty plane space is pressed, provided it is interactive and has not opted out. It does nothing when multiple thumbs are present, even if only one is eligible. `pressBehavior="none"` disables empty-space selection, and `pressBehavior="nearest"` selects the visually nearest eligible thumb.

The root captures the primary pointer for a drag and measures its bounds once at the start. Changing the root to `disabled` or `readOnly` during a drag ends the interaction without committing. Native pointer handlers run before Plane's internal handling, so calling `preventDefault()` cancels the corresponding internal step.

`onHoverValueChange` reports normalized mouse and hovering-pen coordinates without moving a thumb. It receives `null` when the pointer leaves. `details.pointerType` identifies the pointer, and `details.event` exposes the native pointer event. Touch input does not report hover values.

**Data attributes**

| Attribute           | When present                           |
| ------------------- | -------------------------------------- |
| `data-slot="plane"` | Always.                                |
| `data-dragging`     | While a pointer interaction is active. |
| `data-disabled`     | When `disabled` is `true`.             |
| `data-readonly`     | When `readOnly` is `true`.             |

### PlaneThumb

Owns a position, renders its visible marker, and supplies two accessible slider axes. A top-level thumb owns a normalized plane position; a nested thumb owns a signed parent-relative offset. `PlaneThumbProps` includes native `div` props except `defaultValue` and `onChange`.

Props for `PlaneThumb`:

| Prop               | Type                                                                        | Default                                                 | Description                                                                                                                                                             |
| ------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pressBehavior`    | `PlaneThumbPressBehavior \| undefined`                                      | `'inherit'`                                             | Inherit makes the thumb eligible for empty-space presses. None requires a direct press while preserving keyboard interaction.                                           |
| `thumbId`          | `string \| undefined`                                                       | —                                                       | Identifies the thumb in data attributes and value-change details.                                                                                                       |
| `value`            | `PlaneValue \| undefined`                                                   | —                                                       | The controlled plane position, or signed parent-relative offset for a nested thumb.                                                                                     |
| `defaultValue`     | `PlaneValue \| undefined`                                                   | `Top-level: { x: 0.5, y: 0.5 }; nested: { x: 0, y: 0 }` | The initial uncontrolled position. Top-level coordinates clamp to 0–1; nested offsets clamp to -1–1 in plane units.                                                     |
| `onValueChange`    | `(value: PlaneValue, details: PlaneValueChangeDetails) => void`             | —                                                       | Called for each distinct value produced by pointer or keyboard input.                                                                                                   |
| `onValueCommitted` | `(value: PlaneValue, details: PlaneValueChangeDetails) => void`             | —                                                       | Called when this thumb's pointer or keyboard interaction completes.                                                                                                     |
| `onValueCommit`    | `(value: PlaneValue, details: PlaneValueChangeDetails) => void`             | —                                                       | Deprecated alias for onValueCommitted. Ignored when onValueCommitted is provided.                                                                                       |
| `disabled`         | `boolean \| undefined`                                                      | `false`                                                 | Prevents changes and disables both axis inputs.                                                                                                                         |
| `readOnly`         | `boolean \| undefined`                                                      | `false`                                                 | Prevents changes while keeping both axis inputs available to assistive technology.                                                                                      |
| `aria-label`       | `string \| undefined`                                                       | —                                                       | Names the thumb and derives both axis names.                                                                                                                            |
| `xAriaLabel`       | `string \| undefined`                                                       | `'Horizontal position'`                                 | Overrides the corresponding aria-label axis name.                                                                                                                       |
| `yAriaLabel`       | `string \| undefined`                                                       | `'Vertical position'`                                   | Overrides the corresponding aria-label axis name.                                                                                                                       |
| `getAriaValueText` | `(value: PlaneValue) => string`                                             | `percentage-based position`                             | Formats the thumb's 2D position for assistive technology.                                                                                                               |
| `step`             | `number \| undefined`                                                       | `0.01`                                                  | The unmodified arrow-key increment.                                                                                                                                     |
| `smallStep`        | `number \| undefined`                                                       | `0.001`                                                 | The Alt/Option + Arrow increment.                                                                                                                                       |
| `largeStep`        | `number \| undefined`                                                       | `0.1`                                                   | The Shift+Arrow and Page Up or Page Down increment.                                                                                                                     |
| `xName`            | `string \| undefined`                                                       | —                                                       | The horizontal range input's form field name.                                                                                                                           |
| `yName`            | `string \| undefined`                                                       | —                                                       | The vertical range input's form field name.                                                                                                                             |
| `form`             | `string \| undefined`                                                       | —                                                       | The ID of the form associated with both axis inputs.                                                                                                                    |
| `snap`             | `readonly PlaneSnapTarget[] \| undefined`                                   | —                                                       | Grid, line, point, and custom targets in this thumb's own space. Replaces the Plane default.                                                                            |
| `snapRadius`       | `number \| undefined`                                                       | `8`                                                     | Magnetic radius for line and point targets, in CSS pixels, converted per axis from the measured plane size.                                                             |
| `axisLock`         | `PlaneAxisLock \| undefined`                                                | —                                                       | Restricts pointer movement to one axis. dominant-with-shift locks to the axis of greater travel while Shift is held during a drag.                                      |
| `snapBypass`       | `PlaneSnapBypass \| undefined`                                              | `'alt'`                                                 | Modifier that disables snapping while held during a pointer drag. false never bypasses.                                                                                 |
| `motion`           | `PlaneMotion \| undefined`                                                  | `instant`                                               | Presentation-only motion for snap transitions, keyboard, and programmatic changes; free drags follow the pointer. Hoist or memoize springMotion(). Callbacks never lag. |
| `onSnapChange`     | `(hit: PlaneSnapHit \| undefined, details: PlaneSnapChangeDetails) => void` | —                                                       | Called whenever the snap changes (enter, leave, switch), even without a value change; after onValueChange. hit is undefined when the snap ends.                         |

`onValueChange` and `onValueCommitted` receive `details.interaction`, which groups changes as `'pointer'` or `'keyboard'`. `details.reason` identifies `'thumb-drag'`, `'plane-press'`, `'keyboard'`, or `'input-change'`, and `details.event` exposes the native event when available. `details.originalEvent` is a deprecated alias. `getControlInteraction(details)` reads the same grouping from any Control Kit control's details. When `thumbId` is set, callbacks also receive it as `details.thumbId`. `details.snap` is the snap hit that produced the value; it is omitted when nothing snapped.

A pointer interaction commits on release, cancellation, or lost capture. Changing a thumb to `disabled` or `readOnly` during a drag ends the interaction without committing. Non-positive and non-finite step values fall back to their defaults.

**Data attributes**

| Attribute                 | When present                                                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `data-slot="plane-thumb"` | Always.                                                                                                          |
| `data-thumb-id`           | When `thumbId` is set.                                                                                           |
| `data-hovered`            | While a mouse or hovering pen is over the thumb.                                                                 |
| `data-dragging`           | While this thumb is being dragged.                                                                               |
| `data-disabled`           | When `disabled` is `true`.                                                                                       |
| `data-readonly`           | When `readOnly` is `true`.                                                                                       |
| `data-focused`            | While either axis input contains focus.                                                                          |
| `data-focus-visible`      | While keyboard focus is visible.                                                                                 |
| `data-snapped`            | While the value rests on a snap target.                                                                          |
| `data-snapped-axis`       | `x`, `y`, or `both`: the snapped axes.                                                                           |
| `data-snap-transition`    | `x`, `y`, or `x y`: axes snapping made jump (target changes and grid steps), until they track the pointer again. |

### PlaneAttachment

Positions ordinary UI relative to its nearest parent thumb. `PlaneAttachmentProps` includes native `div` props and Base UI positioning options. It requires a `PlaneThumb` ancestor.

Props for `PlaneAttachment`:

| Prop                 | Type                                                 | Default                            | Description                                                                                                         |
| -------------------- | ---------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `side`               | `Popover.Positioner.Props["side"]`                   | `'right'`                          | Preferred side of the parent thumb. Collision handling may flip it.                                                 |
| `align`              | `Popover.Positioner.Props["align"]`                  | `'center'`                         | Alignment along the selected side.                                                                                  |
| `sideOffset`         | `Popover.Positioner.Props["sideOffset"]`             | `8`                                | Distance from the thumb in pixels.                                                                                  |
| `alignOffset`        | `Popover.Positioner.Props["alignOffset"]`            | `0`                                | Offset along the alignment axis in pixels.                                                                          |
| `collisionBoundary`  | `Popover.Positioner.Props["collisionBoundary"]`      | `clipping ancestors`               | Boundary used to detect collisions with the attachment.                                                             |
| `collisionPadding`   | `Popover.Positioner.Props["collisionPadding"]`       | `8`                                | Space to preserve inside the collision boundary.                                                                    |
| `collisionAvoidance` | `Popover.Positioner.Props["collisionAvoidance"]`     | `{ side: 'flip', align: 'shift' }` | Controls how placement responds to collisions.                                                                      |
| `positionMethod`     | `Popover.Positioner.Props["positionMethod"]`         | `'absolute'`                       | CSS positioning method for the attachment.                                                                          |
| `portal`             | `boolean \| undefined`                               | `true`                             | Portals the attachment so it can escape plane clipping.                                                             |
| `container`          | `Popover.Portal.Props["container"]`                  | `document.body`                    | Portal destination. Only applies when portal is true.                                                               |
| `visibility`         | `'always' \| 'hover' \| 'focus-within' \| undefined` | `'always'`                         | Shows continuously, while hovered or focused within, or only while focused within. Includes the attachment content. |

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
| `PlaneValueChangeDetails`      | Interaction, reason, snap hit, optional thumb ID, and optional native event.                           |
| `PlaneSnapTarget`              | A `grid`, `line`, `point`, or `custom` snap target.                                                    |
| `PlaneSnapHit`                 | `{ target; index; axes; parts? }`: the targets that produced a value and the snapped axes.             |
| `PlaneSnapChangeDetails`       | `{ interaction; reason; thumbId?; event? }` for `onSnapChange`. `interaction` may be `'programmatic'`. |
| `PlaneSnapHitPart`             | `{ target; index; axes }`: one applied target in `PlaneSnapHit.parts`.                                 |
| `PlaneMotionReason`            | `'drag' \| 'snap' \| 'keyboard' \| 'programmatic'`.                                                    |
| `PlaneAxisLock`                | `'x' \| 'y' \| 'dominant-with-shift'`.                                                                 |
| `PlaneSnapBypass`              | `'alt' \| 'meta' \| false`.                                                                            |
| `PlaneMotion`                  | `{ step(current, target, dtMs, { reason }): { value; done }; smoothDrag? }`: presentation-only motion. |
| `PlaneSnapProps`               | `snap`, `snapRadius`, `axisLock`, `snapBypass`, `motion`, and `onSnapChange`, shared by both parts.    |
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
