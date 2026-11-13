# Checkbox

A compact controlled checkbox with an integrated label. Built on [Base UI Checkbox](https://base-ui.com/react/components/checkbox); Control Kit assembles the indicator, icon, label, and visual states into one component.

Example: Checkbox

```tsx
import { useState } from 'react';
import { Checkbox } from '@pbroom/control-kit';

export function CheckboxExample() {
  const [checked, setChecked] = useState(false);

  return (
    <div className="flex min-h-[240px] items-center justify-center p-8">
      <Checkbox checked={checked} onCheckedChange={setChecked}>
        Show grid
      </Checkbox>
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

3. Import `Checkbox` from `@pbroom/control-kit` as shown below.

## Usage

Keep the checked value in application state and update it from `onCheckedChange`:

```tsx
import { useState } from 'react';
import { Checkbox } from '@pbroom/control-kit';

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

Example: Checkbox attachment points

```tsx
import { useState } from 'react';
import { Checkbox } from '@pbroom/control-kit';

export function CheckboxStylingExample() {
  const [checked, setChecked] = useState(true);

  return (
    <div className="flex min-h-[240px] items-center justify-center p-8">
      <Checkbox
        checked={checked}
        className="w-52 rounded-md border border-white/10 bg-white/5 px-3 py-2"
        indicatorClassName="size-5 rounded-full"
        labelClassName="font-semibold tracking-wide"
        onCheckedChange={setChecked}
      >
        Custom attachment points
      </Checkbox>
    </div>
  );
}
```

### States

The same component covers checked, unchecked, and disabled states. A disabled checkbox ignores interaction and receives the corresponding Base UI data attribute.

Example: Checkbox states

```tsx
import { useState } from 'react';
import { Checkbox } from '@pbroom/control-kit';

export function CheckboxStatesExample() {
  const [checked, setChecked] = useState(true);
  const [unchecked, setUnchecked] = useState(false);

  return (
    <div className="flex min-h-[240px] items-center justify-center p-8">
      <div className="flex w-48 flex-col gap-3">
        <Checkbox checked={checked} onCheckedChange={setChecked}>
          Snap to grid
        </Checkbox>
        <Checkbox checked={unchecked} onCheckedChange={setUnchecked}>
          Show rulers
        </Checkbox>
        <Checkbox checked={false} disabled>
          Locked option
        </Checkbox>
      </div>
    </div>
  );
}
```

### Option group

Use a `fieldset` and `legend` when several checkboxes describe one set of options. Each checkbox still owns its own controlled value.

Example: Checkbox group

```tsx
import { useState } from 'react';
import { Checkbox } from '@pbroom/control-kit';

type GuideSettings = {
  grid: boolean;
  guides: boolean;
  rulers: boolean;
};

export function CheckboxGroupExample() {
  const [settings, setSettings] = useState<GuideSettings>({
    grid: true,
    guides: false,
    rulers: true,
  });

  function setSetting(name: keyof GuideSettings, checked: boolean) {
    setSettings((current) => ({ ...current, [name]: checked }));
  }

  return (
    <div className="flex min-h-[280px] items-center justify-center p-8">
      <fieldset className="flex w-48 flex-col gap-2">
        <legend className="text-foreground mb-2 text-sm font-medium">
          Canvas overlays
        </legend>
        <Checkbox
          checked={settings.grid}
          name="grid"
          onCheckedChange={(checked) => setSetting('grid', checked)}
        >
          Grid
        </Checkbox>
        <Checkbox
          checked={settings.guides}
          name="guides"
          onCheckedChange={(checked) => setSetting('guides', checked)}
        >
          Guides
        </Checkbox>
        <Checkbox
          checked={settings.rulers}
          name="rulers"
          onCheckedChange={(checked) => setSetting('rulers', checked)}
        >
          Rulers
        </Checkbox>
      </fieldset>
    </div>
  );
}
```

## API reference

### Checkbox

Renders a Base UI Checkbox root with an integrated indicator and optional label. `CheckboxProps` includes the corresponding Base UI root props except uncontrolled checked state and the native `onChange` handler.

Props for `Checkbox`:

| Prop                 | Type                                                                        | Default | Description                                                                                             |
| -------------------- | --------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------- |
| `checked` (required) | `boolean`                                                                   | —       | The controlled checked state.                                                                           |
| `onCheckedChange`    | `(checked: boolean, eventDetails: CheckboxRoot.ChangeEventDetails) => void` | —       | Called when the checkbox is checked or unchecked, with Base UI event details.                           |
| `children`           | `React.ReactNode`                                                           | —       | Renders the integrated visible and accessible label beside the indicator.                               |
| `className`          | `string \| undefined`                                                       | —       | Adds classes to the interactive root.                                                                   |
| `indicatorClassName` | `string \| undefined`                                                       | —       | Adds classes to the mounted indicator.                                                                  |
| `labelClassName`     | `string \| undefined`                                                       | —       | Adds classes to the label span.                                                                         |
| `disabled`           | `boolean \| undefined`                                                      | `false` | Prevents interaction and marks the checkbox as disabled.                                                |
| `readOnly`           | `boolean \| undefined`                                                      | `false` | Prevents the checked state from changing while preserving focusability.                                 |
| `required`           | `boolean \| undefined`                                                      | `false` | Requires the checkbox to be checked for form validation.                                                |
| `name`               | `string \| undefined`                                                       | —       | Identifies the hidden input during form submission.                                                     |
| `value`              | `string \| undefined`                                                       | —       | The value submitted when the checkbox is checked.                                                       |
| `uncheckedValue`     | `string \| undefined`                                                       | —       | The value submitted when the checkbox is unchecked. By default, an unchecked checkbox submits no value. |
| `form`               | `string \| undefined`                                                       | —       | The ID of the form associated with the hidden input.                                                    |

The wrapper forwards the corresponding Base UI Root props unless Control Kit documents a changed contract above. Control Kit requires `checked`, so Base UI's `defaultChecked` is not a standalone uncontrolled path on this component. See the [Base UI Checkbox API](https://base-ui.com/react/components/checkbox#api-reference) for the complete upstream contract and event detail types.

## Accessibility

The root exposes checkbox semantics and derives its accessible name from its children. Space toggles the value while the checkbox has keyboard focus. Disabled and readonly state pass through to Base UI, and the hidden input preserves native form behavior.

For a related set of checkboxes, group them with a `fieldset` and `legend`.

## Source

[Implementation](https://github.com/pbroom/control-kit/blob/main/src/checkbox.tsx) · [Tests](https://github.com/pbroom/control-kit/blob/main/__tests__/checkbox.test.tsx) · [Base UI Checkbox API](https://base-ui.com/react/components/checkbox#api-reference) · [Issues](https://github.com/pbroom/control-kit/issues)
