export type PrimitivePrecision = number;
export type PrimitiveWrapMode = 'clamp' | 'wrap' | 'free';
export type PrimitiveValueInteraction = 'text-input' | 'keyboard' | 'pointer';
export type PrimitiveStepKey =
  | 'ArrowRight'
  | 'ArrowLeft'
  | 'ArrowUp'
  | 'ArrowDown'
  | 'PageUp'
  | 'PageDown'
  | 'Home'
  | 'End';

export type PrimitiveExpressionParser = (
  draft: string,
  options: {
    allowExpressions: boolean;
    currentValue: number;
    range: [number, number];
  },
) => number | null;

export interface PrimitiveValueChangeDetails {
  interaction: PrimitiveValueInteraction;
}

export interface PrimitiveStepConfig {
  step: number;
  fineStep: number;
  coarseStep: number;
  pageStep: number;
}

export interface PrimitiveSteppedValueOptions {
  value: number;
  key: PrimitiveStepKey | string;
  min: number;
  max: number;
  wrapMode: PrimitiveWrapMode;
  step: number;
  pageStep: number;
}

const MAX_PRIMITIVE_PRECISION_DIGITS = 12;

export function normalizePrimitiveValue(
  value: number,
  min: number,
  max: number,
  mode: PrimitiveWrapMode,
): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  if (mode === 'free' || max <= min) {
    return value;
  }

  if (mode === 'wrap') {
    if (Object.is(value, max) || Math.abs(value - max) <= 1e-12) {
      return max;
    }

    const span = max - min;
    return ((((value - min) % span) + span) % span) + min;
  }

  return Math.min(max, Math.max(min, value));
}

export function formatPrimitiveValue(
  value: number,
  precision: PrimitivePrecision,
  autoTrim: boolean,
): string {
  if (!Number.isFinite(value)) {
    return '0';
  }

  const fixed = value.toFixed(precision);
  if (autoTrim) {
    const rounded = Number(fixed);
    return Object.is(rounded, -0) ? '0' : String(rounded);
  }

  return fixed;
}

export function normalizePrimitivePrecision(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(
    MAX_PRIMITIVE_PRECISION_DIGITS,
    Math.max(0, Math.round(value)),
  );
}

export function normalizePrimitiveScrubMultiplier(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(1000, Math.max(0.01, Number(value.toFixed(4))));
}

export function parsePrimitiveDraft(
  draft: string,
  currentValue: number,
  min: number,
  max: number,
  allowExpressions: boolean,
  parseExpression?: PrimitiveExpressionParser,
): number | null {
  if (parseExpression) {
    return parseExpression(draft, {
      currentValue,
      range: [min, max],
      allowExpressions,
    });
  }

  const parsed = Number(draft);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getPrimitiveModifiedStep(
  shiftKey: boolean,
  altKey: boolean,
  steps: PrimitiveStepConfig,
): number {
  if (altKey) return steps.fineStep;
  if (shiftKey) return steps.coarseStep;
  return steps.step;
}

export function getPrimitiveSteppedValue({
  value,
  key,
  min,
  max,
  wrapMode,
  step,
  pageStep,
}: PrimitiveSteppedValueOptions): number | null {
  const safeStep = Math.abs(step);
  const safePageStep = Math.abs(pageStep);
  let nextValue: number | null = null;

  switch (key as PrimitiveStepKey) {
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

  return normalizePrimitiveValue(nextValue, min, max, wrapMode);
}
