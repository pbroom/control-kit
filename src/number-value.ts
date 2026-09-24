/**
 * Shared numeric value semantics for control-kit inputs.
 *
 * These helpers are internal building blocks: `ControlField`, the deprecated
 * `PrimitiveValueInput` helpers, and `Plane` keyboard stepping all route
 * through them so boundary, stepping, and formatting rules stay identical.
 */

export type NumberBoundaryBehavior = 'clamp' | 'wrap' | 'free';

export type NumberStepKey =
  | 'ArrowRight'
  | 'ArrowLeft'
  | 'ArrowUp'
  | 'ArrowDown'
  | 'PageUp'
  | 'PageDown'
  | 'Home'
  | 'End';

export interface NumberStepSizes {
  step: number;
  smallStep: number;
  largeStep: number;
}

export interface SteppedNumberValueOptions {
  value: number;
  key: NumberStepKey | string;
  min: number;
  max: number;
  boundaryBehavior: NumberBoundaryBehavior;
  step: number;
  pageStep: number;
}

export const MAX_NUMBER_PRECISION_DIGITS = 12;

const BOUNDARY_EPSILON = 1e-12;

export function isNumberAtBoundary(value: number, boundary: number): boolean {
  return (
    Object.is(value, boundary) || Math.abs(value - boundary) <= BOUNDARY_EPSILON
  );
}

/**
 * Applies clamp/wrap/free boundary behavior. Non-finite input collapses to
 * `min`, and an empty or inverted range leaves the value untouched.
 */
export function normalizeNumberValue(
  value: number,
  min: number,
  max: number,
  behavior: NumberBoundaryBehavior,
): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  if (behavior === 'free' || max <= min) {
    return value;
  }

  if (behavior === 'wrap') {
    if (isNumberAtBoundary(value, max)) {
      return max;
    }

    const span = max - min;
    return ((((value - min) % span) + span) % span) + min;
  }

  return Math.min(max, Math.max(min, value));
}

/**
 * Formats a value to a fixed number of fraction digits, optionally trimming
 * trailing zeros (and normalizing `-0` to `0`).
 */
export function formatNumberValue(
  value: number,
  precision: number,
  trimTrailingZeros: boolean,
): string {
  if (!Number.isFinite(value)) {
    return '0';
  }

  const fixed = value.toFixed(precision);
  if (trimTrailingZeros) {
    const rounded = Number(fixed);
    return Object.is(rounded, -0) ? '0' : String(rounded);
  }

  return fixed;
}

export function normalizeNumberPrecision(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(MAX_NUMBER_PRECISION_DIGITS, Math.max(0, Math.round(value)));
}

export function normalizeScrubMultiplier(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(1000, Math.max(0.01, Number(value.toFixed(4))));
}

/** Alt/Option selects the small step, Shift the large step. */
export function getModifiedStep(
  shiftKey: boolean,
  altKey: boolean,
  steps: NumberStepSizes,
): number {
  if (altKey) return steps.smallStep;
  if (shiftKey) return steps.largeStep;
  return steps.step;
}

/**
 * Resolves the value a stepping key produces. Returns `null` for keys that do
 * not step. Home/End jump to the exact boundary without wrapping.
 */
export function getSteppedNumberValue({
  value,
  key,
  min,
  max,
  boundaryBehavior,
  step,
  pageStep,
}: SteppedNumberValueOptions): number | null {
  const safeStep = Math.abs(step);
  const safePageStep = Math.abs(pageStep);
  let nextValue: number | null = null;

  switch (key as NumberStepKey) {
    case 'ArrowRight':
    case 'ArrowUp':
      nextValue = value + safeStep;
      break;
    case 'ArrowLeft':
    case 'ArrowDown':
      nextValue = value - safeStep;
      break;
    case 'PageUp':
      nextValue = value + safePageStep;
      break;
    case 'PageDown':
      nextValue = value - safePageStep;
      break;
    case 'Home':
      return min;
    case 'End':
      return max;
    default:
      return null;
  }

  return normalizeNumberValue(nextValue, min, max, boundaryBehavior);
}
