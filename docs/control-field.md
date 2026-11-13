# Control Field

The numeric input primitive for Control Kit, built on Base UI Field and Number Field. Control Field keeps Base UI's number-field semantics and adds modifier-aware keyboard stepping, arithmetic expressions, precise pointer scrubbing, and clamp, wrap, or free bounds. For a ready-made compact input, use the [Control Input](./input.md) preset.

Example: Control Field

```tsx
import { useState } from 'react';
import { ControlField } from '@pbroom/control-kit';

export function ControlFieldBasicExample() {
  const [value, setValue] = useState<number | null>(42);

  return (
    <div className="flex min-h-[320px] items-center justify-center p-8">
      <ControlField.Root
        className="w-32"
        format={{ maximumFractionDigits: 2 }}
        max={100}
        min={0}
        onValueChange={setValue}
        value={value}
      >
        <ControlField.Group>
          <ControlField.ScrubArea>
            <span aria-hidden="true">V</span>
          </ControlField.ScrubArea>
          <ControlField.Input aria-label="Opacity" />
          <ControlField.Affix aria-hidden="true">%</ControlField.Affix>
        </ControlField.Group>
      </ControlField.Root>
    </div>
  );
}
```

## Installation

### Manual

1. Install Control Kit and its peer dependencies:

   ```bash
   pnpm add @pbroom/control-kit@next @base-ui/react
   ```

   To track unreleased changes, install from the GitHub repository instead. The `--allow-build` flag (pnpm 10) lets the Git install run the `prepare` build:

   ```bash
   pnpm add --allow-build=@pbroom/control-kit @pbroom/control-kit@github:pbroom/control-kit @base-ui/react
   ```

2. Add the package source to Tailwind's content graph:

   ```css
   @source '../node_modules/@pbroom/control-kit/src';
   ```

3. Import `ControlField` from `@pbroom/control-kit` as shown below.

## Usage

The default composition is a compact value surface with a leading scrub handle and no stepper buttons, visible label, or description:

```tsx
import { ControlField } from '@pbroom/control-kit';

<ControlField.Root
  className="w-32"
  value={value}
  onValueChange={setValue}
  min={0}
  max={100}
>
  <ControlField.Group>
    <ControlField.ScrubArea>
      <span aria-hidden="true">V</span>
    </ControlField.ScrubArea>
    <ControlField.Input aria-label="Opacity" />
    <ControlField.Affix aria-hidden="true">%</ControlField.Affix>
  </ControlField.Group>
</ControlField.Root>;
```

## Composition

- `ControlField.Root` owns the numeric value, stepping, formatting, form value, and Control Kit additions.
- `ControlField.Group` is the compact value surface.
- `ControlField.ScrubArea` is the leading drag target. Replace `V` with a property marker or icon when useful.
- `ControlField.Input` keeps ordinary locale-aware number entry in Base UI and switches to an expression draft only when expression syntax is entered.
- `ControlField.Affix` renders optional non-interactive unit or status content.
- `ControlField.Increment`, `ControlField.Decrement`, `ControlField.Label`, and `ControlField.Description` are optional composition parts rather than default anatomy.

Wrap the control in Base UI `Field.Root` when the interface needs a visible label, description, validation, or error message.

### Changes and commits

`onValueChange` fires for every change, including each parseable keystroke, so previews can follow typing. `onValueCommitted` fires once per finished edit: Enter or blur after typing, each keyboard step, an expression, a stepper press, or a scrub release. Put expensive work, history entries, and network requests in `onValueCommitted`. `getControlFieldInteraction(details)` maps either callback's details to `'text-input'`, `'keyboard'`, or `'pointer'`; Enter commits of typed text use the `'input-commit'` reason and count as text input.

Escape restores the last committed value, or a newer value the parent set while the field was focused. Set `commitOnBlur={false}` to make blur behave like Escape. `onInvalidCommit` reports text that cannot be committed.

## Examples

### Expressions

Expression drafts remain editable until Enter or blur. Escape restores the committed number. The built-in resolver supports `+`, `-`, `*`, `/`, `^`, parentheses, and `current`, `value`, or `x` as references to the current value.

