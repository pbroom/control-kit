/**
 * Control-kit color tokens.
 *
 * Every color in the package resolves through a `--ck-*` CSS custom property
 * with the historical default as the fallback, so consumers can retheme the
 * components by defining these variables. Apps that define nothing keep the
 * original appearance.
 */
export const controlKitColor = {
  /** Base control background (inputs, unchecked checkbox, active tab). */
  surface: 'var(--ck-surface,#383838)',
  /** Recessed panel background (tabs content). */
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
