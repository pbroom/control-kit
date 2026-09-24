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

- `ToggleGroup` `required` prop (single mode only). When `true`, clicking or
  keyboard-toggling the pressed item no longer deselects it, so the group
  always keeps a selection.

### Changed

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

- **Breaking:** In single mode, `ToggleGroup` now reports deselection through
  `value`/`onValueChange` as `null` instead of `undefined`, and accepts
  `value`/`defaultValue` of `string | null` (in addition to `undefined`).
  `null` renders nothing pressed while keeping the group controlled;
  `undefined` still means uncontrolled. Update consumers that stored the
  callback value directly in state typed as `string | undefined`, or that
  compared it to `undefined`, to use `string | null` instead.

### Deprecated

- `PlaneThumb` `onValueCommit` is a deprecated alias for `onValueCommitted`
  and will be removed in a future release. Rename the prop; no other change is
  needed.

### Fixed

- `ToggleGroup` single mode: deselecting the pressed item while controlled no
  longer flips the underlying Base UI Toggle Group into an uncontrolled
  state (previously reported via `onValueChange(undefined, …)`, which caused
  Base UI to warn about changing a controlled component to uncontrolled and
  ignore subsequent `value` updates from the parent).

## 0.0.1

Initial standalone release, extracted from the `packages/control-kit`
workspace package in `color-kit`. Includes `Checkbox`, `Tabs`, `ToggleGroup`,
`Tooltip`, `PrimitiveValueInput`, and `MultiInputControl`.
