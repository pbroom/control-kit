# Select

A menu-backed single-selection recipe used by the Control Kit Lab.

> Lab prototype — Select is not currently exported from `@color-kit/control-kit`. It composes the Lab's Base UI Menu wrapper rather than Base UI Select.

<!-- demo:basic -->

## Installation

### Manual

Select is currently a Lab recipe rather than a package export.

1. Install the implementation dependencies:

   ```bash
   pnpm add @base-ui/react lucide-react clsx tailwind-merge
   ```

2. Copy the [Menu wrapper](https://github.com/pbroom/control-kit/blob/main/lab/src/components/ui/dropdown-menu.tsx), [focused Select composition](https://github.com/pbroom/control-kit/blob/main/lab/src/routes/docs/examples/select-basic-example.tsx), [selection list](https://github.com/pbroom/control-kit/blob/main/lab/src/routes/lab/lab-menu.tsx), and [class-name utility](https://github.com/pbroom/control-kit/blob/main/lab/src/lib/utils.ts) into your project.
3. Update the `@/` aliases and local imports to match your project setup.

## Usage

Compose a menu trigger with `SelectList` and `SelectListItem`, then control the selected value from the application:

```tsx
const [value, setValue] = useState('Medium');

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button type="button">{value}</button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <SelectList value={value} onValueChange={setValue}>
      <SelectListItem value="Small">Small</SelectListItem>
      <SelectListItem value="Medium">Medium</SelectListItem>
    </SelectList>
  </DropdownMenuContent>
</DropdownMenu>;
```

## Composition

- `DropdownMenu` owns open state, focus return, positioning, and keyboard navigation.
- `DropdownMenuTrigger` composes menu behavior onto a native button.
- `SelectList` provides the controlled selected value to its items.
- `SelectListItem` renders a `menuitemradio`, updates the list value, and closes the menu by default.

## Examples

### Long lists

Constrain the popup height when a list may exceed the available viewport. The Lab menu controller preserves arrow-key navigation and typeahead inside the scrollable popup.

<!-- demo:long-list -->

### Placement

Positioning props pass through to the Lab's Base UI Menu wrapper.

<!-- demo:placement -->

## API reference

The following tables describe the current Lab recipe, not a stable package API.

### SelectTrigger (current Lab contract)

Renders the styled native button used by `DropdownMenuTrigger`.

<!-- props:select-trigger -->

### SelectList (current Lab contract)

Provides the selected value and selection behavior to its items.

<!-- props:select-list -->

### SelectListItem (current Lab contract)

Renders a selectable `menuitemradio` row in the surrounding menu.

<!-- props:select-list-item -->

### DropdownMenuContent positioning

The recipe uses the Lab Menu wrapper for its option-list surface and positioning.

<!-- props:select-content -->

The underlying menu content accepts Base UI positioning inputs including `side`, `align`, `sideOffset`, `collisionAvoidance`, `collisionPadding`, and `sticky`. See the [Base UI Menu API](https://base-ui.com/react/components/menu#api-reference) for the upstream contract.

## Accessibility

The trigger is a native button. The popup uses menu semantics, and selectable rows use `role="menuitemradio"` with `aria-checked`. Base UI Menu handles arrow-key navigation, Escape, and focus return; the Lab wrapper adds typeahead.

This recipe does not render a hidden form control and does not submit a native select value. It is not a combobox.

## Source

[Lab page](https://github.com/pbroom/control-kit/blob/main/lab/src/routes/lab/pages/select.tsx) · [Focused composition](https://github.com/pbroom/control-kit/blob/main/lab/src/routes/docs/examples/select-basic-example.tsx) · [Selection list](https://github.com/pbroom/control-kit/blob/main/lab/src/routes/lab/lab-menu.tsx) · [Menu wrapper](https://github.com/pbroom/control-kit/blob/main/lab/src/components/ui/dropdown-menu.tsx) · [Class-name utility](https://github.com/pbroom/control-kit/blob/main/lab/src/lib/utils.ts) · [Base UI Menu API](https://base-ui.com/react/components/menu#api-reference)
