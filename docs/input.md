# Control Input

A compact numeric input preset built from [Control Field](./control-field.md) parts. It adds width presets, density, an optional unit, and a scrub handle to Control Field's keyboard stepping, expressions, and precise scrubbing. Every prop is optional.

Example: Control input

```tsx
import { useState } from 'react';
import { ControlInput } from '@pbroom/control-kit';

export function ControlInputExample() {
  const [value, setValue] = useState<number | null>(42);

  return (
    <div className="flex min-h-[320px] items-center justify-center p-8">
      <ControlInput
        label="Opacity"
        value={value}
        onValueChange={setValue}
        min={0}
        max={100}
        precision={1}
        selectOnFocus
        handle="V"
        unit="%"
        size="sm"
      />
    </div>
  );
}
```

## Anatomy

`ControlInput` composes `ControlField.Root`, `Group`, `ScrubArea`, `Input`, and `Affix`:

```tsx
import { ControlInput } from '@pbroom/control-kit';

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

Props for `ControlInput`:

| Prop                   | Type                                                                       | Default                         | Description                                                                           |
| ---------------------- | -------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------- |
| `value`                | `number \| null \| undefined`                                              | —                               | The controlled numeric value.                                                         |
| `defaultValue`         | `number \| null \| undefined`                                              | `null`                          | The initial value when the input is uncontrolled.                                     |
| `onValueChange`        | `(value: number \| null, details: ControlFieldValueChangeDetails) => void` | —                               | Called for every value change, including each parseable keystroke.                    |
| `onValueCommitted`     | `(value: number \| null, details: ControlFieldValueCommitDetails) => void` | —                               | Called once per finished edit: a text commit, key step, expression, or scrub release. |
| `label`                | `string \| undefined`                                                      | —                               | Accessible name for the text input.                                                   |
| `placeholder`          | `string \| undefined`                                                      | —                               | Placeholder text shown when the value is empty.                                       |
| `min`                  | `number \| undefined`                                                      | —                               | The minimum value.                                                                    |
| `max`                  | `number \| undefined`                                                      | —                               | The maximum value.                                                                    |
| `boundaryBehavior`     | `'clamp' \| 'wrap' \| 'free' \| undefined`                                 | `'clamp'`                       | Clamps, wraps, or frees values relative to min and max.                               |
| `step`                 | `number \| 'any' \| undefined`                                             | `1`                             | Arrow-key and scrub step.                                                             |
| `smallStep`            | `number \| undefined`                                                      | `0.1`                           | Step while Alt/Option is held.                                                        |
| `largeStep`            | `number \| undefined`                                                      | `10`                            | Step while Shift is held.                                                             |
| `pageStep`             | `number \| undefined`                                                      | `largeStep`                     | Page Up and Page Down step.                                                           |
| `precision`            | `number \| undefined`                                                      | —                               | Fraction digits shown when format is not set. Values keep full precision.             |
| `expressionResolver`   | `ControlFieldExpressionResolver \| null \| undefined`                      | `resolveControlFieldExpression` | Resolves expression drafts. Set to null for numeric-only entry.                       |
| `selectOnFocus`        | `boolean \| undefined`                                                     | `false`                         | Selects the text when the input receives focus.                                       |
| `size`                 | `'sm' \| 'md' \| 'lg' \| 'full' \| undefined`                              | `'full'`                        | Sets the width preset.                                                                |
| `density`              | `'compact' \| 'comfortable' \| undefined`                                  | `'compact'`                     | Sets the height and text density.                                                     |
| `variant`              | `'default' \| 'embedded' \| undefined`                                     | `'default'`                     | Embedded drops the rounded border for use inside another surface.                     |
| `unit`                 | `ReactNode`                                                                | —                               | Non-interactive unit or suffix rendered after the text.                               |
| `handle`               | `ReactNode`                                                                | —                               | Scrub handle content. Without content the handle is a thin edge strip.                |
| `handleSide`           | `'leading' \| 'trailing' \| undefined`                                     | `'leading'`                     | Places the scrub handle before or after the input.                                    |
| `handleWidth`          | `number \| undefined`                                                      | `24`                            | Width in pixels of a handle with content.                                             |
| `scrub`                | `boolean \| undefined`                                                     | `true`                          | Renders the scrub handle.                                                             |
| `pixelsPerStep`        | `number \| undefined`                                                      | `1`                             | Pointer pixels per step while scrubbing.                                              |
| `stepDistance`         | `number \| undefined`                                                      | —                               | Scrub in whole steps, one per stepDistance pixels.                                    |
| `scrubThreshold`       | `number \| undefined`                                                      | `1`                             | Pointer pixels before a scrub starts.                                                 |
| `scrubCommitThreshold` | `number \| undefined`                                                      | `0`                             | Minimum value change between updates while scrubbing.                                 |
| `scrubMaxCommitRate`   | `number \| undefined`                                                      | —                               | Maximum updates per second while scrubbing.                                           |
| `pointerLock`          | `boolean \| undefined`                                                     | `false`                         | Locks the pointer while scrubbing.                                                    |
| `onScrubbingChange`    | `((isScrubbing: boolean) => void) \| undefined`                            | —                               | Reports when scrubbing starts and ends.                                               |
| `invalid`              | `boolean \| undefined`                                                     | `false`                         | Forces the invalid border and aria-invalid.                                           |
| `inputProps`           | `ControlFieldInputProps \| undefined`                                      | —                               | Props for the text input, such as inputMode or key handlers.                          |

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
