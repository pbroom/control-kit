# Changelog

All notable changes to `control-kit` are documented here. The
format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
the package adheres to [Semantic Versioning](https://semver.org/).

## Unreleased

### Added

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

- Renamed the standalone package from `@color-kit/control-kit` to `control-kit`.
  Replace the dependency and import specifiers, and update Tailwind source paths
  from `node_modules/@color-kit/control-kit/src` to `node_modules/control-kit/src`.
  Root exports are unchanged. See the [installation instructions](./README.md#install)
  for the GitHub install command.

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

## 0.0.1

Initial standalone release, extracted from the `packages/control-kit`
workspace package in `color-kit`. Includes `Checkbox`, `Tabs`, `ToggleGroup`,
`Tooltip`, `PrimitiveValueInput`, and `MultiInputControl`.
