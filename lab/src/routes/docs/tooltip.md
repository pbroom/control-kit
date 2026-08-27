# Tooltip

A styled tooltip for short, descriptive labels. Built on [Radix Tooltip](https://www.radix-ui.com/primitives/docs/components/tooltip); Control Kit adds its visual treatment, pointer options, and animation handoff policy.

<!-- demo:basic -->

## Usage

Add one provider around a related group of triggers, then compose each tooltip from its root, trigger, and content:

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

## Composition

- `TooltipProvider` coordinates delay and pointer handoff across a group.
- `Tooltip` owns controlled or uncontrolled open state.
- `TooltipTrigger` composes intent and accessible description onto the trigger.
- `TooltipContent` portals the positioned surface and its optional pointer.

## Examples

### Contrast

Content uses the solid inverse treatment by default. Use the surfaced treatment when the surrounding composition needs lower contrast.

<!-- demo:contrast -->

### Pointer

The decorative pointer is included by default and can be removed without changing positioning or accessible behavior.

<!-- demo:pointer -->

### Placement

Radix positioning props pass through to `TooltipContent`.

<!-- demo:placement -->

### Delay and handoff

Control Kit defaults the provider to a `450` ms initial delay and a `300` ms skip-delay window. Moving between triggers during that window opens the next tooltip immediately and suppresses the outgoing and incoming zoom animation.

```tsx
<TooltipProvider delayDuration={450} skipDelayDuration={300}>
  {/* Related tooltips */}
</TooltipProvider>
```

## API

### Control Kit additions

| Prop           | Part             | Default | Purpose                                                 |
| -------------- | ---------------- | ------- | ------------------------------------------------------- |
| `highContrast` | `TooltipContent` | `true`  | Selects the solid inverse or surfaced visual treatment. |
| `showPointer`  | `TooltipContent` | `true`  | Shows or hides the decorative pointer.                  |

Control Kit also changes the provider defaults to `450` ms for `delayDuration` and `300` ms for `skipDelayDuration`.

### Important forwarded props

| Part              | Props                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------- |
| `TooltipProvider` | `delayDuration`, `skipDelayDuration`, `disableHoverableContent`                          |
| `Tooltip`         | `open`, `defaultOpen`, `onOpenChange`, `delayDuration`, `disableHoverableContent`        |
| `TooltipTrigger`  | `asChild`                                                                                |
| `TooltipContent`  | `side`, `align`, `sideOffset`, `avoidCollisions`, `collisionPadding`, dismissal handlers |

The wrapper forwards the corresponding Radix props unless Control Kit documents a changed default or addition above. See the [Radix Tooltip API reference](https://www.radix-ui.com/primitives/docs/components/tooltip#api-reference) for the complete upstream contract.

## Accessibility

Tooltip content is associated with its trigger as a description. It opens from pointer hover or keyboard focus and closes when the trigger activates or Escape is pressed. Keep content short and noninteractive; use a popover when the floating surface contains controls.

## Source

[Implementation](https://github.com/pbroom/control-kit/blob/main/src/tooltip.tsx) · [Tests](https://github.com/pbroom/control-kit/blob/main/__tests__/tooltip.test.tsx) · [Radix Tooltip API](https://www.radix-ui.com/primitives/docs/components/tooltip#api-reference) · [Issues](https://github.com/pbroom/control-kit/issues)