Example: Control Field expressions

```tsx
import { useState } from 'react';
import { ControlField } from '@pbroom/control-kit';

export function ControlFieldExpressionExample() {
  const [value, setValue] = useState<number | null>(12);

  return (
    <div className="flex min-h-[320px] items-center justify-center p-8">
      <ControlField.Root
        className="w-32"
        onValueChange={setValue}
        value={value}
      >
        <ControlField.Group>
          <ControlField.ScrubArea>
            <span aria-hidden="true">V</span>
          </ControlField.ScrubArea>
          <ControlField.Input aria-label="Spacing" />
        </ControlField.Group>
      </ControlField.Root>
    </div>
  );
}
```

Pass `expressionResolver={null}` to keep Base UI's numeric-only input, or supply a resolver for domain syntax such as units or design tokens.

### Step sizes and boundaries

Set `smallStep`, `step`, `largeStep`, and `pageStep` to give precision modifiers and Page keys meaningful increments. Alt/Option uses `smallStep` and Shift uses `largeStep` for arrow keys and scrubbing alike. Use `boundaryBehavior="wrap"` for cyclic values such as angles, or `"free"` to let values leave the range while `min` and `max` still describe it. Set `arrowKeys="both"` to also step with Left and Right.

Example: Control Field stepping and bounds

```tsx
import { ControlField } from '@pbroom/control-kit';

export function ControlFieldSteppingExample() {
  return (
    <div className="flex min-h-[320px] flex-wrap items-center justify-center gap-8 p-8">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-white">Fine stepping</span>
        <ControlField.Root
          className="w-32"
          defaultValue={1}
          largeStep={1}
          pageStep={10}
          smallStep={0.01}
          step={0.1}
        >
          <ControlField.Group>
            <ControlField.ScrubArea>
              <span aria-hidden="true">V</span>
            </ControlField.ScrubArea>
            <ControlField.Input aria-label="Fine-stepped value" />
          </ControlField.Group>
        </ControlField.Root>
        <span className="max-w-40 text-xs text-white/55">
          Alt steps by 0.01, Shift by 1, and Page Up or Down by 10.
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-white">Wrapping angle</span>
        <ControlField.Root
          boundaryBehavior="wrap"
          className="w-32"
          defaultValue={350}
          max={360}
          min={0}
          pageStep={90}
          step={10}
        >
          <ControlField.Group>
            <ControlField.ScrubArea>
              <span aria-hidden="true">V</span>
            </ControlField.ScrubArea>
            <ControlField.Input aria-label="Angle" />
            <ControlField.Affix aria-hidden="true">°</ControlField.Affix>
          </ControlField.Group>
        </ControlField.Root>
        <span className="max-w-40 text-xs text-white/55">
          Stepping past either bound continues from the opposite edge.
        </span>
      </div>
    </div>
  );
}
```

### Formatting and affixes

Use `precision` (with `trimTrailingZeros`) for fixed fraction digits, or Base UI's `format` and `locale` props for locale-aware display. Display rounding never changes a controlled, stepped, or scrubbed value, so fine steps accumulate even when the display shows fewer digits. Compose `ControlField.Affix` when a short unit should occupy a fixed position in the control.

Example: Formatted Control Fields

```tsx
import { ControlField } from '@pbroom/control-kit';

export function ControlFieldFormattingExample() {
  return (
    <div className="flex min-h-[320px] flex-wrap items-center justify-center gap-6 p-8">
      <ControlField.Root
        className="w-36"
        defaultValue={1250}
        format={{ currency: 'USD', style: 'currency' }}
        locale="en-US"
      >
        <ControlField.Group>
          <ControlField.ScrubArea>
            <span aria-hidden="true">V</span>
          </ControlField.ScrubArea>
          <ControlField.Input aria-label="Price" />
        </ControlField.Group>
      </ControlField.Root>

      <ControlField.Root
        className="w-32"
        defaultValue={16}
        format={{ maximumFractionDigits: 2 }}
        min={0}
        step={0.25}
      >
        <ControlField.Group>
          <ControlField.ScrubArea>
            <span aria-hidden="true">V</span>
          </ControlField.ScrubArea>
          <ControlField.Input aria-label="Spacing" />
          <ControlField.Affix aria-hidden="true">px</ControlField.Affix>
        </ControlField.Group>
      </ControlField.Root>
    </div>
  );
}
```

