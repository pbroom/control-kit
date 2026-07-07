import { useState, type ReactNode } from 'react';
import { controlKitColor } from './theme.js';
import {
  type PrimitiveExpressionParser,
  type PrimitivePrecision,
  type PrimitiveValueChangeDetails,
  type PrimitiveWrapMode,
} from './primitive-value-input-helpers.js';
import { usePrimitiveValueInput } from './use-primitive-value-input.js';

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

const PRIMITIVE_SIZE_CLASS: Record<PrimitiveSize, string> = {
  sm: 'w-32',
  md: 'w-44',
  lg: 'w-60',
  full: 'w-full',
};

const PRIMITIVE_DENSITY_CLASS: Record<PrimitiveDensity, string> = {
  compact: 'h-6 min-h-6 text-[11px] leading-4',
  comfortable: 'h-8 min-h-8 text-xs leading-4',
};

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
  const [isHovered, setIsHovered] = useState(false);
  const {
    inputRef,
    inputProps,
    scrubHandleRef,
    scrubHandleProps,
    isDraftValid,
    isEditing,
    isScrubbing,
    ariaValueNow,
  } = usePrimitiveValueInput({
    value,
    onValueChange,
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
    scrubPixelsPerStep,
    stepDragDistance,
    scrubThreshold,
    scrubCommitThreshold,
    scrubMaxCommitRate,
    pointerLockEnabled,
    horizontalArrowKeysMoveCaret,
    disabled,
    readOnly,
    onInvalidCommit,
    onScrubbingChange,
  });

  const showInvalidState = visualState === 'invalid';
  const isVisuallyValid =
    visualState === 'valid' || (visualState === 'auto' && isDraftValid);
  const isEmbeddedVisual = visualTreatment === 'embedded';
  const isInvalid = showInvalidState || (isEditing && !isDraftValid);
  const borderColor =
    showInvalidBorder && isInvalid
      ? controlKitColor.borderInvalid
      : isEmbeddedVisual
        ? 'transparent'
        : isScrubbing
          ? controlKitColor.borderScrub
          : isEditing
            ? controlKitColor.borderFocus
            : isHovered
              ? controlKitColor.border
              : 'transparent';
  const hasTrailingElement =
    trailingElement !== null &&
    trailingElement !== undefined &&
    trailingElement !== false;
  const resolvedHandleElement =
    handleElement !== undefined
      ? handleElement
      : handleSide === 'trailing'
        ? trailingElement
        : leadingElement;
  const hasHandleElement =
    resolvedHandleElement !== null &&
    resolvedHandleElement !== undefined &&
    resolvedHandleElement !== false;
  const trailingElementFeedsHandle =
    handleSide === 'trailing' && handleElement === undefined;
  const scrubHandleStyle = hasHandleElement
    ? { width: handleContentWidth }
    : undefined;
  const scrubHandle = scrubEnabled ? (
    <div
      ref={scrubHandleRef}
      data-control-kit-scrub-handle=""
      aria-hidden="true"
      className={
        hasHandleElement
          ? 'flex h-full shrink-0 cursor-ew-resize touch-none select-none items-center justify-center font-medium tabular-nums text-[color:var(--ck-foreground,#ffffff)]/55'
          : `absolute ${
              handleSide === 'leading' ? '-left-0.5' : '-right-0.5'
            } top-0 z-10 h-full w-[5px] cursor-ew-resize touch-none select-none`
      }
      style={scrubHandleStyle}
      {...scrubHandleProps}
    >
      {resolvedHandleElement}
    </div>
  ) : null;

  return (
    <div
      className={`relative box-border flex min-w-0 max-w-full items-center ${
        isEmbeddedVisual ? 'rounded-none' : 'rounded-[4px]'
      } border bg-[var(--ck-surface,#383838)] p-0 font-sans text-[color:var(--ck-foreground,#ffffff)] ${
        PRIMITIVE_SIZE_CLASS[size]
      } ${PRIMITIVE_DENSITY_CLASS[density]} ${disabled ? 'opacity-45' : ''}`}
      style={{ borderColor }}
      data-scrubbing={isScrubbing || undefined}
      data-valid={isVisuallyValid || undefined}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      {handleSide === 'leading' ? scrubHandle : null}
      <input
        ref={inputRef}
        type="text"
        role="spinbutton"
        aria-label={ariaLabel}
        aria-invalid={isInvalid}
        aria-valuemin={wrapMode === 'free' ? undefined : min}
        aria-valuemax={wrapMode === 'free' ? undefined : max}
        aria-valuenow={ariaValueNow}
        placeholder={placeholder}
        className="h-full min-w-0 flex-1 cursor-default bg-transparent py-0 pl-1 pr-0 font-sans tabular-nums text-[color:var(--ck-foreground,#ffffff)] outline-none focus:cursor-text disabled:cursor-not-allowed"
        {...inputProps}
      />
      {hasTrailingElement && !trailingElementFeedsHandle ? (
        <span className="flex h-full w-5 shrink-0 select-none items-center justify-center text-[11px] font-medium leading-4 text-[color:var(--ck-foreground,#ffffff)]/50">
          {trailingElement}
        </span>
      ) : null}
      {handleSide === 'trailing' ? scrubHandle : null}
    </div>
  );
}
