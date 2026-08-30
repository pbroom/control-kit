# Toggle Group

A styled set of two-state buttons for choosing one or more related options. Built on [Base UI Toggle Group](https://base-ui.com/react/components/toggle-group); Control Kit adds its visual variants and a scalar API for single selection.

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

3. Import `ToggleGroup` and `ToggleGroupItem` from `@color-kit/control-kit` as shown below.

## Usage

Compose each item inside a group and give every item a stable value:

```tsx
import { ToggleGroup, ToggleGroupItem } from '@color-kit/control-kit';

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

<!-- demo:multiple -->

### Variants and sizes

Use `variant="outline"` for a bordered treatment. Apply the same `sm`, `default`, or `lg` size to the group and its items.

<!-- demo:variants -->

### Controlled selection

Single groups use a string or `undefined`; multiple groups use an array.

```tsx
const [view, setView] = React.useState<string | undefined>('grid');

<ToggleGroup value={view} onValueChange={setView}>
  <ToggleGroupItem value="list">List</ToggleGroupItem>
  <ToggleGroupItem value="grid">Grid</ToggleGroupItem>
</ToggleGroup>;
```

## API reference

### ToggleGroup

Provides shared selection and roving focus to its items. It renders a Base UI Toggle Group and includes native `div` props.

<!-- props:toggle-group -->

In single mode, Control Kit converts Base UI's array state to a string or `undefined` for `value`, `defaultValue`, and `onValueChange`.

### ToggleGroupItem

Renders a styled Base UI Toggle button and joins the nearest group through its `value`. It includes native button props.

<!-- props:toggle-group-item -->

See the [Base UI Toggle Group API](https://base-ui.com/react/components/toggle-group#api-reference) and [Base UI Toggle API](https://base-ui.com/react/components/toggle#api-reference) for the complete upstream contracts.

## Accessibility

Items render as buttons with `aria-pressed`. Arrow keys move focus according to the group's orientation; `loop` controls whether focus wraps. Give icon-only items an accessible name.

## Source

[Implementation](https://github.com/pbroom/control-kit/blob/main/src/toggle-group.tsx) · [Tests](https://github.com/pbroom/control-kit/blob/main/__tests__/toggle-group.test.tsx) · [Base UI Toggle Group API](https://base-ui.com/react/components/toggle-group#api-reference) · [Issues](https://github.com/pbroom/control-kit/issues)
