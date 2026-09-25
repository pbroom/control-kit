import { useCallback, useMemo, type ReactNode } from 'react';
import {
  ControlFieldLegacyKeysContext,
  getControlFieldInteraction,
  type ControlFieldValueChangeDetails,
  type ControlFieldValueCommitDetails,
} from './control-field.js';
import type { ControlFieldExpressionResolver } from './control-field-expression.js';
import { ControlInput } from './control-input.js';
import {
  type PrimitiveExpressionParser,
  type PrimitivePrecision,
  type PrimitiveValueChangeDetails,
  type PrimitiveWrapMode,
} from './primitive-value-input-helpers.js';

// Value semantics and the stateful input model live in sibling modules; this
// module re-exports them so `primitive-value-input.js` stays the one import
// path for the whole primitive.
export {
  formatPrimitiveValue,
  getPrimitiveModifiedStep,
  getPrimitiveSteppedValue,
  normalizePrimitivePrecision,
  normalizePrimitiveScrubMultiplier,
  normalizePrimitiveValue,
  parsePrimitiveDraft,
} from './primitive-value-input-helpers.js';
export type {
  PrimitiveExpressionParser,
  PrimitivePrecision,
  PrimitiveStepConfig,
  PrimitiveStepKey,
  PrimitiveSteppedValueOptions,
  PrimitiveValueChangeDetails,
  PrimitiveValueInteraction,
  PrimitiveWrapMode,
} from './primitive-value-input-helpers.js';
export { usePrimitiveValueInput } from './use-primitive-value-input.js';
export type { UsePrimitiveValueInputOptions } from './use-primitive-value-input.js';

export type PrimitiveSize = 'sm' | 'md' | 'lg' | 'full';
export type PrimitiveDensity = 'compact' | 'comfortable';
export type PrimitiveVisualState = 'auto' | 'valid' | 'invalid';
export type PrimitiveVisualTreatment = 'default' | 'embedded';
export type PrimitiveHandleSide = 'leading' | 'trailing';

/**
 * @deprecated Use `ControlInput` (or `ControlField` parts). Props map as
 * `wrapMode` → `boundaryBehavior`, `fineStep`/`coarseStep` →
 * `smallStep`/`largeStep`, `ariaLabel` → `label`, `autoTrim` →
 * `trimTrailingZeros`, `selectAllOnFocus` → `selectOnFocus`,
 * `allowExpressions`/`parseExpression` → `expressionResolver`. Will be
 * removed in a future release.
 */
export interface PrimitiveValueInputProps {
  value: number;
  onValueChange: (value: number, details: PrimitiveValueChangeDetails) => void;
  ariaLabel?: string;
  placeholder?: string;
  leadingElement?: ReactNode;
  trailingElement?: ReactNode;
  handleElement?: ReactNode;
  handleSide?: PrimitiveHandleSide;
  handleContentWidth?: number;
  min: number;
  max: number;
  wrapMode: PrimitiveWrapMode;
  step: number;
  fineStep: number;
  coarseStep: number;
  pageStep: number;
  precision: PrimitivePrecision;
  autoTrim: boolean;
  allowExpressions: boolean;
  parseExpression?: PrimitiveExpressionParser;
  selectAllOnFocus: boolean;
  commitOnBlur: boolean;
  scrubEnabled: boolean;
  scrubPixelsPerStep?: number;
  stepDragDistance?: number;
  scrubThreshold: number;
  scrubCommitThreshold?: number;
  scrubMaxCommitRate?: number;
  pointerLockEnabled: boolean;
  horizontalArrowKeysMoveCaret?: boolean;
  disabled: boolean;
  readOnly: boolean;
  onInvalidCommit?: (draft: string) => void;
  visualState: PrimitiveVisualState;
  visualTreatment?: PrimitiveVisualTreatment;
  showInvalidBorder?: boolean;
  onScrubbingChange?: (isScrubbing: boolean) => void;
  size: PrimitiveSize;
  density?: PrimitiveDensity;
}

// Per-keystroke and blur-time changes are internal to the adapter; typed text
// reaches `onValueChange` once, from the blur/Enter commit.
const TYPING_REASONS = new Set<string>([
  'input-change',
  'input-clear',
  'input-paste',
  'input-blur',
  'input-commit',
  'none',
]);

/**
 * @deprecated Use `ControlInput`. `PrimitiveValueInput` is now an adapter
 * over `ControlInput` and will be removed in a future release. See the
 * README migration table.
 */
