# Toggle Button

A two-state button that keeps selection separate from transient pointer and keyboard feedback.

> Lab prototype — Toggle Button is not currently exported from `@color-kit/control-kit`. The current implementation is a styled native button used to evaluate Control Kit states and sizing.

<!-- demo:basic -->

## Installation

### Manual

Toggle Button is currently a Lab prototype rather than a package export.

1. Copy the [focused native-button implementation and state styles](https://github.com/pbroom/control-kit/blob/main/lab/src/routes/docs/examples/toggle-button-basic-example.tsx) into your project.
2. Install `lucide-react` if you use the example icons:

   ```bash
   pnpm add lucide-react
   ```

3. Update the local imports and styles to match your project setup.

## Usage

Control the selected state and expose it with `aria-pressed`:

```tsx
const [selected, setSelected] = useState(false);

<button
  type="button"
  aria-pressed={selected}
  onClick={() => setSelected((current) => !current)}
>
  Favorite
</button>;
```

## Composition

- A native `button` supplies activation, focus, and disabled behavior.
- `aria-pressed` communicates the controlled on or off state.
- Visible text or an explicit accessible label names the button.
- CSS data and ARIA selectors style the mirrored selection state and the Lab's forced review state.

## Examples

### Content

The Lab compares icon-only, icon with label, and label-only content. Icon-only buttons carry an accessible label; decorative icons remain hidden from assistive technology.

<!-- demo:content -->

### States

Selection and disabled state remain independent. Hover, focus, and active feedback come from native CSS interaction states.

<!-- demo:states -->

## API

### Current Lab contract

| Input              | Purpose                                                 |
| ------------------ | ------------------------------------------------------- |
| `selected`         | Controls the on or off state.                           |
| `onSelectedChange` | Receives the next selected state after activation.      |
| `disabled`         | Applies native disabled behavior.                       |
| `density`          | Selects compact or comfortable dimensions.              |
| `content`          | Shows an icon, an icon with label, or a label.          |
| `label`            | Supplies visible text or the icon-only accessible name. |
| `interactionState` | Forces hover or pressed visuals for Lab review.         |

These inputs describe the current Lab preview and are not a stable package API. `interactionState` is a visual review override; consumer interaction should use native hover, active, and focus-visible states.

### Data attributes

| Attribute                | Value                                         |
| ------------------------ | --------------------------------------------- |
| `data-selected`          | Mirrors selection as `on` or `off`.           |
| `data-interaction-state` | Exposes the Lab's forced visual review state. |

## Accessibility

Native button semantics preserve Enter and Space activation. `aria-pressed` announces the on or off state, while native `disabled` prevents activation and removes the control from normal focus navigation. Icon-only content uses `aria-label`; visible text supplies the name for the other content modes.

## Source

[Lab page](https://github.com/pbroom/control-kit/blob/main/lab/src/routes/lab/pages/toggle-button.tsx) · [Focused implementation and state styles](https://github.com/pbroom/control-kit/blob/main/lab/src/routes/docs/examples/toggle-button-basic-example.tsx) · [Issues](https://github.com/pbroom/control-kit/issues)
