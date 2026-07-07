# Changelog

All notable changes to `@color-kit/control-kit` are documented here. The
format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
the package adheres to [Semantic Versioning](https://semver.org/).

## Unreleased

### Added

- `--ck-*` CSS custom property theme tokens for all component colors, exported
  as `controlKitColor` for inline-style use. Defaults preserve the original
  dark palette, so existing consumers are unaffected.
- Continuous integration via GitHub Actions: formatting, typechecking, unit
  tests, package build, and lab smoke tests run on every push and pull
  request.
- Unit tests for `Checkbox`, `Tabs`, `ToggleGroup`, and the `Tooltip` handoff
  animation behavior.

### Changed

- `primitive-value-input.tsx` split into three modules: pure value helpers
  (`primitive-value-input-helpers.ts`), the stateful hook
  (`use-primitive-value-input.ts`), and the component. All existing import
  paths and exports are unchanged.

## 0.0.1

Initial standalone release, extracted from the `packages/control-kit`
workspace package in `color-kit`. Includes `Checkbox`, `Tabs`, `ToggleGroup`,
`Tooltip`, `PrimitiveValueInput`, and `MultiInputControl`.
