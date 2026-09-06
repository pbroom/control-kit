# Menu

A composed command menu built on [Base UI Menu](https://base-ui.com/react/components/menu). The Control Kit Lab wrapper adds the UI3 visual treatment, keyboard typeahead, shortcuts, selection indicators, and submenu presentation.

> Lab prototype — Menu is not currently exported from `control-kit`.

<!-- demo:basic -->

## Installation

### Manual

Menu is currently a Lab prototype rather than a package export.

1. Install the implementation dependencies:

   ```bash
   pnpm add @base-ui/react lucide-react clsx tailwind-merge
   ```

2. Copy the [Menu wrapper](https://github.com/pbroom/control-kit/blob/main/lab/src/components/ui/dropdown-menu.tsx), [focused Menu composition](https://github.com/pbroom/control-kit/blob/main/lab/src/routes/docs/examples/menu-installation-example.tsx), and [class-name utility](https://github.com/pbroom/control-kit/blob/main/lab/src/lib/utils.ts) into your project.
3. Update the `@/` aliases and local imports to match your project setup.

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

### Item density and typeahead

Choose compact or comfortable item height independently of the menu surface. Supply `typeaheadLabel` when visible content is abbreviated or otherwise insufficient for keyboard matching.

<!-- demo:item-options -->

## API reference

These tables describe the current Lab wrapper. Menu is not a stable Control Kit package API; unlisted props follow Base UI unless the wrapper changes them below.

### DropdownMenu (current Lab contract)

Owns open state and coordinates the trigger with the popup.

<!-- props:dropdown-menu -->

### DropdownMenuTrigger (current Lab contract)

Opens the menu and can compose its behavior onto a supplied button.

<!-- props:dropdown-menu-trigger -->

### DropdownMenuContent (current Lab contract)

Portals and positions the command surface. `variant="ui3"` applies the Control Kit surface, spacing, and open animation.

<!-- props:dropdown-menu-content -->

### DropdownMenuItem (current Lab contract)

Runs a command and closes the menu by default. The Lab additions provide item variants, density, and normalized typeahead labels.

<!-- props:dropdown-menu-item -->

### DropdownMenuCheckboxItem (current Lab contract)

Represents an on/off setting inside the command menu.

<!-- props:dropdown-menu-checkbox-item -->

### DropdownMenuRadioGroup (current Lab contract)

Owns the selected value for a related set of radio items.

<!-- props:dropdown-menu-radio-group -->

### DropdownMenuRadioItem (current Lab contract)

Selects one value from its surrounding radio group.

<!-- props:dropdown-menu-radio-item -->

### DropdownMenuSub (current Lab contract)

Owns the open state for a nested menu.

<!-- props:dropdown-menu-sub -->

### DropdownMenuSubTrigger (current Lab contract)

Opens a nested menu and matches the selected item treatment.

<!-- props:dropdown-menu-sub-trigger -->

### DropdownMenuSubContent (current Lab contract)

Positions the nested command surface and accepts the same visual and positioning inputs as `DropdownMenuContent`.

<!-- props:dropdown-menu-sub-content -->

The Lab wrapper also normalizes keyboard navigation and typeahead across scrollable content and nested menus.

The wrapper forwards the corresponding Base UI props unless Control Kit documents a changed contract above. See the [Base UI Menu API](https://base-ui.com/react/components/menu#api-reference) for the complete upstream contract.

## Accessibility

The trigger is a native button and the popup uses menu semantics. Base UI manages focus entry, arrow-key navigation, Escape, activation, and focus return. Checkbox and radio items expose checked state, and submenus expose their expanded relationship.

Menu items should perform commands or change menu-local settings. Use Select when choosing one persistent application or form value from a list of options.

## Source

[Menu wrapper](https://github.com/pbroom/control-kit/blob/main/lab/src/components/ui/dropdown-menu.tsx) · [Focused composition](https://github.com/pbroom/control-kit/blob/main/lab/src/routes/docs/examples/menu-installation-example.tsx) · [Class-name utility](https://github.com/pbroom/control-kit/blob/main/lab/src/lib/utils.ts) · [Lab page](https://github.com/pbroom/control-kit/blob/main/lab/src/routes/lab/pages/menu.tsx) · [Base UI Menu API](https://base-ui.com/react/components/menu#api-reference) · [Issues](https://github.com/pbroom/control-kit/issues)
