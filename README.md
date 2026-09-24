# control-kit

React UI primitives for building operational color controls.

Control Kit is a standalone package maintained in [pbroom/control-kit](https://github.com/pbroom/control-kit), with imports from `control-kit`. It was originally extracted from the `packages/control-kit` workspace in Color Kit and does not require Color Kit as a dependency. Component props can change as the API evolves; check the migration guidance before upgrading an existing consumer.

## Install

Install the prerelease from npm together with the Base UI peer:

```sh
pnpm add control-kit@next @base-ui/react
```

Releases are published under the `next` dist-tag while the API settles, so
`control-kit` without a tag does not resolve to them yet. The npm package
ships prebuilt ESM, CommonJS, and TypeScript declarations in `dist/`, plus the
`src/` files that the Tailwind preset scans.

To track unreleased changes, install from this repository instead:

```sh
pnpm add --allow-build=control-kit control-kit@github:pbroom/control-kit @base-ui/react
```

The `--allow-build=control-kit` flag (pnpm 10) allows Git installs to run the `prepare` script so consumers receive the compiled entrypoints. Append `#<commit>` to pin a revision.

## Compatibility

- **React 19 or newer** is required (`react` and `react-dom` are peer
  dependencies with a `>=19.0.0` floor). This is a deliberate choice to build
  on current React semantics rather than carry compatibility shims.
- `@base-ui/react` 1.7 or newer within version 1 is a peer dependency used for the headless primitives.
- Node 18+ is required to build the package.

## Releases

Changes are tracked in [CHANGELOG.md](./CHANGELOG.md). Versions before 1.0
are prereleases published to npm under the `next` dist-tag
(`0.1.0-next.0`, `0.1.0-next.1`, ...); pin an exact version for reproducible
installs.

To cut a release, bump `version` in `package.json`, move the CHANGELOG
entries under the new version heading, and commit. Then publish in one of
two ways:

- **GitHub Actions (preferred):** run the manual **Release** workflow
  (`.github/workflows/release.yml`) on that commit. It runs the format,
  type, unit, and packed-consumer checks, then publishes with npm
  provenance under the chosen dist-tag (default `next`). It needs an
  `NPM_TOKEN` repository secret; enable **dry-run** to rehearse without
  uploading.
- **Locally:** `pnpm publish --tag next` while logged in to npm with
  publish rights. The `prepublishOnly` script typechecks, tests, and
  rebuilds `dist/` first, so a stale build cannot ship.

### Upgrading from `@color-kit/control-kit`

Replace the old dependency with `control-kit`, update imports to
`from 'control-kit'`, and update Tailwind source paths from
`node_modules/@color-kit/control-kit/src` to `node_modules/control-kit/src`.
The package rename does not change its root exports.

### Upgrading from the Radix-based Tooltip

The current Tooltip uses Base UI. Earlier Color Kit consumers may still use
the Radix-based props; keeping the same import names does not make those
call sites compatible. Update them together with the dependency:

| Earlier prop                               | Current prop                                       |
| ------------------------------------------ | -------------------------------------------------- |
| `TooltipProvider delayDuration={450}`      | `TooltipProvider delay={450}`                      |
| `TooltipProvider skipDelayDuration={300}`  | `TooltipProvider timeout={300}`                    |
| `TooltipTrigger asChild` wrapping a button | `TooltipTrigger render={<button type="button" />}` |

See the [Tooltip migration example](https://github.com/pbroom/control-kit/blob/main/lab/src/routes/docs/tooltip.md#upgrading-from-the-radix-based-tooltip)
for complete before and after compositions. These mappings cover the common
Tooltip setup; review other forwarded component props against the current
component documentation. Run the consumer's typecheck and interaction tests
before replacing a pinned Git revision or released version.

## Tailwind

The components render Tailwind v4 utility class names, so your app's Tailwind
build must scan the package. Import the bundled preset after Tailwind:

```css
@import 'tailwindcss';
@import 'control-kit/tailwind.css';
```

The preset registers the package source with `@source` (resolved relative to
the installed package, so no path adjustment is needed), includes
`control-kit/theme.css`, and maps each token to a `ck-*` color utility:
`bg-ck-surface`, `bg-ck-surface-content`, `text-ck-foreground`,
`border-ck-border`, `ring-ck-accent`, `border-ck-accent-border`,
`border-ck-border-focus`, `border-ck-border-scrub`, and
`border-ck-border-invalid` (every Tailwind color utility and opacity modifier
works, for example `bg-ck-accent/40`).

To scan the package manually instead, add an `@source` for its shipped
`src/` (or `dist/`). The path is relative to the stylesheet containing it;
adjust it for your app's directory layout.

```css
@source '../node_modules/control-kit/src';
```

## Theming

Component palette colors resolve through `--ck-*` CSS custom properties with
dark defaults. Once Tailwind generates the component styles, no additional
theme or animation package is required.

`control-kit/theme.css` defines every token with the dark defaults on
`:root` and adds a light preset. It is plain CSS, so it works with or without
Tailwind, and `control-kit/tailwind.css` already includes it. Import it after
`tailwindcss` when both are used.

```css
@import 'control-kit/theme.css';
```

Opt into the light preset with `data-ck-theme="light"` on `<html>` or any
container; `data-ck-theme="dark"` restores the dark values inside a light
subtree. Dark stays the default, and the theme does not follow
`prefers-color-scheme` automatically. Toggle the attribute from your own
color-scheme logic if you want that.

```html
<html data-ck-theme="light"></html>
```

| Token                  | Dark      | Light     | Used for                               |
| ---------------------- | --------- | --------- | -------------------------------------- |
| `--ck-surface`         | `#383838` | `#ffffff` | control and selected toggle background |
| `--ck-surface-content` | `#1f1f1f` | `#f0f0f0` | recessed panels and dark tooltip color |
| `--ck-foreground`      | `#ffffff` | `#1e1e1e` | text and inverse tooltip background    |
| `--ck-accent`          | `#0d99ff` | `#0a84e8` | focus rings, checked fills             |
| `--ck-accent-border`   | `#007be5` | `#0068c4` | border paired with accent fills        |
| `--ck-border`          | `#4c4c4c` | `#c4c4c4` | hover and resting borders              |
| `--ck-border-focus`    | `#5288db` | `#2f6fd0` | value input while editing              |
| `--ck-border-scrub`    | `#97c1ef` | `#4f8fdd` | value input while scrubbing            |
| `--ck-border-invalid`  | `#ff4e4e` | `#d92c2c` | invalid drafts                         |

The theme file declares its values with zero specificity in the `base`
cascade layer, so your own definitions win regardless of import order.
Define any of these variables on a containing element to retheme the
controls:

```css
:root {
  --ck-accent: #7c3aed;
  --ck-accent-border: #6d28d9;
}
```

Without `theme.css`, every component still falls back to the dark defaults
inline. The same tokens are exported as `controlKitColor` for use in inline
styles. Tooltip content is portaled to `document.body`, so variables or a
`data-ck-theme` attribute set only on a trigger's ancestor do not reach it.
Put shared theme variables on `:root` or `body`, or define them directly on
`TooltipContent` through its `style` or `className` prop. Tooltip and
ToggleGroup use these package tokens rather than requiring host theme names
such as `background`, `foreground`, or `ring`. `ControlField.Error` retains
Tailwind's `red-400` text color; override its `className` when needed. The
`--ck-border-invalid` token controls invalid input borders, not error-message
text.

## Number input

`ControlField` is the numeric input primitive: compose its parts for custom
layouts, or use the `ControlInput` preset for a compact field with a scrub
handle and unit. `onValueChange` fires on every change, including each
parseable keystroke; put expensive work in `onValueCommitted`, which fires once
per finished edit (Enter or blur after typing, a key step, an expression, or a
scrub release).

```tsx
import { useState } from 'react';
import { ControlInput } from 'control-kit';

export function OpacityInput({ save }: { save: (value: number) => void }) {
  const [opacity, setOpacity] = useState<number | null>(80);

  return (
    <ControlInput
      label="Opacity"
      value={opacity}
      onValueChange={setOpacity}
      onValueCommitted={(value) => {
        if (value !== null) save(value);
      }}
      min={0}
      max={100}
      precision={1}
      handle="O"
      unit="%"
      size="sm"
    />
  );
}
```

Arrow keys step by `step`; Alt/Option uses `smallStep` and Shift uses
`largeStep`, for scrubbing too. Typed arithmetic such as `* 2` or `+ 10`
resolves on commit. `boundaryBehavior` is `'clamp'`, `'wrap'`, or `'free'`.

`PrimitiveValueInput`, `usePrimitiveValueInput`, and the `*Primitive*` helpers
are deprecated and will be removed in a future release. `PrimitiveValueInput`
now renders `ControlInput` and keeps its callback semantics. To migrate:

| `PrimitiveValueInput`                     | `ControlInput`                                    |
| ----------------------------------------- | ------------------------------------------------- |
| `wrapMode`                                | `boundaryBehavior`                                |
| `fineStep` / `coarseStep`                 | `smallStep` / `largeStep`                         |
| `ariaLabel`                               | `label`                                           |
| `autoTrim`                                | `trimTrailingZeros`                               |
| `selectAllOnFocus`                        | `selectOnFocus`                                   |
| `allowExpressions` / `parseExpression`    | `expressionResolver` (`null` disables)            |
| `horizontalArrowKeysMoveCaret={false}`    | `arrowKeys="both"`                                |
| `leadingElement` / `handleElement`        | `handle` (with `handleSide`)                      |
| `trailingElement`                         | `unit`                                            |
| `scrubEnabled`                            | `scrub`                                           |
| `scrubPixelsPerStep` / `stepDragDistance` | `pixelsPerStep` / `stepDistance`                  |
| `pointerLockEnabled`                      | `pointerLock` (now off by default)                |
| `visualTreatment` / `visualState`         | `variant` / `invalid`                             |
| `onValueChange(value, { interaction })`   | `onValueCommitted` + `getControlFieldInteraction` |

The input no longer has `role="spinbutton"`; it keeps Base UI's number field
semantics, so tests should query it as a textbox.

## Plane

`Plane` owns normalized Cartesian XY input while its children own the visual
surface. `PlaneThumb` supplies the positioned marker and accessible keyboard
axes; use `onValueChange` for live updates and `onValueCommitted` for completed
pointer or keyboard interactions.

```tsx
import { useState } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from 'control-kit';

export function PositionControl({
  savePoint,
}: {
  savePoint: (value: PlaneValue) => void;
}) {
  const [point, setPoint] = useState({ x: 0.35, y: 0.65 });

  return (
    <Plane
      aria-label="Curve control point"
      className="size-72 rounded-xl border"
    >
      <svg aria-hidden="true" className="absolute inset-0 size-full">
        {/* Consumer-owned guides, curves, canvas, or other content. */}
      </svg>
      <PlaneThumb
        value={point}
        onValueChange={setPoint}
        onValueCommitted={savePoint}
        xAriaLabel="Horizontal position"
        yAriaLabel="Vertical position"
      />
    </Plane>
  );
}
```

Coordinates are clamped to `0..1`, with X increasing left-to-right and Y
increasing bottom-to-top. Arrow keys move the focused axis; Alt/Option uses
`smallStep`, and Shift uses `largeStep`. For precise pointer adjustment, use
`dragBehavior="relative"` with a `dragSensitivity` below `1`.

## Development

```sh
pnpm install
pnpm build
pnpm test
pnpm typecheck
```

## Lab

This repo includes a focused Vite lab for demoing and refining the package UI
primitives without the larger `color-kit` docs site.

```sh
pnpm dev
pnpm lab:typecheck
pnpm lab:build
```

The lab imports the package source directly, so local component edits are visible
without packing or publishing the package.

Use `pnpm dev:package` when you specifically want the package build watcher
instead of the lab server.
