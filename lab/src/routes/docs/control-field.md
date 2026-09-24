# Control Field

The numeric input primitive for Control Kit, built on Base UI Field and Number Field. Control Field keeps Base UI's number-field semantics and adds modifier-aware keyboard stepping, arithmetic expressions, precise pointer scrubbing, and clamp, wrap, or free bounds. For a ready-made compact input, use the [Control Input](/docs/input-primitive) preset.

<!-- demo:basic -->

## Installation

### Manual

1. Install Control Kit and its peer dependencies:

   ```bash
   pnpm add --allow-build=control-kit control-kit@github:pbroom/control-kit @base-ui/react
   ```

2. Add the package source to Tailwind's content graph:

   ```css
   @source '../node_modules/control-kit/src';
   ```

3. Import `ControlField` from `control-kit` as shown below.

## Usage

The default composition is a compact value surface with a leading scrub handle and no stepper buttons, visible label, or description:

```tsx
import { ControlField } from 'control-kit';

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

`onValueChange` fires for every change, including each parseable keystroke, so previews can follow typing. `onValueCommitted` fires once per finished edit: Enter or blur after typing, each keyboard step, an expression, a stepper press, or a scrub release. Put expensive work, history entries, and network requests in `onValueCommitted`. `getControlFieldInteraction(details)` maps either callback's details to `'text-input'`, `'keyboard'`, or `'pointer'`.

Escape restores the last committed value. Set `commitOnBlur={false}` to make blur behave like Escape. `onInvalidCommit` reports text that cannot be committed.

## Examples

### Expressions

Expression drafts remain editable until Enter or blur. Escape restores the committed number. The built-in resolver supports `+`, `-`, `*`, `/`, `^`, parentheses, and `current`, `value`, or `x` as references to the current value.

<!-- demo:expression -->

Pass `expressionResolver={null}` to keep Base UI's numeric-only input, or supply a resolver for domain syntax such as units or design tokens.

### Step sizes and boundaries

Set `smallStep`, `step`, `largeStep`, and `pageStep` to give precision modifiers and Page keys meaningful increments. Alt/Option uses `smallStep` and Shift uses `largeStep` for arrow keys and scrubbing alike. Use `boundaryBehavior="wrap"` for cyclic values such as angles, or `"free"` to let values leave the range while `min` and `max` still describe it. Set `arrowKeys="both"` to also step with Left and Right.

<!-- demo:stepping -->

### Formatting and affixes

Use `precision` (with `trimTrailingZeros`) for fixed fraction digits, or Base UI's `format` and `locale` props for locale-aware display. Display rounding never changes a controlled, stepped, or scrubbed value, so fine steps accumulate even when the display shows fewer digits. Compose `ControlField.Affix` when a short unit should occupy a fixed position in the control.

<!-- demo:formatting -->

### Stepper buttons

Add `ControlField.Decrement` and `ControlField.Increment` only where persistent step controls are useful. The default compact composition omits them.

<!-- demo:steppers -->

### Field composition and states

Wrap Control Field in Base UI `Field.Root` to add a visible label, description, and validation message. Native `disabled`, `readOnly`, and `required` behavior passes through the root.

<!-- demo:states -->

## API reference

### ControlField.Root

Groups every part and owns the value, number formatting, stepping, form state, expression handling, and boundary policy.

<!-- props:control-field-root -->

When `boundaryBehavior="wrap"`, Control Field normalizes changes itself and omits native `min` and `max` constraints from Base UI so stepping and scrubbing can cross the boundary. With `"free"`, `min` and `max` remain on the form input. The root sets `data-scrubbing` while a scrub is active and forwards native `div` props and the remaining Base UI Number Field Root contract.

### ControlField.Group

Renders the compact value surface that arranges the scrub area, input, affix, and optional step buttons.

<!-- props:control-field-group -->

The group forwards native `div` props.

### ControlField.ScrubArea

Renders the pointer target used to drag the value. Movement below `threshold` never starts a drag; changing Shift or Alt mid-drag keeps the movement already made; clamped values respond immediately when the drag reverses; and the input's text selection survives the gesture. `onValueCommitted` fires once on release.

<!-- props:control-field-scrub-area -->

The scrub area sets `data-scrubbing`, `data-disabled`, and `data-readonly`, and forwards native `span` props. Pointer lock is off by default; enable `pointerLock` only where unbounded drags are expected.

### ControlField.ScrubAreaCursor

Deprecated. The scrub area no longer renders a virtual cursor, so this part renders nothing. Remove it from compositions; it will be removed in a future release.

<!-- props:control-field-scrub-area-cursor -->

### ControlField.Input

Renders the locale-aware number input and temporarily owns expression drafts when a resolver is enabled.

<!-- props:control-field-input -->

The input forwards native input props and the remaining Base UI Number Field Input contract.

### ControlField.Affix

Renders non-interactive unit or status content next to the input.

<!-- props:control-field-affix -->

The affix forwards native `span` props.

### ControlField.Increment

Renders an optional button that increases the value.

<!-- props:control-field-increment -->

The default child is `+`. The increment part forwards native button props and the remaining Base UI Number Field Increment contract.

### ControlField.Decrement

Renders an optional button that decreases the value.

<!-- props:control-field-decrement -->

The default child is `−`. The decrement part forwards native button props and the remaining Base UI Number Field Decrement contract.

### ControlField.Label

Renders an optional visible label when Control Field participates in a Base UI Field composition.

<!-- props:control-field-label -->

The label forwards native label props and the remaining Base UI Field Label contract.

### ControlField.Description

Renders optional guidance associated with the field.

<!-- props:control-field-description -->

The description forwards native paragraph props and the remaining Base UI Field Description contract.

### ControlField.Error

Renders an optional error message when the field matches the requested validity state.

<!-- props:control-field-error -->

The error forwards native `div` props and the remaining Base UI Field Error contract.

See the [Base UI Number Field API](https://base-ui.com/react/components/number-field#api-reference) and [Field API](https://base-ui.com/react/components/field#api-reference) for the complete upstream contracts.

## Accessibility

The input keeps Base UI Number Field semantics: a text input described as a number field, with Base UI owning validation, form serialization, and disabled and read-only behavior. Give `ControlField.Input` an accessible name directly when the compact control stands alone. Use `ControlField.Label` inside a Base UI `Field.Root` when a visible label is part of the composition.

Up and Down Arrow step by `step`; Alt/Option uses `smallStep` and Shift uses `largeStep`. Page Up and Page Down use `pageStep`; Home and End move to finite bounds. Left and Right keep caret behavior unless `arrowKeys="both"`. Enter commits typed text in place and Escape restores the last committed value. Expressions use the same text input and commit model rather than creating a second focus target. The scrub area is a pointer affordance; every value operation remains available from the input.

## Presets and migration

[`ControlInput`](/docs/input-primitive) composes Root, Group, ScrubArea, Input, and Affix into a compact input with sizes, density, a unit, and a scrub handle. `MultiInputControl` arranges several Control Inputs in one row. `PrimitiveValueInput` is deprecated and now renders `ControlInput`; see the migration table on the Control Input page.

## Source

[Implementation](https://github.com/pbroom/control-kit/blob/main/src/control-field.tsx) · [Expression resolver](https://github.com/pbroom/control-kit/blob/main/src/control-field-expression.ts) · [Tests](https://github.com/pbroom/control-kit/blob/main/__tests__/control-field.test.tsx) · [Base UI Number Field](https://base-ui.com/react/components/number-field) · [Issues](https://github.com/pbroom/control-kit/issues)
