---
name: control-kit
description: Builds operational controls with @pbroom/control-kit in React, such as numeric fields with scrubbing and expressions, grouped numeric editors, sliders, 2D planes with thumbs and snapping, tabs, toggle groups, checkboxes and tooltips. Use whenever a project has @pbroom/control-kit installed or the user mentions Control Kit.
---

# Build with Control Kit

Control Kit is a set of styled React 19 controls for tools that edit values: numbers, positions, colors. Most components wrap a Base UI primitive and add a compact visual treatment; `Plane` and `ControlField`'s scrubbing and expressions are Control Kit's own.

## Read first

The docs for the installed version ship in the package, as Markdown:

- `node_modules/@pbroom/control-kit/docs/llms.txt` is the index. Read it first.
- Then read only the page for the component you're using, like `docs/plane.md`. Each page has usage, examples, accessibility notes and an API reference.
- `node_modules/@pbroom/control-kit/README.md` covers installation, Tailwind setup, theming tokens and migrations.
- The `.d.ts` types are the API. Don't read compiled JavaScript in `dist/`; when the docs and types don't answer, write a small test that tries it.

If the package isn't installed yet, add it with its peer, using the project's package manager:

```sh
pnpm add @pbroom/control-kit@next @base-ui/react
```

Releases are on the `next` dist-tag, so the untagged name doesn't resolve.

## Set up styles

Components render Tailwind v4 utility classes, so the app's Tailwind build must scan the package. Import the preset after Tailwind:

```css
@import 'tailwindcss';
@import '@pbroom/control-kit/tailwind.css';
```

Colors come from `--ck-*` custom properties with dark defaults. Set `data-ck-theme="light"` on `<html>` or a container for the light preset, and override any token on a containing element to retheme. The theme doesn't follow `prefers-color-scheme` by itself. Tooltip content is portaled to `document.body`, so put shared tokens on `:root` or `body`.

## Rules

- **Import from the root.** Everything comes from `@pbroom/control-kit`; there are no per-component entries.
- **Default or controlled.** `ControlField`, `ControlInput`, `Slider`, `PlaneThumb`, `Tabs` and `ToggleGroup` take `defaultValue` to start, or `value` with `onValueChange` to control them. A controlled control only moves when its `value` changes. Two controls differ: `Checkbox` is always controlled, with `checked` and `onCheckedChange`, and `MultiInputControl` takes `values` with `onFieldChange(field, value)`.
- **Live or committed.** `onValueChange` runs on every change, including each step of a drag or scrub. Put saving and expensive work in `onValueCommitted`, which runs once when the interaction ends. `ControlField`, `ControlInput`, `Slider` and `PlaneThumb` have it; `MultiInputControl` calls it `onFieldCommit(field, value)`. `Tabs`, `ToggleGroup` and `Checkbox` change once per press and have no commit callback.
- **Name every control.** Give it a `label` or `aria-label`. `PlaneThumb` takes `xAriaLabel` and `yAriaLabel`, and `getAriaValueText` for values in the domain's own words.
- **Pick the numeric control by need.** `ControlInput` is the ready-made compact field with a scrub handle and unit. Compose `ControlField` parts only for a custom layout. `MultiInputControl` groups several fields, like X and Y.
- **Query a numeric field as a textbox in tests.** It keeps Base UI's number field semantics and has no `role="spinbutton"`.
- **Plane values are normalized.** Top-level thumbs are `0..1` on each axis, with Y increasing from bottom to top. Nested thumbs are signed offsets from their parent. Map to domain units in your own code.
- **Don't clip a Plane root.** A thumb is centred on its value, so at an edge half of it sits outside. Keep the root `overflow: visible` and clip surface content in an inner layer.
- **Change a rendered element with `render`**, as Base UI does: `<TooltipTrigger render={<button type="button" />} />`. There is no `asChild`.
- **Don't use the deprecated `PrimitiveValueInput` family** in new code. The README maps each of its props to `ControlInput`.

## When you're done

1. Typecheck the project.
2. Check each control with the keyboard. In numeric fields and planes, arrows step, Shift takes the large step and Alt/Option the small one.
3. Report anything the docs or types got wrong or left out.
