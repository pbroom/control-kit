# Toggle Group

A styled set of two-state buttons for choosing one or more related options. Built on [Base UI Toggle Group](https://base-ui.com/react/components/toggle-group); Control Kit adds its visual variants and a scalar API for single selection.

Example: Toggle group

```tsx
import { ToggleGroup, ToggleGroupItem } from '@pbroom/control-kit';

export function ToggleGroupExample() {
  return (
    <div className="flex min-h-[240px] items-center justify-center p-8">
      <ToggleGroup aria-label="View" defaultValue="grid">
        <ToggleGroupItem value="list">List</ToggleGroupItem>
        <ToggleGroupItem value="grid">Grid</ToggleGroupItem>
        <ToggleGroupItem value="compact">Compact</ToggleGroupItem>
      </ToggleGroup>
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

3. Import `ToggleGroup` and `ToggleGroupItem` from `@pbroom/control-kit` as shown below.

The `@source` path is relative to your stylesheet. The group uses
`--ck-surface-content` for its background, `--ck-surface` for selected items,
`--ck-foreground` for text, `--ck-border` for the outline variant, and
`--ck-accent` for focus rings. Each token has a dark default, so no host
Tailwind theme names are required. Define these variables on the group or
an ancestor to customize its colors.

## Usage

Compose each item inside a group and give every item a stable value:

```tsx
import { ToggleGroup, ToggleGroupItem } from '@pbroom/control-kit';

<ToggleGroup aria-label="View" defaultValue="grid">
  <ToggleGroupItem value="list">List</ToggleGroupItem>
  <ToggleGroupItem value="grid">Grid</ToggleGroupItem>
</ToggleGroup>;
```

## Composition

- `ToggleGroup` owns selection, orientation, and roving keyboard focus.
- `ToggleGroupItem` renders a toggle button and joins the nearest group through its `value`.

## Examples

### Multiple selection

Set `type="multiple"` when each item may be switched independently. Multiple groups use array values.

Example: Multiple selection toggle group

```tsx
import { ToggleGroup, ToggleGroupItem } from '@pbroom/control-kit';

export function ToggleGroupMultipleExample() {
  return (
    <div className="flex min-h-[240px] items-center justify-center p-8">
      <ToggleGroup
        aria-label="Text formatting"
        defaultValue={['bold']}
        type="multiple"
        variant="outline"
      >
        <ToggleGroupItem aria-label="Bold" value="bold">
          <span className="font-bold">B</span>
        </ToggleGroupItem>
        <ToggleGroupItem aria-label="Italic" value="italic">
          <span className="italic">I</span>
        </ToggleGroupItem>
        <ToggleGroupItem aria-label="Underline" value="underline">
          <span className="underline">U</span>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
```

### Variants and sizes

Use `variant="outline"` for a bordered treatment. Apply the same `sm`, `default`, or `lg` size to the group and its items.

Example: Toggle group variants and sizes

```tsx
import { ToggleGroup, ToggleGroupItem } from '@pbroom/control-kit';

const sizes = ['sm', 'default', 'lg'] as const;

export function ToggleGroupVariantsExample() {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-5 p-8">
      {sizes.map((size) => (
        <ToggleGroup
          aria-label={`${size} alignment`}
          defaultValue="center"
          key={size}
          size={size}
          variant="outline"
        >
          <ToggleGroupItem size={size} value="left">
            Left
          </ToggleGroupItem>
          <ToggleGroupItem size={size} value="center">
            Center
          </ToggleGroupItem>
          <ToggleGroupItem size={size} value="right">
            Right
          </ToggleGroupItem>
        </ToggleGroup>
      ))}
    </div>
  );
}
```

### Controlled selection

Single groups use a string, `null` (controlled with nothing pressed), or
`undefined` (uncontrolled); multiple groups use an array. Set `required` to
keep a single group's pressed item from being deselected.

Example: Controlled toggle group

```tsx
import { useState } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@pbroom/control-kit';

export function ToggleGroupControlledExample() {
  const [view, setView] = useState<string | null>('grid');

  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 p-8">
      <ToggleGroup aria-label="View" value={view} onValueChange={setView}>
        <ToggleGroupItem value="list">List</ToggleGroupItem>
        <ToggleGroupItem value="grid">Grid</ToggleGroupItem>
        <ToggleGroupItem value="compact">Compact</ToggleGroupItem>
      </ToggleGroup>
      <p className="text-muted-foreground text-xs">
        Selected: {view ?? 'None'}
      </p>
    </div>
  );
}
```

### Focus wrapping

Set `loop={false}` when arrow-key focus should stop at the first and last item instead of wrapping around the group.

Example: Toggle group focus wrapping

```tsx
import { ToggleGroup, ToggleGroupItem } from '@pbroom/control-kit';

export function ToggleGroupLoopExample() {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 p-8">
      <ToggleGroup
        aria-label="Panel alignment"
        defaultValue="center"
        loop={false}
      >
        <ToggleGroupItem value="left">Left</ToggleGroupItem>
        <ToggleGroupItem value="center">Center</ToggleGroupItem>
        <ToggleGroupItem value="right">Right</ToggleGroupItem>
      </ToggleGroup>
      <p className="text-muted-foreground max-w-64 text-center text-xs">
        Arrow-key focus stops at the first and last item.
      </p>
    </div>
  );
}
```

## API reference

### ToggleGroup

Provides shared selection and roving focus to its items. It renders a Base UI Toggle Group and includes native `div` props.

Props for `ToggleGroup`:

| Prop            | Type                                                                                                                                                 | Default        | Description                                                                                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`          | `'single' \| 'multiple' \| undefined`                                                                                                                | `'single'`     | Selects scalar single-selection or array-based multiple-selection state.                                                                                   |
| `value`         | `string \| null \| string[] \| undefined`                                                                                                            | —              | The controlled selection. Single mode uses string \| null (null means controlled and nothing pressed); multiple mode uses string[]. Omit for uncontrolled. |
| `defaultValue`  | `string \| null \| string[] \| undefined`                                                                                                            | —              | The initial uncontrolled selection. Its shape follows the selected type.                                                                                   |
| `onValueChange` | `((value: string \| null, details: ToggleGroup.ChangeEventDetails) => void) \| ((value: string[], details: ToggleGroup.ChangeEventDetails) => void)` | —              | Called with the next scalar or array selection and Base UI event details. Single mode reports null on deselect.                                            |
| `required`      | `boolean \| undefined`                                                                                                                               | `false`        | Single mode only. When true, clicking or keyboard-toggling the pressed item does not deselect it — the group always keeps a selection.                     |
| `variant`       | `'default' \| 'outline' \| null \| undefined`                                                                                                        | `'default'`    | Selects the surfaced or outlined visual treatment.                                                                                                         |
| `size`          | `'sm' \| 'default' \| 'lg' \| null \| undefined`                                                                                                     | `'default'`    | Sets the group height. Apply the same size to its items for matched sizing.                                                                                |
| `loop`          | `boolean \| undefined`                                                                                                                               | `true`         | Controls whether arrow-key focus wraps between the first and last item.                                                                                    |
| `disabled`      | `boolean \| undefined`                                                                                                                               | `false`        | Prevents interaction with every item in the group.                                                                                                         |
| `orientation`   | `'horizontal' \| 'vertical' \| undefined`                                                                                                            | `'horizontal'` | Sets the group orientation and arrow-key direction.                                                                                                        |
| `className`     | `string \| undefined`                                                                                                                                | —              | Adds classes to the group root.                                                                                                                            |