### Stepper buttons

Add `ControlField.Decrement` and `ControlField.Increment` only where persistent step controls are useful. The default compact composition omits them.

Example: Control Field stepper buttons

```tsx
import { ControlField } from '@pbroom/control-kit';

export function ControlFieldSteppersExample() {
  return (
    <div className="flex min-h-[320px] items-center justify-center p-8">
      <ControlField.Root className="w-40" defaultValue={8} max={24} min={0}>
        <ControlField.Group>
          <ControlField.Decrement aria-label="Decrease columns" />
          <ControlField.Input aria-label="Columns" />
          <ControlField.Increment aria-label="Increase columns" />
        </ControlField.Group>
      </ControlField.Root>
    </div>
  );
}
```

### Field composition and states

Wrap Control Field in Base UI `Field.Root` to add a visible label, description, and validation message. Native `disabled`, `readOnly`, and `required` behavior passes through the root.

Example: Control Field states and field composition

```tsx
import { Field } from '@base-ui/react/field';
import { ControlField } from '@pbroom/control-kit';

export function ControlFieldStatesExample() {
  return (
    <div className="flex min-h-[320px] flex-wrap items-start justify-center gap-8 p-8">
      <Field.Root className="flex w-40 flex-col gap-2">
        <ControlField.Label className="text-sm font-medium text-white">
          Rotation
        </ControlField.Label>
        <ControlField.Root defaultValue={45} max={360} min={0} required>
          <ControlField.Group>
            <ControlField.ScrubArea>
              <span aria-hidden="true">V</span>
            </ControlField.ScrubArea>
            <ControlField.Input />
            <ControlField.Affix aria-hidden="true">°</ControlField.Affix>
          </ControlField.Group>
        </ControlField.Root>
        <ControlField.Description>
          Enter an angle from 0 to 360 degrees.
        </ControlField.Description>
        <ControlField.Error match="valueMissing">
          Enter a rotation.
        </ControlField.Error>
      </Field.Root>

      <div className="flex w-32 flex-col gap-3">
        <ControlField.Root defaultValue={50} disabled>
          <ControlField.Group>
            <ControlField.ScrubArea>
              <span aria-hidden="true">V</span>
            </ControlField.ScrubArea>
            <ControlField.Input aria-label="Disabled value" />
          </ControlField.Group>
        </ControlField.Root>
        <ControlField.Root defaultValue={50} readOnly>
          <ControlField.Group>
            <ControlField.ScrubArea>
              <span aria-hidden="true">V</span>
            </ControlField.ScrubArea>
            <ControlField.Input aria-label="Read-only value" />
          </ControlField.Group>
        </ControlField.Root>
      </div>
    </div>
  );
}
```

## API reference

### ControlField.Root

Groups every part and owns the value, number formatting, stepping, form state, expression handling, and boundary policy.

Props for `ControlField.Root`:

