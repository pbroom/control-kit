# Design QA: Three-way color adjuster

## Visual truth

- Primary reference: `/Users/peterbroomfield/Downloads/Screenshot 2026-08-29 at 3.19.27 PM.png` (494 × 1080 px).
- Crosshair reference: `/var/folders/9b/7w9djy9j5dlfjn79khk4l92h0000gn/T/TemporaryItems/NSIRD_screencaptureui_Kie5Y1/Screenshot 2026-08-30 at 5.51.19 PM.png` (460 × 312 px).
- User override: retain only the three drag planes and their side tracks; remove the panel background, title, sparkle, toggle, mode selector, reset buttons, and visible tone labels.
- Implementation screenshot: `/tmp/control-kit-three-way-color-adjuster-final-desktop.png`.
- Viewport: 1375 × 998 CSS px, dark theme, default values, no focused control.
- Density normalization: the source is a compact mobile control while the implementation sits inside the existing docs example frame. Proportions were compared at the control level rather than by matching full-page pixels.

## Comparison history

1. The first pass closely reproduced the complete Color Balance panel, but was too literal for this example gallery.
2. The panel chrome and all non-control content were removed. The remaining three wheel-and-side-track rows use the existing `Plane` primitive.
3. The moving crosshair was separated from `PlaneThumb`. A fixed, low-contrast plus now stays at the exact center of every plane while the plain circular thumb moves independently above it.

## Fidelity review

- Typography: no demo-local visible typography remains, per the user override.
- Spacing and layout: three evenly spaced vertical rows; the complete control fits inside the example frame at desktop and mobile widths.
- Colors and tokens: dark-centered hue wheels, two-tone side tracks, light side handles, and neutral light thumbs match the supplied reference language.
- Image quality and assets: all surfaces are resolution-independent CSS gradients; the center reference uses the project icon library.
- Copy and content: no visible title, selector, labels, toggle, or reset affordances remain.
- Full-view evidence: the desktop screenshot shows all three rows and the example source panel.
- Focused-region evidence: the mobile comparison showed the wheel, tracks, fixed center reference, and independently offset thumb together.

## Interaction and accessibility checks

- Browser: Control Kit Lab at `http://127.0.0.1:5201/docs/plane-examples`.
- Three named Plane groups render inside one named region.
- No switch, button, or combobox remains in the simplified demo.
- Keyboard adjustment changes the selected Plane value and the live output.
- The three center references are pointer-inert and remain geometrically aligned with their plane centers.
- No application warnings or errors were observed in the browser console.

## Findings

- P0: none.
- P1: none.
- P2: none.
- P3: the curved side tracks are visual context rather than separate interactive range inputs, matching the existing scope of this Plane example.

final result: passed
