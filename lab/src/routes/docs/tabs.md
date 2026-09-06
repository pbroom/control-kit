# Tabs

A styled tab set for switching between related sections of content. Built on [Base UI Tabs](https://base-ui.com/react/components/tabs); Control Kit adds its compact visual treatment and stable styling hooks.

<!-- demo:basic -->

## Installation

### Manual

1. Install Control Kit and its peer dependencies:

   ```bash
   pnpm add --allow-build=control-kit control-kit@github:pbroom/control-kit @base-ui/react
   ```

2. Add the package source to Tailwind's content graph:

   ```css
   @source '../node_modules/control-kit/src';
   ```

3. Import the Tabs parts from `control-kit` as shown below.

## Usage

Match every trigger value to one content value and place triggers inside `TabsList`:

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'control-kit';

<Tabs defaultValue="canvas">
  <TabsList aria-label="Settings">
    <TabsTrigger value="canvas">Canvas</TabsTrigger>
    <TabsTrigger value="export">Export</TabsTrigger>
  </TabsList>
  <TabsContent value="canvas">Canvas settings</TabsContent>
  <TabsContent value="export">Export settings</TabsContent>
</Tabs>;
```

## Composition

- `Tabs` owns the selected value and keyboard-navigation behavior.
- `TabsList` groups the triggers and defines the tab list.
- `TabsTrigger` selects the content with the matching `value`.
- `TabsContent` renders the associated tab panel.

## Examples

### Manual activation

Set `activateOnFocus={false}` on `TabsList` when moving focus should not switch potentially expensive content. Arrow keys move focus; Space or Enter activates the focused tab.

<!-- demo:manual -->

### Disabled tab

Disable an unavailable trigger without removing it from the list.

<!-- demo:disabled -->

### Controlled selection

Use `value` and `onValueChange` when another part of the application owns the active tab.

<!-- demo:controlled -->

## API reference

Control Kit applies the default layout and visual states and keeps automatic activation as its default by setting `activateOnFocus` on `TabsList` to `true`. Every part otherwise accepts the corresponding Base UI props. See the [Base UI Tabs API reference](https://base-ui.com/react/components/tabs#api-reference) for the complete upstream contract.

### Tabs

Owns the selected value and keyboard-navigation behavior. Renders a `div` with `data-slot="tabs"`.

<!-- props:tabs -->

### TabsList

Groups the triggers and establishes roving keyboard focus. Renders a `div` with `data-slot="tabs-list"`.

<!-- props:tabs-list -->

### TabsTrigger

Selects the content with the matching value. Renders a `button` with `data-slot="tabs-trigger"`.

<!-- props:tabs-trigger -->

### TabsContent

Renders the panel associated with a trigger value. Renders a `div` with `data-slot="tabs-content"`.

<!-- props:tabs-content -->

## Accessibility

The list, triggers, and panels use the tabs pattern and maintain the required relationships automatically. Horizontal lists use Left and Right Arrow; vertical lists use Up and Down Arrow. Home and End move to the first and last enabled tabs.

## Source

[Implementation](https://github.com/pbroom/control-kit/blob/main/src/tabs.tsx) · [Tests](https://github.com/pbroom/control-kit/blob/main/__tests__/tabs.test.tsx) · [Base UI Tabs API](https://base-ui.com/react/components/tabs#api-reference) · [Issues](https://github.com/pbroom/control-kit/issues)