| Prop                 | Type                                                                       | Default                         | Description                                                                                                                                                     |
| -------------------- | -------------------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`              | `number \| null \| undefined`                                              | —                               | The controlled numeric value.                                                                                                                                   |
| `defaultValue`       | `number \| null \| undefined`                                              | `null`                          | The initial value when the field is uncontrolled.                                                                                                               |
| `onValueChange`      | `(value: number \| null, details: ControlFieldValueChangeDetails) => void` | —                               | Called for every value change, including each parseable keystroke. Put expensive work in onValueCommitted.                                                      |
| `onValueCommitted`   | `(value: number \| null, details: ControlFieldValueCommitDetails) => void` | —                               | Called once per committed edit: Enter or blur after typing, each key step, an expression, a button press, or a scrub release.                                   |
| `onInvalidCommit`    | `(text: string, details: ControlFieldInvalidCommitDetails) => void`        | —                               | Called when Enter or blur tries to commit text that does not parse. Enter keeps the draft editable; blur restores the value.                                    |
| `expressionResolver` | `ControlFieldExpressionResolver \| null \| undefined`                      | `resolveControlFieldExpression` | Resolves a non-numeric draft. Receives the current value, the last committed value (startValue), and the range. Set to null for numeric-only entry.             |
| `pageStep`           | `number \| undefined`                                                      | `largeStep`                     | The amount added or removed by Page Up and Page Down.                                                                                                           |
| `boundaryBehavior`   | `'clamp' \| 'wrap' \| 'free' \| undefined`                                 | `'clamp'`                       | Clamps changes to the bounds, cycles them across the range, or lets typed, keyboard, and scrub values leave the range while min and max still describe it.      |
| `precision`          | `number \| undefined`                                                      | —                               | Fraction digits shown when format is not set. Only the display is rounded; values keep full precision.                                                          |
| `trimTrailingZeros`  | `boolean \| undefined`                                                     | `true`                          | Drops trailing zeros from the precision-derived format.                                                                                                         |
| `selectOnFocus`      | `boolean \| undefined`                                                     | `false`                         | Selects the input text when it receives focus.                                                                                                                  |
| `commitOnBlur`       | `boolean \| undefined`                                                     | `true`                          | Commits typed text on blur. When false, blur restores the last committed value.                                                                                 |
| `arrowKeys`          | `'vertical' \| 'both' \| undefined`                                        | `'vertical'`                    | Steps with Up and Down only, or also with Right and Left. Vertical keeps horizontal arrows for the caret.                                                       |
| `min`                | `number \| undefined`                                                      | —                               | The minimum value and lower validation bound.                                                                                                                   |
| `max`                | `number \| undefined`                                                      | —                               | The maximum value and upper validation bound.                                                                                                                   |
| `step`               | `number \| 'any' \| undefined`                                             | `1`                             | The amount used by ordinary stepping and scrubbing.                                                                                                             |
| `smallStep`          | `number \| undefined`                                                      | `0.1`                           | The amount used while Alt is held during a step interaction.                                                                                                    |
| `largeStep`          | `number \| undefined`                                                      | `10`                            | The amount used while Shift is held during a step interaction.                                                                                                  |
| `format`             | `Intl.NumberFormatOptions \| undefined`                                    | —                               | Formats the value displayed by the input. Overrides precision. Rounding options round typed values on commit but never controlled, stepped, or scrubbed values. |
| `locale`             | `Intl.LocalesArgument \| undefined`                                        | —                               | Sets number parsing and formatting locale. Defaults to the user's runtime locale.                                                                               |
| `allowWheelScrub`    | `boolean \| undefined`                                                     | `false`                         | Allows wheel scrubbing while the focused input is hovered.                                                                                                      |
| `snapOnStep`         | `boolean \| undefined`                                                     | `false`                         | Snaps stepped values to the nearest step multiple.                                                                                                              |

When `boundaryBehavior="wrap"`, Control Field normalizes changes itself and omits native `min` and `max` constraints from Base UI so stepping and scrubbing can cross the boundary. With `"free"`, `min` and `max` remain on the form input. The root sets `data-scrubbing` while a scrub is active and forwards native `div` props and the remaining Base UI Number Field Root contract.

### ControlField.Group

Renders the compact value surface that arranges the scrub area, input, affix, and optional step buttons.

Props for `ControlField.Group`:

| Prop        | Type                                                                               | Default | Description                                                |
| ----------- | ---------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------- |
| `className` | `string \| ((state: NumberField.Group.State) => string \| undefined) \| undefined` | —       | Adds classes to the compact value surface.                 |
| `render`    | `React.ReactElement \| ((props, state) => React.ReactElement) \| undefined`        | —       | Replaces the rendered div while preserving group behavior. |

The group forwards native `div` props.

### ControlField.ScrubArea

Renders the pointer target used to drag the value. Movement below `threshold` never starts a drag; changing Shift or Alt mid-drag keeps the movement already made; clamped values respond immediately when the drag reverses; and the input's text selection survives the gesture. `onValueCommitted` fires once on release.

Props for `ControlField.ScrubArea`:

| Prop                | Type                                                                                  | Default | Description                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `pixelsPerStep`     | `number \| undefined`                                                                 | `1`     | Horizontal pointer pixels per step of movement.                                                                                  |
| `stepDistance`      | `number \| undefined`                                                                 | —       | Moves in whole steps, one per stepDistance pixels. Overrides pixelsPerStep.                                                      |
| `threshold`         | `number \| undefined`                                                                 | `1`     | Pointer pixels required before scrubbing starts.                                                                                 |
| `commitThreshold`   | `number \| undefined`                                                                 | `0`     | Minimum value change between onValueChange calls while dragging. The final value is always published on release.                 |
| `maxCommitRate`     | `number \| undefined`                                                                 | —       | Maximum onValueChange calls per second while dragging.                                                                           |
| `pointerLock`       | `boolean \| undefined`                                                                | `false` | Locks the pointer while scrubbing so drags are not limited by the screen edge. Falls back to ordinary tracking when unavailable. |
| `onScrubbingChange` | `((isScrubbing: boolean) => void) \| undefined`                                       | —       | Reports when scrubbing starts and ends.                                                                                          |
| `className`         | `string \| ((state: ControlFieldScrubAreaState) => string \| undefined) \| undefined` | —       | Adds classes to the scrub target.                                                                                                |

The scrub area sets `data-scrubbing`, `data-disabled`, and `data-readonly`, and forwards native `span` props. Pointer lock is off by default; enable `pointerLock` only where unbounded drags are expected.

### ControlField.ScrubAreaCursor

Deprecated. The scrub area no longer renders a virtual cursor, so this part renders nothing. Remove it from compositions; it will be removed in a future release.

Props for `ControlField.ScrubAreaCursor`:

| Prop        | Type                                                                     | Default | Description                                                                              |
| ----------- | ------------------------------------------------------------------------ | ------- | ---------------------------------------------------------------------------------------- |
| `className` | `string \| ((state: ControlFieldScrubAreaState) => string) \| undefined` | —       | Deprecated. The part renders nothing and ignores its props; remove it from compositions. |

### ControlField.Input

Renders the locale-aware number input and temporarily owns expression drafts when a resolver is enabled.

Props for `ControlField.Input`:

| Prop         | Type                                                                               | Default | Description                                                       |
| ------------ | ---------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------- |
| `aria-label` | `string \| undefined`                                                              | —       | Names a standalone compact input without a visible label.         |
| `className`  | `string \| ((state: NumberField.Input.State) => string \| undefined) \| undefined` | —       | Adds classes to the input.                                        |
| `render`     | `React.ReactElement \| ((props, state) => React.ReactElement) \| undefined`        | —       | Replaces the native input while preserving number-field behavior. |

The input forwards native input props and the remaining Base UI Number Field Input contract.

### ControlField.Affix

Renders non-interactive unit or status content next to the input.

Props for `ControlField.Affix`:

| Prop        | Type                  | Default | Description                              |
| ----------- | --------------------- | ------- | ---------------------------------------- |
| `children`  | `React.ReactNode`     | —       | Renders optional unit or status content. |
| `className` | `string \| undefined` | —       | Adds classes to the rendered span.       |

The affix forwards native `span` props.

### ControlField.Increment

Renders an optional button that increases the value.

Props for `ControlField.Increment`:

| Prop        | Type                                                                              | Default | Description                                                |
| ----------- | --------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------- |
| `disabled`  | `boolean \| undefined`                                                            | `false` | Prevents the button from changing the value.               |
| `className` | `string \| ((state: NumberField.Root.State) => string \| undefined) \| undefined` | —       | Adds classes to the rendered button.                       |
| `render`    | `React.ReactElement \| ((props, state) => React.ReactElement) \| undefined`       | —       | Replaces the native button while preserving step behavior. |

The default child is `+`. The increment part forwards native button props and the remaining Base UI Number Field Increment contract.

### ControlField.Decrement

Renders an optional button that decreases the value.

Props for `ControlField.Decrement`:

| Prop        | Type                                                                              | Default | Description                                                |
| ----------- | --------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------- |
| `disabled`  | `boolean \| undefined`                                                            | `false` | Prevents the button from changing the value.               |
| `className` | `string \| ((state: NumberField.Root.State) => string \| undefined) \| undefined` | —       | Adds classes to the rendered button.                       |
| `render`    | `React.ReactElement \| ((props, state) => React.ReactElement) \| undefined`       | —       | Replaces the native button while preserving step behavior. |

The default child is `−`. The decrement part forwards native button props and the remaining Base UI Number Field Decrement contract.

### ControlField.Label

Renders an optional visible label when Control Field participates in a Base UI Field composition.

Props for `ControlField.Label`:

| Prop          | Type                                                                        | Default | Description                                                           |
| ------------- | --------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------- |
| `children`    | `React.ReactNode`                                                           | —       | Renders the visible field label.                                      |
| `nativeLabel` | `boolean \| undefined`                                                      | `true`  | Keeps native label behavior when the element is replaced with render. |
| `render`      | `React.ReactElement \| ((props, state) => React.ReactElement) \| undefined` | —       | Replaces the rendered label while preserving field association.       |

The label forwards native label props and the remaining Base UI Field Label contract.

### ControlField.Description

Renders optional guidance associated with the field.

Props for `ControlField.Description`:

| Prop       | Type                                                                        | Default | Description                                                         |
| ---------- | --------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------- |
| `children` | `React.ReactNode`                                                           | —       | Renders supplemental field guidance.                                |
| `render`   | `React.ReactElement \| ((props, state) => React.ReactElement) \| undefined` | —       | Replaces the rendered paragraph while preserving field association. |

The description forwards native paragraph props and the remaining Base UI Field Description contract.

### ControlField.Error

Renders an optional error message when the field matches the requested validity state.

Props for `ControlField.Error`:

| Prop       | Type                                                                        | Default | Description                                                  |
| ---------- | --------------------------------------------------------------------------- | ------- | ------------------------------------------------------------ |
| `children` | `React.ReactNode`                                                           | —       | Renders the validation error message.                        |
| `match`    | `boolean \| keyof ValidityState \| undefined`                               | —       | Controls which validity state displays the error.            |
| `render`   | `React.ReactElement \| ((props, state) => React.ReactElement) \| undefined` | —       | Replaces the rendered div while preserving validation state. |

The error forwards native `div` props and the remaining Base UI Field Error contract.

See the [Base UI Number Field API](https://base-ui.com/react/components/number-field#api-reference) and [Field API](https://base-ui.com/react/components/field#api-reference) for the complete upstream contracts.

## Accessibility

The input keeps Base UI Number Field semantics: a text input described as a number field, with Base UI owning validation, form serialization, and disabled and read-only behavior. Give `ControlField.Input` an accessible name directly when the compact control stands alone. Use `ControlField.Label` inside a Base UI `Field.Root` when a visible label is part of the composition.

Up and Down Arrow step by `step`; Alt/Option uses `smallStep` and Shift uses `largeStep`. Page Up and Page Down use `pageStep`; Home and End move to finite bounds. Left and Right keep caret behavior unless `arrowKeys="both"`. Ctrl- or Cmd-modified keys keep their text-navigation meaning and never change the value. Enter commits typed text in place and Escape restores the last committed value. Expressions use the same text input and commit model rather than creating a second focus target. The scrub area is a pointer affordance; every value operation remains available from the input.

## Presets and migration

[`ControlInput`](./input.md) composes Root, Group, ScrubArea, Input, and Affix into a compact input with sizes, density, a unit, and a scrub handle. `MultiInputControl` arranges several Control Inputs in one row. `PrimitiveValueInput` is deprecated and now renders `ControlInput`; see the migration table on the Control Input page.

## Source

[Implementation](https://github.com/pbroom/control-kit/blob/main/src/control-field.tsx) · [Expression resolver](https://github.com/pbroom/control-kit/blob/main/src/control-field-expression.ts) · [Tests](https://github.com/pbroom/control-kit/blob/main/__tests__/control-field.test.tsx) · [Base UI Number Field](https://base-ui.com/react/components/number-field) · [Issues](https://github.com/pbroom/control-kit/issues)
