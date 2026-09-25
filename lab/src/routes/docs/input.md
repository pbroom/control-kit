# Control Input

A compact numeric input preset built from [Control Field](/docs/control-field) parts. It adds width presets, density, an optional unit, and a scrub handle to Control Field's keyboard stepping, expressions, and precise scrubbing. Every prop is optional.

<!-- demo:basic -->

## Anatomy

`ControlInput` composes `ControlField.Root`, `Group`, `ScrubArea`, `Input`, and `Affix`:

```tsx
import { ControlInput } from 'control-kit';

<ControlInput
  label="Opacity"
  value={value}
  onValueChange={setValue}
  min={0}
  max={100}
  precision={1}
  handle="V"
  unit="%"
/>;
```

Reach for `ControlField` parts directly when a layout needs something the preset does not offer, such as stepper buttons or a visible label.

## Usage guidelines

- `ControlInput` accepts every `ControlField.Root` prop, so value, bounds, stepping, formatting, and expression behavior are configured the same way.
- `onValueChange` fires for every change, including each parseable keystroke, and may pass `null` while the text is empty. Put expensive work in `onValueCommitted`, which fires once per finished edit.
- Use `boundaryBehavior="clamp"` for bounded values, `"wrap"` for cyclic values, and `"free"` for unbounded editing.
- Give the input an accessible name with `label` unless a visible label is associated.

## Editing and commits

Typed text commits on Enter (focus stays in the input) or blur. Escape restores the last committed value, and `commitOnBlur={false}` makes blur behave like Escape. Expressions such as `* 2` or `+ 10` resolve on commit; pass `expressionResolver={null}` for numeric-only entry or a custom resolver for domain syntax.

## Pointer scrubbing

Drag the handle horizontally to scrub. Without `handle` content the scrub target is a thin strip along the handle side; `scrub={false}` removes it. `pixelsPerStep` or `stepDistance` sets movement per step, `scrubThreshold` the distance before a drag starts, and `scrubCommitThreshold` and `scrubMaxCommitRate` throttle updates while dragging. Pointer lock is off by default.

## API reference

### ControlInput

`ControlInputProps` extends `ControlFieldRootProps` with the preset's layout and scrub options.

<!-- props:input -->

**Data attributes**

| Attribute                       | When present                            |
| ------------------------------- | --------------------------------------- |
| `data-slot="control-input"`     | Always on the root.                     |
| `data-variant`                  | Always on the root: the active variant. |
| `data-scrubbing`                | On the root and group while scrubbing.  |
| `data-control-kit-scrub-handle` | Always on the rendered scrub handle.    |

## Accessibility

The input keeps Control Field's Base UI Number Field semantics: a text input described as a number field with its range on the form input. Up and Down Arrow step the value; Alt/Option uses `smallStep`, Shift uses `largeStep`, Page Up and Page Down use `pageStep`, and Home or End move to a finite bound. Left and Right keep caret behavior unless `arrowKeys="both"`.

The scrub handle is pointer-only and hidden from assistive technology; all value operations remain available from the input.

## Migrating from PrimitiveValueInput

`PrimitiveValueInput`, `usePrimitiveValueInput`, and the `*Primitive*` helpers are deprecated and will be removed in a future release. `PrimitiveValueInput` now renders `ControlInput` and keeps its old callback semantics.

| PrimitiveValueInput                       | ControlInput                                      |
| ----------------------------------------- | ------------------------------------------------- |
| `wrapMode`                                | `boundaryBehavior`                                |
| `fineStep` / `coarseStep`                 | `smallStep` / `largeStep`                         |
| `ariaLabel`                               | `label`                                           |
| `autoTrim`                                | `trimTrailingZeros`                               |
| `selectAllOnFocus`                        | `selectOnFocus`                                   |
| `allowExpressions` / `parseExpression`    | `expressionResolver` (`null` disables)            |
| `horizontalArrowKeysMoveCaret={false}`    | `arrowKeys="both"`                                |
| `leadingElement` / `handleElement`        | `handle` with `handleSide`                        |
| `trailingElement`                         | `unit`                                            |
| `handleContentWidth`                      | `handleWidth`                                     |
| `scrubEnabled`                            | `scrub`                                           |
| `scrubPixelsPerStep` / `stepDragDistance` | `pixelsPerStep` / `stepDistance`                  |
| `pointerLockEnabled`                      | `pointerLock` (default `false`)                   |
| `visualTreatment`                         | `variant`                                         |
| `visualState="invalid"`                   | `invalid`                                         |
| `onValueChange(value, { interaction })`   | `onValueCommitted` + `getControlFieldInteraction` |

`role="spinbutton"` is no longer forced; selectors should use the textbox role. An empty draft no longer commits `0`; it reverts.

## Source

[Implementation](https://github.com/pbroom/control-kit/blob/main/src/control-input.tsx) · [Control Field](https://github.com/pbroom/control-kit/blob/main/src/control-field.tsx) · [Tests](https://github.com/pbroom/control-kit/blob/main/__tests__/control-input.test.tsx) · [Issues](https://github.com/pbroom/control-kit/issues)
