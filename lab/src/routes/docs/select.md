# Select

A menu-backed single-selection recipe used by the Control Kit Lab.

> Lab prototype — Select is not currently exported from `@color-kit/control-kit`. It composes the Lab's Base UI Menu wrapper rather than Base UI Select.

<!-- demo:basic -->

## Usage

Compose a menu trigger with `SelectList` and `SelectListItem`, then control the selected value from the application:

```tsx
const [value, setValue] = useState('Copy');

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

## API

### Current Lab contract

| Input                      | Purpose                                                          |
| -------------------------- | ---------------------------------------------------------------- |
| `value` / `onValueChange`  | Controls the selected item.                                      |
| `disabled`                 | Prevents the trigger from opening.                               |
| `side` / `align`           | Positions the menu relative to the trigger.                      |
| `triggerContent`           | Shows an icon, text, or both in the trigger.                     |
| `triggerIconTextPlacement` | Places the icon before, after, or on both sides of trigger text. |
| `triggerBehavior`          | Lets the Lab compare press and release opening behavior.         |

These inputs belong to the current Lab preview and are not a stable package API.

### Important forwarded props

The underlying menu content accepts Base UI positioning inputs including `side`, `align`, `sideOffset`, `collisionAvoidance`, `collisionPadding`, and `sticky`. See the [Base UI Menu API](https://base-ui.com/react/components/menu#api-reference) for the upstream contract.

## Accessibility

The trigger is a native button. The popup uses menu semantics, and selectable rows use `role="menuitemradio"` with `aria-checked`. Base UI Menu handles arrow-key navigation, Escape, and focus return; the Lab wrapper adds typeahead.

This recipe does not render a hidden form control and does not submit a native select value. It is not a combobox.

## Source

[Lab page](https://github.com/pbroom/control-kit/blob/main/lab/src/routes/lab/pages/select.tsx) · [Select composition](https://github.com/pbroom/control-kit/blob/main/lab/src/routes/lab/shared.tsx) · [Selection list](https://github.com/pbroom/control-kit/blob/main/lab/src/routes/lab/lab-menu.tsx) · [Menu wrapper](https://github.com/pbroom/control-kit/blob/main/lab/src/components/ui/dropdown-menu.tsx) · [Base UI Menu API](https://base-ui.com/react/components/menu#api-reference)
