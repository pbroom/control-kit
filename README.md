# @color-kit/control-kit

React UI primitives for building operational color controls.

This package is published from [pbroom/control-kit](https://github.com/pbroom/control-kit) and keeps the same public package name and exports as the former `packages/control-kit` workspace package in `color-kit`.

## Install

```sh
pnpm add @color-kit/control-kit
```

When consuming directly from GitHub:

```sh
pnpm add github:pbroom/control-kit
```

The package builds ESM, CommonJS, and TypeScript declarations into `dist/`. Git installs run the `prepare` script so consumers receive the compiled entrypoints.

## Tailwind

The components render Tailwind utility class names. Apps that purge or source-scan dependencies should include this package in their Tailwind content graph. The published package includes `src/` as well as `dist/` so Tailwind v4 consumers can source either path.

```css
@source '../node_modules/@color-kit/control-kit/src';
```

## Development

```sh
pnpm install
pnpm build
pnpm test
pnpm typecheck
```
