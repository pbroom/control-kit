# AGENTS.md

## Cursor Cloud specific instructions

This repo is a single npm package `@color-kit/control-kit` (React 19 + TypeScript UI
primitive library) plus an embedded Vite "lab" dev app under `lab/` used for demos and
smoke tests. There is no backend, database, or external service — everything runs in the
browser or Node. Package manager is **pnpm** (`pnpm@10.30.3`); Node ≥18 (Node 22 works).

Standard commands live in `package.json` `scripts` and `README.md`; use those rather than
duplicating them here. Key ones:

- Dev app (lab): `pnpm dev` — serves at `http://127.0.0.1:5175/` with `--strictPort`, so
  the port must be free or Vite exits. Default route redirects to `/lab/color-plane`.
- Unit tests: `pnpm test` (Vitest). Typecheck: `pnpm typecheck` and `pnpm lab:typecheck`.
- Build library: `pnpm build` (tsup → `dist/`). This also runs automatically via the
  `prepare` script on every `pnpm install`.
- Formatting is Prettier only (no ESLint): `pnpm format:check` / `pnpm format`.

Non-obvious notes:

- The lab imports the library **source** (`src/index.ts`) directly via a Vite alias, so
  library edits hot-reload in the lab without rebuilding `dist/`.
- `pnpm lab:smoke` (Playwright) starts its own Vite server on port `5185` and requires
  Playwright browsers to be installed first (`pnpm exec playwright install chromium`);
  browsers are not installed by the dependency update script.
- The ColorPlane demo uses vendored color-kit code with WebAssembly/Web Workers and an
  optional WebGPU backend; in headless/software-GL environments it logs WebGL/GPU fallback
  warnings that are harmless and do not break functionality.
