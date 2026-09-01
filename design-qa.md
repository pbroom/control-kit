# Design QA: Three-way color adjuster

## Visual truth

- Primary reference: `/var/folders/9b/7w9djy9j5dlfjn79khk4l92h0000gn/T/TemporaryItems/NSIRD_screencaptureui_Kie5Y1/Screenshot 2026-08-30 at 5.51.19 PM.png` (460 × 312 px).
- Supporting reference: `/Users/peterbroomfield/Downloads/Screenshot 2026-08-29 at 3.19.27 PM.png` (494 × 1080 px).
- User overrides: keep the Highlights, Midtones, and Shadows labels; reduce each Plane by about 50%; make both side controls functional sliders whose rails are even circular arcs with a larger radius than the Plane.
- Desktop implementation screenshot: `/tmp/control-kit-arc-sliders-final-desktop.png` (1375 × 998 px).
- Mobile implementation screenshot: `/tmp/control-kit-arc-sliders-final-mobile.png` (390 × 844 px).
- State: dark theme, default values, unfocused controls.
- Density normalization: source and implementation were compared at the control level. The source is a single large row while the implementation intentionally presents three half-size rows inside the existing docs frame.

## Comparison history

1. The earlier implementation used 198 px Planes, omitted the three labels, and rendered the side marks as decorative tracks. These were P1 interaction and P2 density/content mismatches against the latest annotation.
2. Each Plane was reduced to 100 px, labels were restored, and each row received two accessible slider controls with thumbs projected onto 138 px circular rails.
3. The first implementation used transparent native vertical ranges. Browser interaction did not reliably emit input changes, so the result remained blocked.
4. The controls were replaced with focusable ARIA sliders using pointer capture and keyboard handling. Post-fix browser evidence shows keyboard adjustment from saturation 64 to 65 and pointer dragging luminance to 66.

## Fidelity review

- Typography: the three requested labels are restored with compact 15 px medium text and consistent spacing beneath each row.
- Spacing and layout: the 100 px Planes are approximately 50% of the previous 198 px size. Three rows fit comfortably at both 1375 × 998 and 390 × 844 viewports without clipping.
- Colors and tokens: dark-centered hue wheels, coral left progress, light right progress, dim remaining rails, and neutral thumbs preserve the reference language.
- Image quality and assets: the controls are resolution-independent UI surfaces; the fixed center reference uses the existing icon library.
- Copy and content: Highlights, Midtones, and Shadows appear in the requested order. No removed panel title, toggle, selector, or reset control returned.
- Full-view evidence: both implementation screenshots show all three rows, labels, source card, and surrounding docs layout.
- Focused-region evidence: the source and mobile implementation were opened together. The larger-radius arcs remain concentric with each Plane, and their custom thumbs follow the rail geometry.

## Interaction and accessibility checks

- Browser: in-app Browser at `http://127.0.0.1:5201/docs/plane-examples`.
- Three named Plane groups and six named arc sliders render inside one named region.
- Each arc slider exposes role, label, orientation, minimum, maximum, current value, and percentage value text.
- Arrow keys adjust by 1, Page Up/Down by 10, and Home/End move to the limits.
- Pointer press, click, and drag map vertical position to the curved-rail value while the visible thumb follows the circular arc.
- The Plane controls remain independently pointer- and keyboard-operable.
- No application warnings, errors, or framework overlay were observed.

## Findings

- P0: none.
- P1: none after the functional-slider fix.
- P2: none after the sizing, label, and responsive fixes.
- P3: the docs example title remains outside the control because it belongs to the shared example frame, not the demo itself.

final result: passed

---

# Design QA: documentation on-page navigation

- Source visual truth: `/Users/peterbroomfield/Downloads/Screenshot 2026-08-31 at 10.28.23 PM.png`
- Implementation: `http://127.0.0.1:5201/docs/plane`
- Implementation screenshots:
  - `/tmp/control-kit-docs-on-page-nav-desktop.png`
  - `/tmp/control-kit-docs-on-page-nav-api-reference.png`
  - `/tmp/control-kit-docs-on-page-nav-mobile.png`
- Viewports: desktop 1440 × 1000 CSS px at 1×; mobile 390 × 844 CSS px at 1×
- Source pixels: 2194 × 1848. The source is a reference for the right-rail documentation pattern rather than a full-page clone, so density normalization is not applicable.
- Implementation pixels: 1440 × 1000 desktop; 390 × 844 mobile.
- State: dark-theme Plane documentation at the top of the page, API reference selected, and narrow responsive layout.

## Full-view comparison evidence

The source and implementation were opened together for comparison. Both use a readable central article with a compact right-side section list. The implementation preserves Control Kit's existing left navigation, typography, spacing, color tokens, and demo treatment rather than copying the source application's unrelated top navigation and advertising.

## Focused region comparison evidence

The right rail was inspected at 1440 × 1000. It begins level with the article intro, uses a muted title and compact links, indents third-level headings, highlights the current section, remains sticky while the docs container scrolls, and limits its own height for long pages. The Plane Examples page produced 52 outline links from both Markdown and injected gallery headings, with its long list independently scrollable.

## Required fidelity surfaces

- Fonts and typography: passed. The rail uses the existing Control Kit sans family, 12px title, 13px links, and a medium active weight.
- Spacing and layout rhythm: passed. The 700px article track remains fixed while the 168px rail is shifted 64px toward the right edge, reducing its outside margin without moving or compressing the article. The rail uses tighter rows than the primary navigation to keep long outlines scannable.
- Colors and visual tokens: passed. The rail reuses the primary left navigation's muted, hover, and active text states. Default, hover, and active links remain transparent.
- Image quality and asset fidelity: passed. This pattern introduces no image or icon assets; none from the source were required for the requested rail.
- Copy and content: passed. “On this page” is generated from visible h2 and h3 documentation headings, excludes the page h1 and headings inside example previews, and preserves existing heading IDs. Pages with an API reference split the outline into Guide and API subsections for faster scanning.

## Interaction and responsive evidence

- Clicking “API reference” changed the URL hash to `#api-reference`, scrolled the heading to 80px within the docs scroller, and set `aria-current="location"`.
- Browser console warnings/errors: none.
- At 390 × 844, the rail is hidden, the article is 342px wide, and document scroll width remains 390px.

## Findings

No actionable P0, P1, or P2 differences remain. Intentional differences are the Control Kit shell, its existing type and color system, and omission of unrelated source-page chrome.

## Comparison history

The first rendered comparison passed. No P0/P1/P2 visual fixes were required after the comparison.

## Follow-up polish

No P3 follow-up is required for this scope.

final result: passed
