# Tooltip

A styled tooltip for short, descriptive labels. Built on [Base UI Tooltip](https://base-ui.com/react/components/tooltip); Control Kit adds its visual treatment, pointer options, and animation policy.

Example: Tooltip

```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@pbroom/control-kit';

export function TooltipExample() {
  return (
    <div className="flex min-h-[320px] items-center justify-center p-8">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80"
                type="button"
              />
            }
          >
            Settings
          </TooltipTrigger>
          <TooltipContent>Settings</TooltipContent>
        </Tooltip>
      </TooltipProvider>
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

3. Import the Tooltip parts from `@pbroom/control-kit` as shown below.

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
} from '@pbroom/control-kit';

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

Example: Tooltip contrast

```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@pbroom/control-kit';

const triggerClassName =
  'rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80';

export function TooltipContrastExample() {
  return (
    <div className="flex min-h-[240px] items-center justify-center gap-4 p-8">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className={triggerClassName}>
            High contrast
          </TooltipTrigger>
          <TooltipContent>High contrast tooltip</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger className={triggerClassName}>Surfaced</TooltipTrigger>
          <TooltipContent highContrast={false}>Surfaced tooltip</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
```

### Pointer

The decorative pointer is included by default and can be removed without changing positioning or accessible behavior.

Example: Tooltip pointer

```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@pbroom/control-kit';

const triggerClassName =
  'rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80';

export function TooltipPointerExample() {
  return (
    <div className="flex min-h-[240px] items-center justify-center gap-4 p-8">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className={triggerClassName}>
            With pointer
          </TooltipTrigger>
          <TooltipContent>Pointer included</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger className={triggerClassName}>
            No pointer
          </TooltipTrigger>
          <TooltipContent showPointer={false}>Pointer removed</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
```

### Placement

Base UI positioning props pass through to `TooltipContent`.

Example: Tooltip placement

```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@pbroom/control-kit';

export function TooltipPlacementExample() {
  return (
    <div className="flex min-h-[240px] items-center justify-center p-8">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80">
            Hover or focus
          </TooltipTrigger>
          <TooltipContent side="right" align="start" sideOffset={8}>
            Right aligned
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
```

### Delay and handoff

Control Kit defaults the provider to a `450` ms initial delay and a `300` ms handoff window. Base UI opens adjacent tooltips immediately during that window, and Control Kit suppresses the transition for that instant state. Set `delay` and `timeout` on the provider to tune both timings for a group.

Example: Tooltip delay and handoff

```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@pbroom/control-kit';

const triggerClassName =
  'rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80';

export function TooltipDelayExample() {
  return (
    <div className="flex min-h-[240px] items-center justify-center gap-2 p-8">
      <TooltipProvider delay={450} timeout={300}>
        <Tooltip>
          <TooltipTrigger className={triggerClassName}>Canvas</TooltipTrigger>
          <TooltipContent>Canvas settings</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger className={triggerClassName}>Export</TooltipTrigger>
          <TooltipContent>Export settings</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger className={triggerClassName}>Share</TooltipTrigger>
          <TooltipContent>Share settings</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
```

## API reference

The wrappers forward the corresponding Base UI props unless Control Kit documents a changed default or addition. See the [Base UI Tooltip API reference](https://base-ui.com/react/components/tooltip#api-reference) for the complete upstream contract.

### TooltipProvider

Coordinates delay and pointer handoff across related tooltips. It does not render an HTML element.

Props for `TooltipProvider`:

| Prop         | Type                  | Default | Description                                                                       |
| ------------ | --------------------- | ------- | --------------------------------------------------------------------------------- |
| `delay`      | `number \| undefined` | `450`   | The initial hover delay in milliseconds.                                          |
| `closeDelay` | `number \| undefined` | —       | The delay before an open tooltip closes, in milliseconds.                         |
| `timeout`    | `number \| undefined` | `300`   | The handoff window in which an adjacent tooltip opens instantly, in milliseconds. |

Control Kit changes the provider defaults to `450` ms for `delay` and `300` ms for `timeout`.

### Tooltip

Owns controlled or uncontrolled open state. It does not render an HTML element.

Props for `Tooltip`:

| Prop                    | Type                                                                    | Default  | Description                                                              |
| ----------------------- | ----------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------ |
| `open`                  | `boolean \| undefined`                                                  | —        | The controlled open state.                                               |
| `defaultOpen`           | `boolean \| undefined`                                                  | `false`  | The initial open state in uncontrolled mode.                             |
| `onOpenChange`          | `(open: boolean, eventDetails: TooltipRoot.ChangeEventDetails) => void` | —        | Called when the tooltip opens or closes.                                 |
| `disableHoverablePopup` | `boolean \| undefined`                                                  | `false`  | Controls whether the tooltip may remain open while its popup is hovered. |
| `trackCursorAxis`       | `'none' \| 'x' \| 'y' \| 'both' \| undefined`                           | `'none'` | Selects the cursor axis followed by the positioned tooltip.              |
| `disabled`              | `boolean \| undefined`                                                  | `false`  | Prevents the tooltip from opening.                                       |

### TooltipTrigger

Composes tooltip interaction onto a trigger and renders a `button` by default. Control Kit adds `data-slot="tooltip-trigger"`.

Props for `TooltipTrigger`:

| Prop           | Type                                                                                    | Default | Description                                                                    |
| -------------- | --------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------ |
| `render`       | `React.ReactElement \| ComponentRenderFn<HTMLProps, TooltipTrigger.State> \| undefined` | —       | Replaces the default button or composes tooltip behavior onto another element. |
| `delay`        | `number \| undefined`                                                                   | —       | Overrides the provider hover delay for this trigger.                           |
| `closeDelay`   | `number \| undefined`                                                                   | `0`     | Overrides the close delay for this trigger, in milliseconds.                   |
| `closeOnClick` | `boolean \| undefined`                                                                  | `true`  | Controls whether clicking the trigger closes the tooltip.                      |
| `disabled`     | `boolean \| undefined`                                                                  | `false` | Prevents tooltip interaction without disabling the rendered trigger element.   |

### TooltipContent

Composes Base UI's portal, positioner, popup, and optional arrow into one styled part.

Props for `TooltipContent`:

| Prop                  | Type                                                                                      | Default    | Description                                                                               |
| --------------------- | ----------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------- |
| `highContrast`        | `boolean \| undefined`                                                                    | `true`     | Selects the solid inverse or surfaced visual treatment.                                   |
| `showPointer`         | `boolean \| undefined`                                                                    | `true`     | Shows or hides the decorative pointer.                                                    |
| `keepMounted`         | `boolean \| undefined`                                                                    | `false`    | Keeps the portal contents mounted while the tooltip is closed.                            |
| `positionerClassName` | `string \| undefined`                                                                     | —          | Adds classes to the composed Base UI positioner.                                          |
| `side`                | `'top' \| 'bottom' \| 'left' \| 'right' \| 'inline-start' \| 'inline-end' \| undefined`   | `'top'`    | Sets the preferred side of the trigger. Collision handling may change it.                 |
| `align`               | `'start' \| 'center' \| 'end' \| undefined`                                               | `'center'` | Aligns the popup along the selected side.                                                 |
| `sideOffset`          | `number \| OffsetFunction \| undefined`                                                   | `4`        | Offsets the popup from the trigger in pixels.                                             |
| `alignOffset`         | `number \| OffsetFunction \| undefined`                                                   | `0`        | Offsets the popup along its alignment axis in pixels.                                     |
| `collisionAvoidance`  | `CollisionAvoidance \| undefined`                                                         | —          | Controls flipping, shifting, and fallback behavior when the preferred position overflows. |
| `collisionPadding`    | `number \| { top?: number; right?: number; bottom?: number; left?: number } \| undefined` | `5`        | Maintains space between the positioner and its collision boundary.                        |
| `sticky`              | `boolean \| undefined`                                                                    | `false`    | Keeps the popup in view after its trigger scrolls outside the viewport.                   |
| `className`           | `string \| ((state: TooltipPopup.State) => string \| undefined) \| undefined`             | —          | Adds classes to the popup, optionally from its current state.                             |

## Accessibility

Base UI tooltips are visual labels rather than accessible descriptions. Give the trigger an accessible name that closely matches the tooltip text; do not use a tooltip as the only label or source of important information. Tooltips open from pointer hover or keyboard focus and close when the trigger activates or Escape is pressed. Keep content short and noninteractive; use visible text or a popover when the content must be available to touch or assistive technology users.

## Source

[Implementation](https://github.com/pbroom/control-kit/blob/main/src/tooltip.tsx) · [Tests](https://github.com/pbroom/control-kit/blob/main/__tests__/tooltip.test.tsx) · [Base UI Tooltip API](https://base-ui.com/react/components/tooltip#api-reference) · [Issues](https://github.com/pbroom/control-kit/issues)
