# Tabs

A styled tab set for switching between related sections of content. Built on [Base UI Tabs](https://base-ui.com/react/components/tabs); Control Kit adds its compact visual treatment and stable styling hooks.

Example: Tabs

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@pbroom/control-kit';

export function TabsExample() {
  return (
    <div className="flex min-h-[280px] items-center justify-center p-8">
      <Tabs className="w-full max-w-sm" defaultValue="canvas">
        <TabsList aria-label="Settings">
          <TabsTrigger value="canvas">Canvas</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>
        <TabsContent value="canvas">
          Configure the canvas grid, guides, and snapping behavior.
        </TabsContent>
        <TabsContent value="export">
          Choose the output format, scale, and color profile.
        </TabsContent>
      </Tabs>
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

3. Import the Tabs parts from `@pbroom/control-kit` as shown below.

## Usage

Match every trigger value to one content value and place triggers inside `TabsList`:

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@pbroom/control-kit';

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

Example: Manual tabs

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@pbroom/control-kit';

export function TabsManualExample() {
  return (
    <div className="flex min-h-[280px] items-center justify-center p-8">
      <Tabs className="w-full max-w-sm" defaultValue="local">
        <TabsList activateOnFocus={false} aria-label="Storage location">
          <TabsTrigger value="local">Local</TabsTrigger>
          <TabsTrigger value="cloud">Cloud</TabsTrigger>
          <TabsTrigger value="archive">Archive</TabsTrigger>
        </TabsList>
        <TabsContent value="local">Saved on this device.</TabsContent>
        <TabsContent value="cloud">
          Synced across signed-in devices.
        </TabsContent>
        <TabsContent value="archive">Stored for long-term access.</TabsContent>
      </Tabs>
    </div>
  );
}
```

### Disabled tab

Disable an unavailable trigger without removing it from the list.

Example: Disabled tab

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@pbroom/control-kit';

export function TabsDisabledExample() {
  return (
    <div className="flex min-h-[280px] items-center justify-center p-8">
      <Tabs className="w-full max-w-sm" defaultValue="overview">
        <TabsList aria-label="Project">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger disabled value="billing">
            Billing
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview">Project summary and status.</TabsContent>
        <TabsContent value="activity">Recent project changes.</TabsContent>
        <TabsContent value="billing">Billing is unavailable.</TabsContent>
      </Tabs>
    </div>
  );
}
```

### Controlled selection

Use `value` and `onValueChange` when another part of the application owns the active tab.

Example: Controlled tabs

```tsx
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@pbroom/control-kit';

export function TabsControlledExample() {
  const [tab, setTab] = useState('canvas');

  return (
    <div className="flex min-h-[280px] items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList aria-label="Settings">
            <TabsTrigger value="canvas">Canvas</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>
          <TabsContent value="canvas">Canvas settings</TabsContent>
          <TabsContent value="export">Export settings</TabsContent>
        </Tabs>
        <p className="text-muted-foreground mt-3 text-xs">Active tab: {tab}</p>
      </div>
    </div>
  );
}
```

## API reference

Control Kit applies the default layout and visual states and keeps automatic activation as its default by setting `activateOnFocus` on `TabsList` to `true`. Every part otherwise accepts the corresponding Base UI props. See the [Base UI Tabs API reference](https://base-ui.com/react/components/tabs#api-reference) for the complete upstream contract.

### Tabs

Owns the selected value and keyboard-navigation behavior. Renders a `div` with `data-slot="tabs"`.

Props for `Tabs`:

| Prop            | Type                                                             | Default        | Description                                                                    |
| --------------- | ---------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------ |
| `value`         | `any \| null \| undefined`                                       | —              | The controlled value of the active tab. Pass null to leave every tab inactive. |
| `defaultValue`  | `any \| null \| undefined`                                       | `0`            | The initially active tab in uncontrolled mode.                                 |
| `onValueChange` | `(value: any \| null, eventDetails: ChangeEventDetails) => void` | —              | Called when the active tab changes.                                            |
| `orientation`   | `'horizontal' \| 'vertical' \| undefined`                        | `'horizontal'` | Sets the tab list orientation and arrow-key direction.                         |

### TabsList

Groups the triggers and establishes roving keyboard focus. Renders a `div` with `data-slot="tabs-list"`.

Props for `TabsList`:

| Prop              | Type                   | Default | Description                                                                |
| ----------------- | ---------------------- | ------- | -------------------------------------------------------------------------- |
| `activateOnFocus` | `boolean \| undefined` | `true`  | Controls whether arrow-key focus also activates the focused trigger.       |
| `loopFocus`       | `boolean \| undefined` | `true`  | Controls whether arrow-key focus wraps between the first and last trigger. |
| `className`       | `string \| undefined`  | —       | Adds classes to the tab list.                                              |

### TabsTrigger

Selects the content with the matching value. Renders a `button` with `data-slot="tabs-trigger"`.

Props for `TabsTrigger`:

| Prop               | Type                                                            | Default | Description                                                         |
| ------------------ | --------------------------------------------------------------- | ------- | ------------------------------------------------------------------- |
| `value` (required) | `string`                                                        | —       | Associates the trigger with the content of the same value.          |
| `disabled`         | `boolean \| undefined`                                          | `false` | Prevents the trigger from receiving focus or activation.            |
| `render`           | `ReactElement \| ((props, state) => ReactElement) \| undefined` | —       | Replaces the trigger element or composes it with another component. |
| `className`        | `string \| undefined`                                           | —       | Adds classes to the trigger.                                        |

### TabsContent

Renders the panel associated with a trigger value. Renders a `div` with `data-slot="tabs-content"`.

Props for `TabsContent`:

| Prop               | Type                                                            | Default | Description                                                                      |
| ------------------ | --------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------- |
| `value` (required) | `string`                                                        | —       | Associates the panel with the trigger of the same value.                         |
| `keepMounted`      | `boolean \| undefined`                                          | `false` | Keeps the panel mounted when inactive for animation or state-preservation needs. |
| `render`           | `ReactElement \| ((props, state) => ReactElement) \| undefined` | —       | Replaces the panel element or composes it with another component.                |
| `className`        | `string \| undefined`                                           | —       | Adds classes to the tab panel.                                                   |

## Accessibility

The list, triggers, and panels use the tabs pattern and maintain the required relationships automatically. Horizontal lists use Left and Right Arrow; vertical lists use Up and Down Arrow. Home and End move to the first and last enabled tabs.

## Source

[Implementation](https://github.com/pbroom/control-kit/blob/main/src/tabs.tsx) · [Tests](https://github.com/pbroom/control-kit/blob/main/__tests__/tabs.test.tsx) · [Base UI Tabs API](https://base-ui.com/react/components/tabs#api-reference) · [Issues](https://github.com/pbroom/control-kit/issues)
