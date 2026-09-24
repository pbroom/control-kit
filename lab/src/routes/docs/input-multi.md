# Input Multi

A grouped numeric editor that composes several [Control Input](/docs/input-primitive) segments into one compact control.

<!-- demo:basic -->

## Anatomy

Define fields, per-field configuration, and controlled values:

```tsx
import { MultiInputControl } from 'control-kit';

<MultiInputControl
  fields={fields}
  config={config}
  values={values}
  onFieldChange={(field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
  }}
  onFieldCommit={(field, value) => save(field, value)}
/>;
```

`MultiInputControl` renders the group and one `MultiInputSegment` per field. Each segment is an embedded `ControlInput`, so editing, expressions, keyboard stepping, and scrubbing follow [Control Field](/docs/control-field). The field ID type is preserved through values, configuration, and callbacks.

## Usage guidelines

- Keep the `fields`, `values`, and `config` records keyed by the same field-ID union.
- Use `displayScale` when stored and displayed values use different units, such as storing opacity from `0` to `1` while displaying percent.
- Use `unit` for a trailing scrub handle and `showLeadingLabels` when compact field labels are needed inside the group.
- Prefer the `segments` form when data has already been normalized with `createMultiInputSegments`.
- `onFieldChange` fires for every change, including each parseable keystroke. Put expensive work in `onFieldCommit`, which fires once per finished edit.

## Configuration

Every segment has independent bounds, stepping, precision, wrapping, and disabled state. Only `min` and `max` are required; `step` defaults to `1`, `fineStep` to `0.1`, `coarseStep` to `10`, `pageStep` to `coarseStep`, `wrapMode` to `'clamp'`, and `autoTrim` to `true`. `createMultiInputSegments` validates that each field has a corresponding value and configuration entry before rendering.

## API reference

### MultiInputControl

Accepts either `fields` + `values` + `config`, or precomputed `segments`. Both forms require `onFieldChange`.

<!-- props:multi-input -->

**Data attributes**

| Attribute                  | When present                          |
| -------------------------- | ------------------------------------- |
| `data-scrubbing`           | While any segment is being scrubbed.  |
| `data-multi-input-segment` | Always on each rendered segment root. |

### MultiInputSegment

Renders one configured field through `ControlInput` and reports scrub state to the containing control.

`MultiInputControl` is the preferred composition and supplies the shared `TooltipProvider`. When rendering `MultiInputSegment` directly, wrap the related segments in a `TooltipProvider`.

<!-- props:multi-input-segment -->

### createMultiInputSegments

Joins field metadata with controlled values and configuration before rendering:

```tsx
import { createMultiInputSegments } from 'control-kit';

const segments = createMultiInputSegments({ fields, values, config });
```

The helper returns `MultiInputSegmentModel[]`. It throws when a field is missing a corresponding value or configuration entry.

## Accessibility

Each segment is a labelled Base UI number field text input. The field's `tooltip` supplies its accessible label and supplemental tooltip text. Keyboard stepping, draft editing, invalid state, and pointer scrubbing follow Control Field behavior.

Focus can move between segments with Tab. Group hover, focus, and scrubbing affect only the shared visual border; they do not replace the semantics of the individual inputs.

## Types

| Type                              | Contract                                                      |
| --------------------------------- | ------------------------------------------------------------- |
| `MultiInputField`                 | Field ID, label, tooltip, optional unit, weight, and scale.   |
| `MultiInputFieldId`               | String field identifier used by the generic records.          |
| `MultiInputSegmentConfig`         | Required bounds plus optional steps, precision, and wrapping. |
| `MultiInputConfig`                | Configuration record keyed by field ID.                       |
| `MultiInputValues`                | Numeric value record keyed by field ID.                       |
| `MultiInputSegmentModel`          | A field joined with its value and configuration.              |
| `CreateMultiInputSegmentsOptions` | Fields, values, and configuration accepted by the helper.     |

The root package does not currently export named prop types for `MultiInputControl` or `MultiInputSegment`. Use `React.ComponentProps<typeof MultiInputControl>` or `React.ComponentProps<typeof MultiInputSegment>` when a reusable prop type is needed.

## Source

[Implementation](https://github.com/pbroom/control-kit/blob/main/src/multi-input-control.tsx) · [Control Input](https://github.com/pbroom/control-kit/blob/main/src/control-input.tsx) · [Tests](https://github.com/pbroom/control-kit/blob/main/__tests__/multi-input-control.test.tsx) · [Issues](https://github.com/pbroom/control-kit/issues)
