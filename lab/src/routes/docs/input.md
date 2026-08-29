# Input Primitive

A numeric text input with keyboard stepping, expression parsing, and pointer scrubbing. It keeps draft editing separate from committed numeric values.

> Legacy — This API remains available for compatibility while the Base UI-backed [Control Field](/docs/control-field) component is evaluated. Prefer Control Field for new compositions.

<!-- demo:basic -->

## Anatomy

`PrimitiveValueInput` is a single composed control:

```tsx
import { PrimitiveValueInput } from '@color-kit/control-kit';

<PrimitiveValueInput
  value={value}
  onValueChange={setValue}
  ariaLabel="Opacity"
  min={0}
  max={100}
  step={1}
  fineStep={0.1}
  coarseStep={10}
  pageStep={10}
  wrapMode="clamp"
  precision={1}
  autoTrim
  allowExpressions={false}
  selectAllOnFocus
  commitOnBlur
  scrubEnabled
  scrubThreshold={2}
  pointerLockEnabled={false}
  disabled={false}
  readOnly={false}
  visualState="auto"
  size="sm"
/>;
```

The component renders a `spinbutton` text input inside a visual root. When scrubbing is enabled, a pointer handle is rendered before or after the input.

## Usage guidelines

- Update `value` from `onValueChange`; the component is controlled and never owns the committed number.
- Use `wrapMode="clamp"` for bounded values, `"wrap"` for cyclic values, and `"free"` for unbounded editing.
- Keep `step`, modifier steps, page step, and precision aligned with the domain being edited.
- Supply `parseExpression` to customize draft parsing. It receives `allowExpressions`, the current value, and the active range. Use `onInvalidCommit` when invalid drafts need application feedback.

## Editing and commits

Text entry remains a draft until Enter or the configured blur behavior commits it. Escape restores the committed value. `onValueChange` receives interaction details so application work can distinguish text entry, keyboard stepping, and scrubbing.

## Pointer scrubbing

Set `scrubEnabled` to render the scrub handle. `scrubThreshold` controls when a pointer movement becomes a scrub; `scrubPixelsPerStep` or `stepDragDistance` controls the movement distance per step. Pointer lock is optional and should only be enabled where an unbounded drag is expected.

## API reference

### PrimitiveValueInput

`PrimitiveValueInputProps` defines the value model, stepping, draft behavior, scrub behavior, and visual options.

<!-- props:input -->

**Data attributes**

| Attribute                       | When present                            |
| ------------------------------- | --------------------------------------- |
| `data-scrubbing`                | While pointer scrubbing is active.      |
| `data-valid`                    | When the current visual state is valid. |
| `data-control-kit-scrub-handle` | Always on the rendered scrub handle.    |

## Accessibility

The text input has `role="spinbutton"` and reports its current value and invalid state. Finite clamp and wrap modes also report their minimum and maximum; free mode leaves those bounds unspecified. `ariaLabel` names the control when no visible label is associated.

Up and Down Arrow step the value. Alt/Option uses `fineStep`, Shift uses `coarseStep`, Page Up and Page Down use `pageStep`, and Home or End move to a finite bound. When `horizontalArrowKeysMoveCaret` is true, Left and Right Arrow retain normal text-caret behavior while editing.

The scrub handle is pointer-only and hidden from assistive technology; all value operations remain available from the input.

## Types

| Type                            | Contract                                              |
| ------------------------------- | ----------------------------------------------------- |
| `PrimitiveValueChangeDetails`   | Interaction category for a published value change.    |
| `PrimitiveValueInteraction`     | `'text-input'`, `'keyboard'`, or `'pointer'`.         |
| `PrimitiveExpressionParser`     | Draft parser with expression, value, and range input. |
| `PrimitiveStepConfig`           | Standard, fine, coarse, and page increments.          |
| `PrimitiveStepKey`              | Supported stepping keys.                              |
| `PrimitiveSteppedValueOptions`  | Inputs used to resolve one keyboard step.             |
| `PrimitiveWrapMode`             | `'clamp'`, `'wrap'`, or `'free'`.                     |
| `PrimitivePrecision`            | Numeric display precision accepted by the formatter.  |
| `PrimitiveSize`                 | `'sm'`, `'md'`, `'lg'`, or `'full'`.                  |
| `PrimitiveDensity`              | `'compact'` or `'comfortable'`.                       |
| `PrimitiveHandleSide`           | `'leading'` or `'trailing'`.                          |
| `PrimitiveVisualState`          | `'auto'`, `'valid'`, or `'invalid'`.                  |
| `PrimitiveVisualTreatment`      | `'default'` or `'embedded'`.                          |
| `UsePrimitiveValueInputOptions` | State and interaction options accepted by the hook.   |

## Hook and utilities

`usePrimitiveValueInput(options)` exposes the input and scrub-handle refs, state, formatted draft, ARIA value, and event props used by `PrimitiveValueInput`.

| Export                              | Purpose                                                     |
| ----------------------------------- | ----------------------------------------------------------- |
| `formatPrimitiveValue`              | Formats a numeric value to the configured precision.        |
| `normalizePrimitivePrecision`       | Clamps and rounds precision to the supported digit range.   |
| `normalizePrimitiveScrubMultiplier` | Normalizes a finite scrub-speed multiplier.                 |
| `normalizePrimitiveValue`           | Applies free, clamp, or wrap bounds.                        |
| `parsePrimitiveDraft`               | Resolves a draft through the custom parser or numeric cast. |
| `getPrimitiveModifiedStep`          | Selects the normal, fine, or coarse step from modifiers.    |
| `getPrimitiveSteppedValue`          | Resolves the value produced by one supported step key.      |

## Source

[Implementation](https://github.com/pbroom/control-kit/blob/main/src/primitive-value-input.tsx) · [State model](https://github.com/pbroom/control-kit/blob/main/src/use-primitive-value-input.ts) · [Tests](https://github.com/pbroom/control-kit/blob/main/__tests__/primitive-value-input.test.tsx) · [Issues](https://github.com/pbroom/control-kit/issues)
