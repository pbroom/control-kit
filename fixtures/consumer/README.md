# Packed consumer check

Run `pnpm test:consumer` after installing the repository dependencies and
Playwright Chromium (`pnpm exec playwright install chromium`). CI runs it in
the browser job after installing Chromium.

The runner builds and packs the library, copies this fixture to a temporary
directory, and installs the tarball with explicit peers. Tool and peer versions
come from the repository's installed, locked versions. The temporary consumer
has no source aliases or workspace links. Its transitive dependencies resolve
normally, as they do for a new consumer installation.

The check exercises ESM and CommonJS exports and declarations, builds Tailwind
from the package's shipped source, and opens the built app in Chromium. It
checks numeric input updates and interaction metadata, the migrated Tooltip
composition, ToggleGroup state, and default and overridden theme colors without
Lab CSS. Temporary files and the server are removed when the check completes.

The channel input mirrors the exported hook boundary used by Color Kit's
`ColorInput`. It checks that integration pattern, not a complete Color Kit
application upgrade. Existing consumers should still run their own typecheck
and interaction tests when replacing a pinned dependency.
