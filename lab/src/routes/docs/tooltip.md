# Tooltip

A styled tooltip for short, descriptive labels. Built on [Base UI Tooltip](https://base-ui.com/react/components/tooltip); Control Kit adds its visual treatment, pointer options, and animation policy.

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

3. Import the Tooltip parts from `@color-kit/control-kit` as shown below.

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
    <TooltipTrigger render={<button type="button" />}>Settings</TooltipTrigger>
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

Base UI positioning props pass through to `TooltipContent`.

<!-- demo:placement -->

### Delay and handoff

Control Kit defaults the provider to a `450` ms initial delay and a `300` ms handoff window. Base UI opens adjacent tooltips immediately during that window, and Control Kit suppresses the transition for that instant state.

```tsx
<TooltipProvider delay={450} timeout={300}>
  {/* Related tooltips */}
</TooltipProvider>
```

## API

### Control Kit additions

| Prop                  | Part             | Default | Purpose                                                 |
| --------------------- | ---------------- | ------- | ------------------------------------------------------- |
| `highContrast`        | `TooltipContent` | `true`  | Selects the solid inverse or surfaced visual treatment. |
| `showPointer`         | `TooltipContent` | `true`  | Shows or hides the decorative pointer.                  |
| `keepMounted`         | `TooltipContent` | `false` | Keeps the portal contents mounted while closed.         |
| `positionerClassName` | `TooltipContent` | —       | Styles the composed Base UI positioner.                 |

Control Kit changes the provider defaults to `450` ms for `delay` and `300` ms for `timeout`. `TooltipContent` also composes Base UI's portal, positioner, popup, and arrow into one part.

### Important forwarded props

| Part              | Props                                                                             |
| ----------------- | --------------------------------------------------------------------------------- |
| `TooltipProvider` | `delay`, `closeDelay`, `timeout`                                                  |
| `Tooltip`         | `open`, `defaultOpen`, `onOpenChange`, `disableHoverablePopup`, `trackCursorAxis` |
| `TooltipTrigger`  | `render`, `delay`, `closeDelay`, `closeOnClick`, `disabled`                       |
| `TooltipContent`  | `side`, `align`, `sideOffset`, `collisionAvoidance`, `collisionPadding`, `sticky` |

The wrapper forwards the corresponding Base UI props unless Control Kit documents a changed default or addition above. See the [Base UI Tooltip API reference](https://base-ui.com/react/components/tooltip#api-reference) for the complete upstream contract.

## Accessibility

Base UI tooltips are visual labels rather than accessible descriptions. Give the trigger an accessible name that closely matches the tooltip text; do not use a tooltip as the only label or source of important information. Tooltips open from pointer hover or keyboard focus and close when the trigger activates or Escape is pressed. Keep content short and noninteractive; use visible text or a popover when the content must be available to touch or assistive technology users.

## Source

[Implementation](https://github.com/pbroom/control-kit/blob/main/src/tooltip.tsx) · [Tests](https://github.com/pbroom/control-kit/blob/main/__tests__/tooltip.test.tsx) · [Base UI Tooltip API](https://base-ui.com/react/components/tooltip#api-reference) · [Issues](https://github.com/pbroom/control-kit/issues)
