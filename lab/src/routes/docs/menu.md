# Menu

A composed command menu built on [Base UI Menu](https://base-ui.com/react/components/menu). The Control Kit Lab wrapper adds the UI3 visual treatment, keyboard typeahead, shortcuts, selection indicators, and submenu presentation.

> Lab prototype — Menu is not currently exported from `@color-kit/control-kit`.

<!-- demo:basic -->

## Usage

Compose the trigger, positioned content, groups, and command items:

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button type="button">Actions</button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuGroup>
      <DropdownMenuItem onSelect={rename}>Rename</DropdownMenuItem>
      <DropdownMenuItem onSelect={duplicate}>Duplicate</DropdownMenuItem>
    </DropdownMenuGroup>
  </DropdownMenuContent>
</DropdownMenu>
```

## Composition

- `DropdownMenu` owns open state and coordinates the trigger with the popup.
- `DropdownMenuTrigger` composes menu behavior onto a native button.
- `DropdownMenuContent` portals and positions the command surface.
- `DropdownMenuGroup`, `DropdownMenuLabel`, and `DropdownMenuSeparator` organize related actions.
- `DropdownMenuItem` invokes a command and closes the menu.
- Checkbox and radio items represent settings inside a command menu; submenus reveal nested actions.

Select remains a separate value-selection recipe. It persists a current value and renders selectable options, while Menu is organized around commands and optional settings.

## Examples

### Reduced presentation

Hide optional icons, shortcuts, submenus, dividers, and trailing hints when the command set does not need them. This example uses the same interactive composition and styles as the Lab.

<!-- demo:minimal -->

### Placement

Positioning props pass through to the Base UI positioner. This example opens above the trigger and aligns the popup to its end edge.

<!-- demo:placement -->

## API

### Control Kit additions

| Part                     | Addition                      | Purpose                                                                                  |
| ------------------------ | ----------------------------- | ---------------------------------------------------------------------------------------- |
| `DropdownMenuContent`    | `variant="ui3"`               | Applies the Control Kit menu surface, spacing, and open animation.                       |
| `DropdownMenuItem`       | `variant`, `density`, `label` | Applies item styling and supplies a typeahead label when visible text is not sufficient. |
| `DropdownMenuSubTrigger` | `variant`, `density`          | Matches submenu triggers to the chosen item treatment.                                   |
| `DropdownMenuSubContent` | `variant="ui3"`               | Matches nested content to the UI3 surface.                                               |

The Lab wrapper also normalizes keyboard navigation and typeahead across scrollable content and nested menus.

### Important forwarded props

| Part                  | Props                                                                             |
| --------------------- | --------------------------------------------------------------------------------- |
| `DropdownMenu`        | `open`, `defaultOpen`, `onOpenChange`, `modal`                                    |
| `DropdownMenuTrigger` | `disabled`, `render` through the wrapper's `asChild` composition                  |
| `DropdownMenuContent` | `side`, `align`, `sideOffset`, `collisionAvoidance`, `collisionPadding`, `sticky` |
| Items                 | `disabled`, `closeOnClick`, selection and checked-state callbacks                 |

The wrapper forwards the corresponding Base UI props unless Control Kit documents a changed contract above. See the [Base UI Menu API](https://base-ui.com/react/components/menu#api-reference) for the complete upstream contract.

## Accessibility

The trigger is a native button and the popup uses menu semantics. Base UI manages focus entry, arrow-key navigation, Escape, activation, and focus return. Checkbox and radio items expose checked state, and submenus expose their expanded relationship.

Menu items should perform commands or change menu-local settings. Use Select when choosing one persistent application or form value from a list of options.

## Source

[Menu wrapper](https://github.com/pbroom/control-kit/blob/main/lab/src/components/ui/dropdown-menu.tsx) · [Lab page](https://github.com/pbroom/control-kit/blob/main/lab/src/routes/lab/pages/menu.tsx) · [Base UI Menu API](https://base-ui.com/react/components/menu#api-reference) · [Issues](https://github.com/pbroom/control-kit/issues)
