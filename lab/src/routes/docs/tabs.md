# Tabs

A styled tab set for switching between related sections of content. Built on [Radix Tabs](https://www.radix-ui.com/primitives/docs/components/tabs); Control Kit adds its compact visual treatment and stable styling hooks.

<!-- demo:basic -->

## Usage

Match every trigger value to one content value and place triggers inside `TabsList`:

```tsx
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@color-kit/control-kit';

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

Set `activationMode="manual"` when moving focus should not switch potentially expensive content. Arrow keys move focus; Space or Enter activates the focused tab.

<!-- demo:manual -->

### Disabled tab

Disable an unavailable trigger without removing it from the list.

<!-- demo:disabled -->

### Controlled selection

Use `value` and `onValueChange` when another part of the application owns the active tab.

```tsx
const [tab, setTab] = React.useState('canvas');

<Tabs value={tab} onValueChange={setTab}>
  <TabsList aria-label="Settings">
    <TabsTrigger value="canvas">Canvas</TabsTrigger>
    <TabsTrigger value="export">Export</TabsTrigger>
  </TabsList>
  <TabsContent value="canvas">Canvas settings</TabsContent>
  <TabsContent value="export">Export settings</TabsContent>
</Tabs>;
```

## API

### Control Kit additions

Control Kit does not add behavioral props. It applies the default layout and visual states and adds `data-slot` attributes to all four parts:

| Part          | Data slot      |
| ------------- | -------------- |
| `Tabs`        | `tabs`         |
| `TabsList`    | `tabs-list`    |
| `TabsTrigger` | `tabs-trigger` |
| `TabsContent` | `tabs-content` |

Each part accepts `className` for composition-specific layout adjustments.

### Important forwarded props

| Part          | Props                                                                            |
| ------------- | -------------------------------------------------------------------------------- |
| `Tabs`        | `value`, `defaultValue`, `onValueChange`, `activationMode`, `dir`, `orientation` |
| `TabsList`    | `loop`, `asChild`, native `div` props                                            |
| `TabsTrigger` | `value`, `disabled`, `asChild`, native button props                              |
| `TabsContent` | `value`, `forceMount`, `asChild`, native `div` props                             |

See the [Radix Tabs API reference](https://www.radix-ui.com/primitives/docs/components/tabs#api-reference) for the complete upstream contract.

## Accessibility

The list, triggers, and panels use the tabs pattern and maintain the required relationships automatically. Horizontal lists use Left and Right Arrow; vertical lists use Up and Down Arrow. Home and End move to the first and last enabled tabs.

## Source

[Implementation](https://github.com/pbroom/control-kit/blob/main/src/tabs.tsx) · [Tests](https://github.com/pbroom/control-kit/blob/main/__tests__/tabs.test.tsx) · [Radix Tabs API](https://www.radix-ui.com/primitives/docs/components/tabs#api-reference) · [Issues](https://github.com/pbroom/control-kit/issues)
