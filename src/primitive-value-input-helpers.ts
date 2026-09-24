import {
  formatNumberValue,
  getModifiedStep,
  getSteppedNumberValue,
  normalizeNumberPrecision,
  normalizeNumberValue,
  normalizeScrubMultiplier,
  type NumberBoundaryBehavior,
  type NumberStepKey,
} from './number-value.js';

export type PrimitivePrecision = number;
export type PrimitiveWrapMode = NumberBoundaryBehavior;
export type PrimitiveValueInteraction = 'text-input' | 'keyboard' | 'pointer';
export type PrimitiveStepKey = NumberStepKey;

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

/**
 * @deprecated Boundary handling is built into `ControlField` via `boundaryBehavior`. Will be removed in a future release.
 */
export function normalizePrimitiveValue(
  value: number,
  min: number,
  max: number,
  mode: PrimitiveWrapMode,
): number {
  return normalizeNumberValue(value, min, max, mode);
}

/**
 * @deprecated Use `ControlField` `precision` / `trimTrailingZeros` or `format`. Will be removed in a future release.
 */
export function formatPrimitiveValue(
  value: number,
  precision: PrimitivePrecision,
  autoTrim: boolean,
): string {
  return formatNumberValue(value, precision, autoTrim);
}

/**
 * @deprecated Use `ControlField` `precision`, which is normalized internally. Will be removed in a future release.
 */
export function normalizePrimitivePrecision(value: number): number {
  return normalizeNumberPrecision(value);
}

/**
 * @deprecated Configure `ControlField.ScrubArea` `pixelsPerStep` directly. Will be removed in a future release.
 */
export function normalizePrimitiveScrubMultiplier(value: number): number {
  return normalizeScrubMultiplier(value);
}

/**
 * @deprecated Use `ControlField` `expressionResolver`. Will be removed in a future release.
 */
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

/**
 * @deprecated `ControlField` applies `smallStep`/`largeStep` for Alt/Shift itself. Will be removed in a future release.
 */
export function getPrimitiveModifiedStep(
  shiftKey: boolean,
  altKey: boolean,
  steps: PrimitiveStepConfig,
): number {
  return getModifiedStep(shiftKey, altKey, {
    step: steps.step,
    smallStep: steps.fineStep,
    largeStep: steps.coarseStep,
  });
}

/**
 * @deprecated `ControlField` owns keyboard stepping. Will be removed in a future release.
 */
export function getPrimitiveSteppedValue({
  value,
  key,
  min,
  max,
  wrapMode,
  step,
  pageStep,
}: PrimitiveSteppedValueOptions): number | null {
  return getSteppedNumberValue({
    value,
    key,
    min,
    max,
    boundaryBehavior: wrapMode,
    step,
    pageStep,
  });
}
