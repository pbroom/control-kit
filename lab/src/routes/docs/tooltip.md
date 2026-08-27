# Tooltip

A short, descriptive label that appears when a trigger receives pointer hover or keyboard focus.

Built on [Radix Tooltip](https://www.radix-ui.com/primitives/docs/components/tooltip). Control Kit adds its visual treatment, pointer options, and animation handoff policy.

<!-- demo:basic -->

## Anatomy

Import the parts and compose them together:

```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@color-kit/control-kit';

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <button type="button">Settings</button>
    </TooltipTrigger>
    <TooltipContent>Open settings</TooltipContent>
  </Tooltip>
</TooltipProvider>;
```

`TooltipProvider` coordinates delay and pointer handoff across a group. `Tooltip` owns open state. `TooltipTrigger` connects intent and description to the trigger element. `TooltipContent` portals the positioned content and optional pointer.

## Usage guidelines

- Keep tooltip content short and noninteractive. Use a popover when the floating content contains controls or requires persistent interaction.
- The trigger must remain understandable without the tooltip; tooltip text supplies an accessible description and does not replace the trigger's accessible name.
- Do not put essential instructions only in a tooltip because touch and some assistive-technology workflows may not expose hover content.
- Place one provider around a related group of triggers so delay and pointer handoff remain consistent.

## Delay and handoff

The provider defaults to a `450` ms initial delay and a `300` ms skip-delay window. Moving the pointer between tooltip triggers during that window opens the next tooltip immediately and suppresses the outgoing and incoming zoom animation.

## Placement and pointer

Use `side`, `align`, and `sideOffset` on `TooltipContent` for placement. `highContrast` switches between solid inverse and surfaced styling. Set `showPointer={false}` to remove the decorative arrow.

## API reference

### TooltipProvider

Forwards Radix Tooltip Provider props and coordinates animation handoff.

<!-- props:tooltip-provider -->

### Tooltip

Forwards Radix Tooltip Root props for controlled or uncontrolled open state.

<!-- props:tooltip-root -->

### TooltipTrigger

Forwards Radix Tooltip Trigger props and supports `asChild` composition.

<!-- props:tooltip-trigger -->

**Data attributes**

| Attribute                     | When present                                       |
| ----------------------------- | -------------------------------------------------- |
| `data-slot="tooltip-trigger"` | Always on the rendered trigger.                    |
| `data-state`                  | `'closed'`, `'delayed-open'`, or `'instant-open'`. |

### TooltipContent

Forwards Radix Tooltip Content positioning and dismissal props and adds contrast and pointer options. `forceMount` is accepted by the current wrapper, but it only reaches Content; it does not keep the wrapper portal mounted while closed.

<!-- props:tooltip-content -->

**Data attributes**

| Attribute                     | When present                            |
| ----------------------------- | --------------------------------------- |
| `data-slot="tooltip-content"` | Always on the rendered content.         |
| `data-state`                  | With the current open state.            |
| `data-side`                   | With the resolved collision-aware side. |
| `data-align`                  | With the resolved alignment.            |

## Accessibility

Tooltip content is associated with its trigger as a description. It opens from pointer hover or keyboard focus and closes when the trigger activates or Escape is pressed. The decorative pointer is hidden from assistive technology.

Keep interactive content out of the tooltip. If `disableHoverableContent` is false, users can move the pointer into the content without closing it, but the content should still remain descriptive.

## Types

`TooltipContentProps` is the named public wrapper type. Provider, root, and trigger accept their corresponding Radix Tooltip props through their component signatures.

## Source

[Implementation](https://github.com/pbroom/control-kit/blob/main/src/tooltip.tsx) · [Tests](https://github.com/pbroom/control-kit/blob/main/__tests__/tooltip.test.tsx) · [Radix behavior](https://www.radix-ui.com/primitives/docs/components/tooltip) · [Issues](https://github.com/pbroom/control-kit/issues)