In single mode, Control Kit converts Base UI's array state to a string, `null` (nothing pressed while controlled), or `undefined` (uncontrolled) for `value`, `defaultValue`, and `onValueChange`. Deselecting the pressed item reports `null`, not `undefined`, so the group stays controlled.

### ToggleGroupItem

Renders a styled Base UI Toggle button and joins the nearest group through its `value`. It includes native button props.

Props for `ToggleGroupItem`:

| Prop       | Type                                                                            | Default     | Description                                                                      |
| ---------- | ------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------- |
| `value`    | `string \| undefined`                                                           | —           | Uniquely identifies the item within its toggle group.                            |
| `size`     | `'sm' \| 'default' \| 'lg' \| null \| undefined`                                | `'default'` | Sets the item height and minimum width.                                          |
| `disabled` | `boolean \| undefined`                                                          | `false`     | Prevents the item from receiving interaction.                                    |
| `render`   | `React.ReactElement \| ComponentRenderFn<HTMLProps, Toggle.State> \| undefined` | —           | Replaces the rendered button or composes the item behavior onto another element. |

See the [Base UI Toggle Group API](https://base-ui.com/react/components/toggle-group#api-reference) and [Base UI Toggle API](https://base-ui.com/react/components/toggle#api-reference) for the complete upstream contracts.

## Accessibility

Items render as buttons with `aria-pressed`. Arrow keys move focus according to the group's orientation; `loop` controls whether focus wraps. Give icon-only items an accessible name.

## Source

[Implementation](https://github.com/pbroom/control-kit/blob/main/src/toggle-group.tsx) · [Tests](https://github.com/pbroom/control-kit/blob/main/__tests__/toggle-group.test.tsx) · [Base UI Toggle Group API](https://base-ui.com/react/components/toggle-group#api-reference) · [Issues](https://github.com/pbroom/control-kit/issues)
