# Control Field

A composable value control built on Base UI Field and Number Field. Control Field keeps native number-field behavior while adding arithmetic expressions, Page stepping, and optional cyclic bounds.

<!-- demo:basic -->

## Installation

### Manual

1. Install Control Kit and its peer dependencies:

   ```bash
   pnpm add @color-kit/control-kit @base-ui/react radix-ui
   ```

2. Add the package source to Tailwind's content graph:

   ```css
   @source '../node_modules/@color-kit/control-kit/src';
   ```

3. Import `ControlField` from `@color-kit/control-kit` as shown below.

## Usage

The default composition is a compact value surface with a leading scrub handle and no stepper buttons, visible label, or description:

```tsx
import { ControlField } from '@color-kit/control-kit';

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

## Examples

### Expressions

Expression drafts remain editable until Enter or blur. Escape restores the committed number. The built-in resolver supports `+`, `-`, `*`, `/`, `^`, parentheses, and `current`, `value`, or `x` as references to the current value.

<!-- demo:expression -->

Pass `expressionResolver={null}` to keep Base UI's numeric-only input, or supply a resolver for domain syntax such as units or design tokens.

## API

### Control Kit additions

| Prop                 | Part                | Default                      | Purpose                                                                      |
| -------------------- | ------------------- | ---------------------------- | ---------------------------------------------------------------------------- |
| `expressionResolver` | `ControlField.Root` | Built-in arithmetic resolver | Resolves a non-numeric draft to a number. Use `null` for numeric-only entry. |
| `pageStep`           | `ControlField.Root` | `10`                         | Value added or removed by Page Up and Page Down.                             |
| `boundaryBehavior`   | `ControlField.Root` | `'clamp'`                    | Uses Base UI bounds or cycles stepped values with `'wrap'`.                  |

When `boundaryBehavior="wrap"`, Control Field normalizes changes itself and omits native `min` and `max` constraints from Base UI so stepping and scrubbing can cross the boundary.

### Important forwarded props

| Part                                               | Props                                                                                                                                                                                                         |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ControlField.Root`                                | `value`, `defaultValue`, `onValueChange`, `onValueCommitted`, `min`, `max`, `step`, `smallStep`, `largeStep`, `format`, `locale`, `name`, `disabled`, `readOnly`, `required`, `allowWheelScrub`, `snapOnStep` |
| `ControlField.ScrubArea`                           | `direction`, `pixelSensitivity`, `teleportDistance`, `render`                                                                                                                                                 |
| `ControlField.Input`                               | Native input props, `render`, and Base UI state-based `className`                                                                                                                                             |
| `ControlField.Affix`                               | Native `span` props                                                                                                                                                                                           |
| `ControlField.Increment`, `ControlField.Decrement` | Native button props, `render`, and Base UI state-based `className`                                                                                                                                            |

The wrapper forwards the corresponding Base UI props unless Control Kit documents an addition above. See the [Base UI Number Field API](https://base-ui.com/react/components/number-field#api-reference) and [Field API](https://base-ui.com/react/components/field#api-reference) for the complete upstream contracts.

## Accessibility

Base UI owns keyboard stepping, validation, form serialization, disabled and read-only behavior, and scrub semantics. Give `ControlField.Input` an accessible name directly when the compact control stands alone. Use `ControlField.Label` inside a Base UI `Field.Root` when a visible label is part of the composition. Page Up and Page Down use `pageStep`; Home and End move to finite bounds. Expressions use the same text input and commit model rather than creating a second focus target.

## Legacy input

`PrimitiveValueInput` remains available while Control Field is evaluated. New work should prefer Control Field unless it depends on the legacy component's custom scrub publication policy, pointer-lock opt-out, or monolithic visual props.

## Source

[Implementation](https://github.com/pbroom/control-kit/blob/main/src/control-field.tsx) · [Expression resolver](https://github.com/pbroom/control-kit/blob/main/src/control-field-expression.ts) · [Tests](https://github.com/pbroom/control-kit/blob/main/__tests__/control-field.test.tsx) · [Base UI Number Field](https://base-ui.com/react/components/number-field) · [Issues](https://github.com/pbroom/control-kit/issues)
