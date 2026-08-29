# Control Field

A composable value control built on Base UI Field and Number Field. Control Field keeps native number-field behavior while adding arithmetic expressions, Page stepping, and optional cyclic bounds.

<!-- demo:basic -->

## Usage

Compose the semantic field wrapper from Base UI with Control Field's number-field parts:

```tsx
import { Field } from '@base-ui/react/field';
import { ControlField } from '@color-kit/control-kit';

<Field.Root>
  <ControlField.Root value={value} onValueChange={setValue} min={0} max={100}>
    <ControlField.ScrubArea>
      <ControlField.Label>Opacity</ControlField.Label>
      <ControlField.ScrubAreaCursor />
    </ControlField.ScrubArea>
    <ControlField.Group>
      <ControlField.Decrement aria-label="Decrease opacity" />
      <ControlField.Input />
      <ControlField.Increment aria-label="Increase opacity" />
    </ControlField.Group>
  </ControlField.Root>
</Field.Root>;
```

## Composition

- Base UI `Field.Root` owns labeling, description, validation, and error state.
- `ControlField.Root` owns the numeric value, stepping, formatting, form value, and Control Kit additions.
- `ControlField.ScrubArea` turns its contents into the drag target. Put the label here when the label should also scrub.
- `ControlField.Group` arranges the editable input with optional decrement and increment buttons.
- `ControlField.Input` keeps ordinary locale-aware number entry in Base UI and switches to an expression draft only when expression syntax is entered.

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
| `ControlField.Increment`, `ControlField.Decrement` | Native button props, `render`, and Base UI state-based `className`                                                                                                                                            |

The wrapper forwards the corresponding Base UI props unless Control Kit documents an addition above. See the [Base UI Number Field API](https://base-ui.com/react/components/number-field#api-reference) and [Field API](https://base-ui.com/react/components/field#api-reference) for the complete upstream contracts.

## Accessibility

Base UI owns field association, keyboard stepping, validation, form serialization, disabled and read-only behavior, and scrub semantics. Keep a visible `ControlField.Label` inside a Base UI `Field.Root`. Page Up and Page Down use `pageStep`; Home and End move to finite bounds. Expressions use the same text input and commit model rather than creating a second focus target.

## Legacy input

`PrimitiveValueInput` remains available while Control Field is evaluated. New work should prefer Control Field unless it depends on the legacy component's custom scrub publication policy, pointer-lock opt-out, or monolithic visual props.

## Source

[Implementation](https://github.com/pbroom/control-kit/blob/main/src/control-field.tsx) · [Expression resolver](https://github.com/pbroom/control-kit/blob/main/src/control-field-expression.ts) · [Tests](https://github.com/pbroom/control-kit/blob/main/__tests__/control-field.test.tsx) · [Base UI Number Field](https://base-ui.com/react/components/number-field) · [Issues](https://github.com/pbroom/control-kit/issues)
