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

export function normalizePrimitiveValue(
  value: number,
  min: number,
  max: number,
  mode: PrimitiveWrapMode,
): number {
  return normalizeNumberValue(value, min, max, mode);
}

export function formatPrimitiveValue(
  value: number,
  precision: PrimitivePrecision,
  autoTrim: boolean,
): string {
  return formatNumberValue(value, precision, autoTrim);
}

export function normalizePrimitivePrecision(value: number): number {
  return normalizeNumberPrecision(value);
}

export function normalizePrimitiveScrubMultiplier(value: number): number {
  return normalizeScrubMultiplier(value);
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
  return getModifiedStep(shiftKey, altKey, {
    step: steps.step,
    smallStep: steps.fineStep,
    largeStep: steps.coarseStep,
  });
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
