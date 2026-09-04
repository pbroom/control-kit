# @color-kit/control-kit

React UI primitives for building operational color controls.

This package is published from [pbroom/control-kit](https://github.com/pbroom/control-kit) and keeps the public package name and root entrypoint of the former `packages/control-kit` workspace package in `color-kit`. Component props can change as the API evolves; check the migration guidance before upgrading an existing consumer.

## Install

```sh
pnpm add @color-kit/control-kit
```

When consuming directly from GitHub:

```sh
pnpm add github:pbroom/control-kit
```

The package builds ESM, CommonJS, and TypeScript declarations into `dist/`. Git installs run the `prepare` script so consumers receive the compiled entrypoints.

## Compatibility

- **React 19 or newer** is required (`react` and `react-dom` are peer
  dependencies with a `>=19.0.0` floor). This is a deliberate choice to build
  on current React semantics rather than carry compatibility shims.
- `@base-ui/react` 1.7 or newer within version 1 is a peer dependency used for the headless primitives.
- Node 18+ is required to build the package.

## Releases

Changes are tracked in [CHANGELOG.md](./CHANGELOG.md). The package currently
publishes under the `next` npm dist-tag while the API stabilizes; pin exact
versions if you need reproducible installs.

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

The components render Tailwind v4 utility class names. Configure Tailwind in
your app and include the package in its content graph. The published package
includes `src/` as well as `dist/` so consumers can scan either path. The
`@source` path is relative to the stylesheet containing it; adjust it for
your app's directory layout.

```css
@source '../node_modules/@color-kit/control-kit/src';
```

## Theming

Component palette colors resolve through `--ck-*` CSS custom properties with
dark defaults. Once Tailwind generates the component styles, no additional
theme or animation package is required. Define these variables on a
containing element to retheme the controls:

```css
:root {
  --ck-surface: #383838; /* control and selected toggle background */
  --ck-surface-content: #1f1f1f; /* recessed panel and dark tooltip color */
  --ck-foreground: #ffffff; /* text and inverse tooltip background */
  --ck-accent: #0d99ff; /* focus rings, checked fills */
  --ck-accent-border: #007be5; /* border paired with accent fills */
  --ck-border: #4c4c4c; /* hover + resting borders */
  --ck-border-focus: #5288db; /* value input while editing */
  --ck-border-scrub: #97c1ef; /* value input while scrubbing */
  --ck-border-invalid: #ff4e4e; /* invalid drafts */
}
```

The same tokens are exported as `controlKitColor` for use in inline styles.
Tooltip content is portaled to `document.body`, so variables set only on a
trigger's ancestor do not reach it. Put shared theme variables on `:root`
or `body`, or define them directly on `TooltipContent` through its `style`
or `className` prop. Tooltip and ToggleGroup use these package tokens rather
than requiring host theme names such as `background`, `foreground`, or `ring`.
`ControlField.Error` retains Tailwind's `red-400` text color; override its
`className` when needed. The `--ck-border-invalid` token controls invalid
input borders, not error-message text.

## Plane

`Plane` owns normalized Cartesian XY input while its children own the visual
surface. `PlaneThumb` supplies the positioned marker and accessible keyboard
axes; use `onValueChange` for live updates and `onValueCommit` for completed
pointer or keyboard interactions.

```tsx
const [point, setPoint] = useState({ x: 0.35, y: 0.65 });

<Plane
  aria-label="Curve control point"
  className="size-72 rounded-xl border"
  value={point}
  onValueChange={setPoint}
  onValueCommit={(value) => savePoint(value)}
>
  <svg aria-hidden="true" className="absolute inset-0 size-full">
    {/* Consumer-owned guides, curves, canvas, or other content. */}
  </svg>
  <PlaneThumb xAriaLabel="Horizontal position" yAriaLabel="Vertical position" />
</Plane>;
```

Coordinates are clamped to `0..1`, with X increasing left-to-right and Y
increasing bottom-to-top. Arrow keys move the focused axis; Alt/Option uses
`smallStep`, and Shift uses `largeStep`.

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
