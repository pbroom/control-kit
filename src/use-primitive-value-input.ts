import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent as ReactChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  formatPrimitiveValue,
  getPrimitiveModifiedStep,
  getPrimitiveSteppedValue,
  normalizePrimitiveValue,
  parsePrimitiveDraft,
  type PrimitiveExpressionParser,
  type PrimitivePrecision,
  type PrimitiveValueChangeDetails,
  type PrimitiveValueInteraction,
  type PrimitiveWrapMode,
} from './primitive-value-input-helpers.js';
import { useScrubGesture } from './use-scrub-gesture.js';

/**
 * @deprecated Use `ControlField` or `ControlInput`. Will be removed in a
 * future release.
 */
export interface UsePrimitiveValueInputOptions {
  value: number;
  onValueChange: (value: number, details: PrimitiveValueChangeDetails) => void;
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
  onScrubbingChange?: (isScrubbing: boolean) => void;
}

/**
 * @deprecated Use `ControlField` parts or `ControlInput`, which cover the
 * draft, keyboard, commit, and scrub behavior of this hook. Will be removed
 * in a future release.
 */
export function usePrimitiveValueInput({
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
  scrubPixelsPerStep = 1,
  stepDragDistance,
  scrubThreshold,
  scrubCommitThreshold = 0,
  scrubMaxCommitRate,
  pointerLockEnabled,
  horizontalArrowKeysMoveCaret = true,
  disabled,
  readOnly,
  onInvalidCommit,
  onScrubbingChange,
}: UsePrimitiveValueInputOptions) {
  const inputRef = useRef<HTMLInputElement>(null);
  const lastCommittedValueRef = useRef(value);
  const hasTextDraftRef = useRef(false);
  const skipBlurCommitRef = useRef(false);
  const [draft, setDraft] = useState(() =>
    formatPrimitiveValue(value, precision, autoTrim),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [focusStartValue, setFocusStartValue] = useState<number | null>(null);

  const displayValue = useMemo(
    () => formatPrimitiveValue(value, precision, autoTrim),
    [autoTrim, precision, value],
  );

  useEffect(() => {
    if (!isEditing) {
      setDraft(displayValue);
    }
  }, [displayValue, isEditing]);

  const parsedDraft = useMemo(() => {
    if (!isEditing) {
      return value;
    }

    const parsed = parsePrimitiveDraft(
      draft,
      focusStartValue ?? value,
      min,
      max,
      allowExpressions,
      parseExpression,
    );
    return parsed === null
      ? null
      : normalizePrimitiveValue(parsed, min, max, wrapMode);
  }, [
    allowExpressions,
    draft,
    focusStartValue,
    isEditing,
    max,
    min,
    parseExpression,
    value,
    wrapMode,
  ]);

  const isDraftValid = parsedDraft !== null;
  const currentValue = isEditing ? draft : displayValue;

  const emitValue = useCallback(
    (
      nextValue: number,
      interaction: PrimitiveValueInteraction,
      options: { normalize?: boolean } = {},
    ) => {
      const normalized =
        options.normalize === false
          ? nextValue
          : normalizePrimitiveValue(nextValue, min, max, wrapMode);
      const previousValue = lastCommittedValueRef.current;

      if (
        Object.is(normalized, previousValue) ||
        Math.abs(normalized - previousValue) <= 1e-12
      ) {
        return normalized;
      }

      lastCommittedValueRef.current = normalized;
      hasTextDraftRef.current = false;
      setDraft(formatPrimitiveValue(normalized, precision, autoTrim));
      onValueChange(normalized, { interaction });
      return normalized;
    },
    [autoTrim, max, min, onValueChange, precision, wrapMode],
  );

  const commitDraft = useCallback(() => {
    if (parsedDraft !== null) {
      const committedDraft = formatPrimitiveValue(
        lastCommittedValueRef.current,
        precision,
        autoTrim,
      );
      if (draft !== committedDraft) {
        emitValue(parsedDraft, 'text-input');
      }
    } else {
      onInvalidCommit?.(draft);
      setDraft(displayValue);
    }
    setIsEditing(false);
    setFocusStartValue(null);
  }, [
    autoTrim,
    displayValue,
    draft,
    emitValue,
    onInvalidCommit,
    parsedDraft,
    precision,
  ]);

  const normalizeScrubValue = useCallback(
    (nextValue: number) =>
      normalizePrimitiveValue(nextValue, min, max, wrapMode),
    [max, min, wrapMode],
  );
  const handleScrubValue = useCallback(
    (nextValue: number) => {
      emitValue(nextValue, 'pointer');
    },
    [emitValue],
  );
  const getScrubReferenceValue = useCallback(
    () => lastCommittedValueRef.current,
    [],
  );
  const {
    handleRef: scrubHandleRef,
    handleProps: scrubHandleProps,
    isScrubbing,
    restoreSelection,
  } = useScrubGesture<HTMLDivElement>({
    value,
    onValueChange: handleScrubValue,
    onScrubbingChange,
    normalize: normalizeScrubValue,
    rebaseAtBoundary: wrapMode === 'clamp',
    step,
    smallStep: fineStep,
    largeStep: coarseStep,
    pixelsPerStep: scrubPixelsPerStep,
    stepDistance: stepDragDistance,
    threshold: scrubThreshold,
    commitThreshold: scrubCommitThreshold,
    maxCommitRate: scrubMaxCommitRate,
    pointerLock: pointerLockEnabled,
    enabled: scrubEnabled && !disabled && !readOnly,
    getReferenceValue: getScrubReferenceValue,
    inputRef,
  });

  useEffect(() => {
    if (!isEditing && !isScrubbing) {
      lastCommittedValueRef.current = value;
    }
  }, [isEditing, isScrubbing, value]);

  useLayoutEffect(() => {
    restoreSelection();
  }, [currentValue, restoreSelection]);

  const getModifiedStep = useCallback(
    (shiftKey: boolean, altKey: boolean) =>
      getPrimitiveModifiedStep(shiftKey, altKey, {
        step,
        fineStep,
        coarseStep,
        pageStep,
      }),
    [coarseStep, fineStep, pageStep, step],
  );

  const handleFocus = useCallback(() => {
    hasTextDraftRef.current = false;
    setIsEditing(true);
    setFocusStartValue(value);
    lastCommittedValueRef.current = value;
    setDraft(displayValue);
    if (selectAllOnFocus) {
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [displayValue, selectAllOnFocus, value]);

  const handleBlur = useCallback(() => {
    if (skipBlurCommitRef.current) {
      skipBlurCommitRef.current = false;
      return;
    }

    if (commitOnBlur) {
      commitDraft();
      return;
    }
    setDraft(displayValue);
    setIsEditing(false);
    setFocusStartValue(null);
  }, [commitDraft, commitOnBlur, displayValue]);

  const handleChange = useCallback(
    (event: ReactChangeEvent<HTMLInputElement>) => {
      hasTextDraftRef.current = true;
      setDraft(event.target.value);
      setIsEditing(true);
    },
    [],
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (disabled || readOnly) {
        return;
      }

      if (
        horizontalArrowKeysMoveCaret &&
        (event.key === 'ArrowRight' || event.key === 'ArrowLeft')
      ) {
        return;
      }

      if (
        event.key === 'ArrowRight' ||
        event.key === 'ArrowLeft' ||
        event.key === 'ArrowUp' ||
        event.key === 'ArrowDown' ||
        event.key === 'PageUp' ||
        event.key === 'PageDown' ||
        event.key === 'Home' ||
        event.key === 'End'
      ) {
        const activeStep = getModifiedStep(event.shiftKey, event.altKey);
        const stepBaseValue =
          isEditing && hasTextDraftRef.current && parsedDraft !== null
            ? parsedDraft
            : value;
        const nextValue = getPrimitiveSteppedValue({
          value: stepBaseValue,
          key: event.key,
          min,
          max,
          wrapMode,
          step: activeStep,
          pageStep,
        });
        if (nextValue === null) {
          return;
        }

        event.preventDefault();
        emitValue(nextValue, 'keyboard', {
          normalize: event.key !== 'Home' && event.key !== 'End',
        });
        setIsEditing(true);
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        commitDraft();
        skipBlurCommitRef.current = true;
        event.currentTarget.blur();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setDraft(displayValue);
        setIsEditing(false);
        setFocusStartValue(null);
        skipBlurCommitRef.current = true;
        event.currentTarget.blur();
      }
    },
    [
      commitDraft,
      disabled,
      displayValue,
      emitValue,
      getModifiedStep,
      horizontalArrowKeysMoveCaret,
      isEditing,
      max,
      min,
      pageStep,
      parsedDraft,
      readOnly,
      value,
      wrapMode,
    ],
  );

  return {
    inputRef,
    scrubHandleRef,
    currentValue,
    displayValue,
    draft,
    ariaValueNow: parsedDraft ?? undefined,
    isDraftValid,
    isEditing,
    isScrubbing,
    inputProps: {
      value: currentValue,
      disabled,
      readOnly,
      onFocus: handleFocus,
      onBlur: handleBlur,
      onChange: handleChange,
      onKeyDown: handleKeyDown,
    },
    scrubHandleProps,
  };
}
