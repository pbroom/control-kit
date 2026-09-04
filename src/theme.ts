/**
 * Control-kit color tokens.
 *
 * Component palette colors resolve through `--ck-*` CSS custom properties
 * with dark defaults. Define them on a containing element; portaled tooltips
 * inherit from the portal location, so use :root/body for a shared theme.
 */
export const controlKitColor = {
  /** Base control background (inputs, unchecked checkbox, selected tab/toggle). */
  surface: 'var(--ck-surface,#383838)',
  /** Recessed panels, toggle groups, and the dark tooltip surface/text. */
  surfaceContent: 'var(--ck-surface-content,#1f1f1f)',
  /** Base text color; components apply opacity ramps on top of it. */
  foreground: 'var(--ck-foreground,#ffffff)',
  /** Primary accent (focus rings, checked checkbox fill). */
  accent: 'var(--ck-accent,#0d99ff)',
  /** Border paired with accent fills (checked checkbox border). */
  accentBorder: 'var(--ck-accent-border,#007be5)',
  /** Resting border for hovered and unchecked states. */
  border: 'var(--ck-border,#4c4c4c)',
  /** Border while a value input is being edited. */
  borderFocus: 'var(--ck-border-focus,#5288db)',
  /** Border while a value input is being scrubbed. */
  borderScrub: 'var(--ck-border-scrub,#97c1ef)',
  /** Border for invalid drafts. */
  borderInvalid: 'var(--ck-border-invalid,#ff4e4e)',
} as const;

export type ControlKitColorToken = keyof typeof controlKitColor;
