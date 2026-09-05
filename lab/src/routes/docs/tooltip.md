# Tooltip

A styled tooltip for short, descriptive labels. Built on [Base UI Tooltip](https://base-ui.com/react/components/tooltip); Control Kit adds its visual treatment, pointer options, and animation policy.

<!-- demo:basic -->

## Installation

### Manual

1. Install Control Kit and its peer dependencies:

   ```bash
   pnpm add control-kit@github:pbroom/control-kit @base-ui/react
   ```

2. Add the package source to Tailwind's content graph:

   ```css
   @source '../node_modules/control-kit/src';
   ```

3. Import the Tooltip parts from `control-kit` as shown below.

The `@source` path is relative to your stylesheet. Tooltip's colors use the
package's `--ck-foreground`, `--ck-surface-content`, and `--ck-border` tokens
with dark defaults; no host `foreground`/`background` theme or animation
plugin is needed. Shared theme variables must be on `:root` or `body`
because the content is portaled. Alternatively, set them directly on
`TooltipContent` with `style` or `className`.

## Usage

Add one provider around a related group of triggers, then compose each tooltip from its root, trigger, and content:

```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from 'control-kit';

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger render={<button type="button" />}>Settings</TooltipTrigger>
    <TooltipContent>Open settings</TooltipContent>
  </Tooltip>
</TooltipProvider>;
```

## Upgrading from the Radix-based Tooltip

The package name and Tooltip export names are unchanged, but the current
wrappers forward Base UI props. An existing consumer pinned to an earlier
Radix-based revision must update its call sites before upgrading.

Earlier composition:

```tsx
<TooltipProvider delayDuration={450} skipDelayDuration={300}>
  <Tooltip>
    <TooltipTrigger asChild>
      <button type="button">Settings</button>
    </TooltipTrigger>
    <TooltipContent>Open settings</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

Current composition:

```tsx
<TooltipProvider delay={450} timeout={300}>
  <Tooltip>
    <TooltipTrigger render={<button type="button" />}>Settings</TooltipTrigger>
    <TooltipContent>Open settings</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

`delay` controls the initial delay and `timeout` controls the immediate-open
handoff window. Move the trigger element to `render` and keep its content as
the trigger's children. Custom trigger components must forward their ref and
the supplied props to the underlying element. Install the declared Base UI
peer, review any other forwarded props against the current API reference,
then run the consumer's typecheck and hover, focus, and activation checks.
The previous prop names are not compatibility aliases.

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

Control Kit defaults the provider to a `450` ms initial delay and a `300` ms handoff window. Base UI opens adjacent tooltips immediately during that window, and Control Kit suppresses the transition for that instant state. Set `delay` and `timeout` on the provider to tune both timings for a group.

<!-- demo:delay -->

## API reference

The wrappers forward the corresponding Base UI props unless Control Kit documents a changed default or addition. See the [Base UI Tooltip API reference](https://base-ui.com/react/components/tooltip#api-reference) for the complete upstream contract.

### TooltipProvider

Coordinates delay and pointer handoff across related tooltips. It does not render an HTML element.

<!-- props:tooltip-provider -->

Control Kit changes the provider defaults to `450` ms for `delay` and `300` ms for `timeout`.

### Tooltip

Owns controlled or uncontrolled open state. It does not render an HTML element.

<!-- props:tooltip -->

### TooltipTrigger

Composes tooltip interaction onto a trigger and renders a `button` by default. Control Kit adds `data-slot="tooltip-trigger"`.

<!-- props:tooltip-trigger -->

### TooltipContent

Composes Base UI's portal, positioner, popup, and optional arrow into one styled part.

<!-- props:tooltip-content -->

## Accessibility

Base UI tooltips are visual labels rather than accessible descriptions. Give the trigger an accessible name that closely matches the tooltip text; do not use a tooltip as the only label or source of important information. Tooltips open from pointer hover or keyboard focus and close when the trigger activates or Escape is pressed. Keep content short and noninteractive; use visible text or a popover when the content must be available to touch or assistive technology users.

## Source

[Implementation](https://github.com/pbroom/control-kit/blob/main/src/tooltip.tsx) · [Tests](https://github.com/pbroom/control-kit/blob/main/__tests__/tooltip.test.tsx) · [Base UI Tooltip API](https://base-ui.com/react/components/tooltip#api-reference) · [Issues](https://github.com/pbroom/control-kit/issues)
