# Changelog

All notable changes to `control-kit` are documented here. The
format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
the package adheres to [Semantic Versioning](https://semver.org/).

## Unreleased

These entries will ship as `0.1.0-next.0`, the first npm release, under the
`next` dist-tag. When it is published, rename this heading to
`## 0.1.0-next.0 - YYYY-MM-DD` with the publish date and start a new empty
Unreleased section.

### Added

- `ControlField` is now the single numeric input primitive. `Root` gains
  `boundaryBehavior="free"`, `precision` and `trimTrailingZeros` (a display
  format that never rounds the value), `selectOnFocus`, `commitOnBlur`,
  `arrowKeys="both"`, and `onInvalidCommit`. It owns keyboard stepping, so
  Alt/Option uses `smallStep` and Shift uses `largeStep` for arrow keys, and
  `pageStep` defaults to `largeStep`. Enter commits typed text in place and
  Escape restores the last committed value. Expression resolvers receive
  that value as `startValue`, plus `range`. `getControlFieldInteraction(details)`
  maps change or commit details to `'text-input'`, `'keyboard'`, or
  `'pointer'`.
- `ControlField.ScrubArea` runs on a precise scrub engine: `pixelsPerStep` or
  whole-step `stepDistance`, `threshold`, `commitThreshold`, `maxCommitRate`,
  opt-in `pointerLock`, and `onScrubbingChange`. Shift/Alt changes and clamp
  edges rebase the drag so earlier movement is kept, the input selection is
  preserved, `data-scrubbing` is set on Root and Group, and
  `onValueCommitted` fires once on release.
- `ControlInput`, a compact preset over ControlField parts with `label`,
  `size`, `density`, `variant`, `unit`, and a leading or trailing scrub
  `handle`. Every prop is optional.
- `MultiInputControl` `onFieldCommit` fires once per finished edit, and
  `expressionResolver` sets the resolver for every field.

- Published to npm as `control-kit` under the `next` dist-tag:
  `pnpm add control-kit@next @base-ui/react`. The GitHub install remains
  available for unreleased changes. A manual Release workflow publishes with
  npm provenance, and `prepublishOnly` typechecks, tests, and rebuilds
  `dist/` before any publish.

- `control-kit/theme.css` defines every `--ck-*` token with the dark
  defaults on `:root` and a light preset opted into with
  `data-ck-theme="light"`. `control-kit/tailwind.css` is a Tailwind v4 preset
  that includes the theme, registers the package source with `@source`, and
  maps the tokens to `ck-*` color utilities such as `bg-ck-surface` and
  `ring-ck-accent`. Replace a manual `@source` with
  `@import 'control-kit/tailwind.css';`.

- Reworked the Mesh gradient example with continuous Oklab color blending,
  curved flow, six draggable color points, editable palettes, grain controls,
  and a software rendering fallback.

- `Plane dragBehavior="relative"` preserves the grabbed offset while dragging.
  `PlaneThumb pressBehavior="none"` opts out of empty-space selection while
  keeping direct dragging and keyboard controls. An image-pan and focal-point
  example demonstrates both options together.

- `Plane` and `PlaneThumb` primitives for composable normalized two-dimensional
  interaction with pointer, keyboard, and accessible axis controls.
- Normalized mouse and pen hover reporting for `Plane`, plus `data-hovered` and
  context state for `PlaneThumb`.
- `smallStep` on `PlaneThumb` for Alt/Option-modified arrow movement.
- `--ck-*` CSS custom property theme tokens for component palette colors,
  exported as `controlKitColor` for inline-style use, with dark defaults.
- Continuous integration via GitHub Actions: formatting, typechecking, unit
  tests, package build, and lab smoke tests run on every push and pull
  request.
- Unit tests for `Checkbox`, `Tabs`, `ToggleGroup`, and the `Tooltip` handoff
  animation behavior.

### Changed

- `PrimitiveValueInput` now renders `ControlInput`. Its props and callback
  semantics are unchanged, with these differences: the input keeps Base UI
  number field semantics instead of `role="spinbutton"` (query it as a
  textbox); an empty draft reverts and reports `onInvalidCommit('')` instead of
  committing `0` (bug fix); and letters are blocked while typing unless
  `parseExpression` is set.
- `MultiInputControl` segments are `ControlInput`s. Per-field config only
  requires `min` and `max`. `onFieldChange` now also reports parseable
  keystrokes (use `onFieldCommit` for expensive work), fields resolve
  arithmetic expressions by default, and Enter commits without blurring.
- `ControlField.ScrubArea` no longer uses Base UI's scrub area. Pointer lock is
  off by default (`pointerLock` opts in), and its Base UI props
  (`direction`, `pixelSensitivity`, `teleportDistance`, `render`) are replaced
  by the scrub engine props. Scrubbing feels different in existing
  compositions, such as the Bezier control point example: movement tracks the
  real pointer at one step per pixel and stops at the screen edge.
- ControlField no longer lets Base UI round values to the display `format`.
  Controlled values are not rewritten on focus and blur, and keyboard, button,
  and scrub steps keep their full precision. Typed text still rounds to an
  explicit rounding `format` when it is committed.
- `ControlField` `onValueChange` fires for every parseable keystroke, as Base
  UI does; `onValueCommitted` fires once per finished edit.

- Renamed the standalone package from `@color-kit/control-kit` to `control-kit`.
  Replace the dependency and import specifiers, and update Tailwind source paths
  from `node_modules/@color-kit/control-kit/src` to `node_modules/control-kit/src`.
  Root exports are unchanged. See the [installation instructions](./README.md#install)
  for the npm and GitHub install commands.

- Tooltip now forwards Base UI props: replace provider `delayDuration` with
  `delay`, `skipDelayDuration` with `timeout`, and trigger `asChild` with
  `render`. The import names remain the same, but earlier Radix-based
  consumers require a migration. See the [before and after example](https://github.com/pbroom/control-kit/blob/main/lab/src/routes/docs/tooltip.md#upgrading-from-the-radix-based-tooltip).
- The headless primitive peer is now `@base-ui/react` `^1.7.0`; the package
  no longer requires `radix-ui`. Review forwarded component props before
  upgrading an existing consumer.
- Tooltip and ToggleGroup now use the documented `--ck-*` palette instead of
  host Tailwind theme names. Apps that previously styled them through
  `background`, `foreground`, `muted`, `border`, or `ring` must map their
  desired colors to the package tokens. Tooltip themes must reach its portal
  location or be applied directly to `TooltipContent`.
- `primitive-value-input.tsx` split into three modules: pure value helpers
  (`primitive-value-input-helpers.ts`), the stateful hook
  (`use-primitive-value-input.ts`), and the component. All existing import
  paths and exports are unchanged.
- `PlaneThumb` now names its commit callback `onValueCommitted`, matching
  `ControlField` and Base UI. It has the same signature and fires at the same
  times as the previous `onValueCommit`. When both props are passed, only
  `onValueCommitted` is called.
- `plane.tsx` split into focused modules under `src/plane/` (types, geometry,
  keyboard, context, hover tracking, `Plane`, and `PlaneThumb`). Root exports
  and their types are unchanged.

### Deprecated

- `PrimitiveValueInput`, `PrimitiveValueInputProps`, `usePrimitiveValueInput`,
  `UsePrimitiveValueInputOptions`, and the helpers `formatPrimitiveValue`,
  `getPrimitiveModifiedStep`, `getPrimitiveSteppedValue`,
  `normalizePrimitivePrecision`, `normalizePrimitiveScrubMultiplier`,
  `normalizePrimitiveValue`, and `parsePrimitiveDraft` are deprecated and will
  be removed in a future release. Use `ControlInput` or `ControlField`; the
  README has a prop migration table.
- `ControlField.ScrubAreaCursor` renders nothing and will be removed.
- `MultiInputControl` and `MultiInputSegment` `parseExpression` are deprecated
  in favor of `expressionResolver`.
- `PlaneThumb` `onValueCommit` is a deprecated alias for `onValueCommitted`
  and will be removed in a future release. Rename the prop; no other change is
  needed.

## 0.0.1

Initial standalone release, extracted from the `packages/control-kit`
workspace package in `color-kit`. Includes `Checkbox`, `Tabs`, `ToggleGroup`,
`Tooltip`, `PrimitiveValueInput`, and `MultiInputControl`.