export function PrimitiveValueInput({
  value,
  onValueChange,
  ariaLabel,
  placeholder,
  leadingElement = 'V',
  trailingElement,
  handleElement,
  handleSide = 'leading',
  handleContentWidth = 24,
  min,
  max,
  wrapMode,
  step,
  fineStep,
  coarseStep,
  pageStep,
  precision,
  autoTrim,
  allowExpressions,
  parseExpression,
  selectAllOnFocus,
  commitOnBlur,
  scrubEnabled,
  scrubPixelsPerStep = 1,
  stepDragDistance,
  scrubThreshold,
  scrubCommitThreshold,
  scrubMaxCommitRate,
  pointerLockEnabled,
  horizontalArrowKeysMoveCaret = true,
  disabled,
  readOnly,
  onInvalidCommit,
  visualState,
  visualTreatment = 'default',
  showInvalidBorder = false,
  onScrubbingChange,
  size,
  density = 'compact',
}: PrimitiveValueInputProps) {
  const expressionResolver = useMemo<ControlFieldExpressionResolver | null>(
    () =>
      parseExpression
        ? (text, context) =>
            parseExpression(text, {
              allowExpressions,
              currentValue: context.startValue ?? context.currentValue,
              range: context.range ?? [min, max],
            })
        : null,
    [allowExpressions, max, min, parseExpression],
  );

  const handleValueChange = useCallback(
    (nextValue: number | null, details: ControlFieldValueChangeDetails) => {
      if (nextValue === null || TYPING_REASONS.has(details.reason)) return;
      onValueChange(nextValue, {
        interaction: getControlFieldInteraction(details),
      });
    },
    [onValueChange],
  );

  const handleValueCommitted = useCallback(
    (nextValue: number | null, details: ControlFieldValueCommitDetails) => {
      if (details.reason !== 'input-blur' && details.reason !== 'input-commit')
        return;
      if (nextValue === null) {
        // An empty draft used to commit 0; it now reverts instead.
        onInvalidCommit?.('');
        return;
      }
      if (Object.is(nextValue, value) || Math.abs(nextValue - value) <= 1e-12) {
        return;
      }
      onValueChange(nextValue, { interaction: 'text-input' });
    },
    [onInvalidCommit, onValueChange, value],
  );

  const handleInvalidCommit = useCallback(
    (text: string) => onInvalidCommit?.(text),
    [onInvalidCommit],
  );

  const resolvedHandleElement =
    handleElement !== undefined
      ? handleElement
      : handleSide === 'trailing'
        ? trailingElement
        : leadingElement;
  const trailingElementFeedsHandle =
    handleSide === 'trailing' && handleElement === undefined;
  const invalid = visualState === 'invalid';

  return (
    <ControlFieldLegacyKeysContext.Provider value>
      <ControlInput
        value={value}
        onValueChange={handleValueChange}
        onValueCommitted={handleValueCommitted}
        onInvalidCommit={handleInvalidCommit}
        label={ariaLabel}
        placeholder={placeholder}
        handle={resolvedHandleElement}
        handleSide={handleSide}
        handleWidth={handleContentWidth}
        unit={trailingElementFeedsHandle ? undefined : trailingElement}
        min={min}
        max={max}
        boundaryBehavior={wrapMode}
        step={step}
        smallStep={fineStep}
        largeStep={coarseStep}
        pageStep={pageStep}
        precision={precision}
        trimTrailingZeros={autoTrim}
        expressionResolver={expressionResolver}
        selectOnFocus={selectAllOnFocus}
        commitOnBlur={commitOnBlur}
        scrub={scrubEnabled}
        pixelsPerStep={scrubPixelsPerStep}
        stepDistance={stepDragDistance}
        scrubThreshold={scrubThreshold}
        scrubCommitThreshold={scrubCommitThreshold}
        scrubMaxCommitRate={scrubMaxCommitRate}
        pointerLock={pointerLockEnabled}
        arrowKeys={horizontalArrowKeysMoveCaret ? 'vertical' : 'both'}
        disabled={disabled}
        readOnly={readOnly}
        invalid={invalid && showInvalidBorder}
        inputProps={{ 'aria-invalid': invalid || undefined }}
        variant={visualTreatment}
        onScrubbingChange={onScrubbingChange}
        size={size}
        density={density}
        data-valid={!invalid || undefined}
      />
    </ControlFieldLegacyKeysContext.Provider>
  );
}
