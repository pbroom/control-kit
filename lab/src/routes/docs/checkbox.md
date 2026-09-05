# Checkbox

A compact controlled checkbox with an integrated label. Built on [Base UI Checkbox](https://base-ui.com/react/components/checkbox); Control Kit assembles the indicator, icon, label, and visual states into one component.

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

3. Import `Checkbox` from `control-kit` as shown below.

## Usage

Keep the checked value in application state and update it from `onCheckedChange`:

```tsx
import { useState } from 'react';
import { Checkbox } from 'control-kit';

function GridSetting() {
  const [checked, setChecked] = useState(false);

  return (
    <Checkbox checked={checked} onCheckedChange={setChecked}>
      Show grid
    </Checkbox>
  );
}
```

## Composition

Control Kit exports Checkbox as one assembled component rather than exposing Base UI's Root and Indicator separately.

- The root owns checkbox semantics, focus, interaction, and the hidden form input.
- A mounted indicator renders the check icon and exposes checked, unchecked, and disabled states.
- Children render as the checkbox label inside the same interactive root.

Use `className`, `indicatorClassName`, and `labelClassName` as attachment points when a composition needs layout adjustments. The default visual treatment works without additional classes.

## Examples

### Attachment points

Use `className`, `indicatorClassName`, and `labelClassName` to adapt the assembled checkbox without replacing its parts.

<!-- demo:styling -->

### States

The same component covers checked, unchecked, and disabled states. A disabled checkbox ignores interaction and receives the corresponding Base UI data attribute.

<!-- demo:states -->

### Option group

Use a `fieldset` and `legend` when several checkboxes describe one set of options. Each checkbox still owns its own controlled value.

<!-- demo:group -->

## API reference

### Checkbox

Renders a Base UI Checkbox root with an integrated indicator and optional label. `CheckboxProps` includes the corresponding Base UI root props except uncontrolled checked state and the native `onChange` handler.

<!-- props:checkbox -->

The wrapper forwards the corresponding Base UI Root props unless Control Kit documents a changed contract above. Control Kit requires `checked`, so Base UI's `defaultChecked` is not a standalone uncontrolled path on this component. See the [Base UI Checkbox API](https://base-ui.com/react/components/checkbox#api-reference) for the complete upstream contract and event detail types.

## Accessibility

The root exposes checkbox semantics and derives its accessible name from its children. Space toggles the value while the checkbox has keyboard focus. Disabled and readonly state pass through to Base UI, and the hidden input preserves native form behavior.

For a related set of checkboxes, group them with a `fieldset` and `legend`.

## Source

[Implementation](https://github.com/pbroom/control-kit/blob/main/src/checkbox.tsx) · [Tests](https://github.com/pbroom/control-kit/blob/main/__tests__/checkbox.test.tsx) · [Base UI Checkbox API](https://base-ui.com/react/components/checkbox#api-reference) · [Issues](https://github.com/pbroom/control-kit/issues)
