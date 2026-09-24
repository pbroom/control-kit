import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import { getModifiedStep, isNumberAtBoundary } from './number-value.js';

/**
 * Internal horizontal scrub engine shared by `ControlField.ScrubArea` and the
 * deprecated `usePrimitiveValueInput` hook. It is intentionally not exported
 * from the package entry point.
 *
 * Behavior:
 * - movement below `threshold` pixels never starts a drag;
 * - value = start + (pixels / pixelsPerStep) * step, or whole `stepDistance`
 *   pixel segments when `stepDistance` is set;
 * - changing Shift/Alt mid-drag rebases the origin so earlier movement keeps
 *   the step it was made with;
 * - clamped values rebase the origin at the boundary so reversing direction
 *   responds immediately;
 * - updates below `commitThreshold` are skipped until release, and
 *   `maxCommitRate` batches updates into animation frames;
 * - the input's text selection is preserved across the gesture;
 * - pointer lock is opt-in and falls back to document pointer tracking.
 */
export interface ScrubGestureOptions {
  /** Value the gesture starts from, read on pointer down. */
  value: number;
  /** Called for each scrub update that clears the commit threshold. */
  onValueChange: (value: number) => void;
  /** Called once when a gesture ends, after the final update. */
  onScrubEnd?: (details: { value: number; moved: boolean }) => void;
  onScrubbingChange?: (isScrubbing: boolean) => void;
  /** Applies boundary behavior to raw scrub values. */
  normalize: (value: number) => number;
  /** Rebase the drag origin when `normalize` changes the value. */
  rebaseAtBoundary: boolean;
  step: number;
  smallStep: number;
  largeStep: number;
  pixelsPerStep?: number;
  stepDistance?: number;
  threshold: number;
  commitThreshold?: number;
  maxCommitRate?: number;
  pointerLock: boolean;
  enabled: boolean;
  /**
   * Value that commit thresholds compare against. Defaults to the last value
   * this gesture emitted (or the start value).
   */
  getReferenceValue?: () => number;
  /** Input whose selection is preserved while scrubbing. */
  inputRef?: RefObject<HTMLInputElement | null>;
}

interface InputSelectionSnapshot {
  start: number;
  end: number;
  direction: HTMLInputElement['selectionDirection'];
  selectAll: boolean;
}

interface ScrubSnapshot {
  clientX: number;
  shiftKey: boolean;
  altKey: boolean;
}

export function useScrubGesture<TElement extends HTMLElement = HTMLElement>({
  value,
  onValueChange,
  onScrubEnd,
  onScrubbingChange,
  normalize,
  rebaseAtBoundary,
  step,
  smallStep,
  largeStep,
  pixelsPerStep = 1,
  stepDistance,
  threshold,
  commitThreshold = 0,
  maxCommitRate,
  pointerLock,
  enabled,
  getReferenceValue,
  inputRef,
}: ScrubGestureOptions) {
  const handleRef = useRef<TElement>(null);
  const onScrubbingChangeRef = useRef(onScrubbingChange);
  const onScrubEndRef = useRef(onScrubEnd);
  const preservedSelectionRef = useRef<InputSelectionSnapshot | null>(null);
  const clearPreservedSelectionFrameRef = useRef<number | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const scrubStartXRef = useRef(0);
  const scrubStartValueRef = useRef(0);
  const scrubCurrentValueRef = useRef(0);
  const lastEmittedValueRef = useRef(value);
  const lastScrubXRef = useRef(0);
  const activeScrubStepRef = useRef(step);
  const hasDragStartedRef = useRef(false);
  const pendingScrubRef = useRef<ScrubSnapshot | null>(null);
  const scrubFrameRef = useRef<number | null>(null);
  const lastScrubCommitTsRef = useRef(0);
  const processPendingScrubRef = useRef<(frameTime: number) => void>(() => {});
  const [isScrubbing, setIsScrubbing] = useState(false);

  useEffect(() => {
    onScrubEndRef.current = onScrubEnd;
  }, [onScrubEnd]);

  const restoreSelection = useCallback(() => {
    const input = inputRef?.current;
    const snapshot = preservedSelectionRef.current;
    if (!input || !snapshot || document.activeElement !== input) {
      return;
    }

    const valueLength = input.value.length;
    const start = snapshot.selectAll
      ? 0
      : Math.min(snapshot.start, valueLength);
    const end = snapshot.selectAll
      ? valueLength
      : Math.min(snapshot.end, valueLength);
    input.setSelectionRange(start, end, snapshot.direction ?? undefined);
  }, [inputRef]);

  const clearPreservedSelection = useCallback(() => {
    if (clearPreservedSelectionFrameRef.current !== null) {
      cancelAnimationFrame(clearPreservedSelectionFrameRef.current);
      clearPreservedSelectionFrameRef.current = null;
    }
    preservedSelectionRef.current = null;
  }, []);

  const scheduleClearPreservedSelection = useCallback(() => {
    if (clearPreservedSelectionFrameRef.current !== null) {
      cancelAnimationFrame(clearPreservedSelectionFrameRef.current);
    }
    clearPreservedSelectionFrameRef.current = requestAnimationFrame(() => {
      restoreSelection();
      preservedSelectionRef.current = null;
      clearPreservedSelectionFrameRef.current = null;
    });
  }, [restoreSelection]);

  const preserveCurrentSelection = useCallback(() => {
    const input = inputRef?.current;
    if (!input || document.activeElement !== input) {
      preservedSelectionRef.current = null;
      return;
    }

    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    preservedSelectionRef.current = {
      start,
      end,
      direction: input.selectionDirection,
      selectAll: start === 0 && end === input.value.length,
    };
  }, [inputRef]);

  const getStep = useCallback(
    (shiftKey: boolean, altKey: boolean) =>
      getModifiedStep(shiftKey, altKey, { step, smallStep, largeStep }),
    [largeStep, smallStep, step],
  );

  const getScrubValueFromDelta = useCallback(
    (deltaPixels: number, activeStep: number) => {
      const resolvedStepDistance = stepDistance ?? 0;
      if (Number.isFinite(resolvedStepDistance) && resolvedStepDistance > 0) {
        const wholeDeltaSteps = Math.trunc(deltaPixels / resolvedStepDistance);
        return scrubStartValueRef.current + wholeDeltaSteps * activeStep;
      }

      const wholeDeltaPixels = Math.round(deltaPixels);
      const safePixelsPerStep = pixelsPerStep > 0 ? pixelsPerStep : 1;
      return (
        scrubStartValueRef.current +
        (wholeDeltaPixels / safePixelsPerStep) * activeStep
      );
    },
    [pixelsPerStep, stepDistance],
  );

  const hasPointerLock = useCallback(() => {
    return (
      handleRef.current !== null &&
      document.pointerLockElement === handleRef.current
    );
  }, []);

  const emit = useCallback(
    (nextValue: number, force: boolean) => {
      const reference = getReferenceValue
        ? getReferenceValue()
        : lastEmittedValueRef.current;
      const changed = !isNumberAtBoundary(nextValue, reference);
      if (!changed) return;
      if (
        !force &&
        Math.abs(nextValue - reference) < Math.max(0, commitThreshold)
      ) {
        return;
      }
      lastEmittedValueRef.current = nextValue;
      onValueChange(nextValue);
    },
    [commitThreshold, getReferenceValue, onValueChange],
  );

  const commitScrubValue = useCallback(
    (nextValue: number, clientX: number, force = false, publish = true) => {
      const normalized = normalize(nextValue);
      scrubCurrentValueRef.current = normalized;
      if (publish) {
        emit(normalized, force);
      }

      if (rebaseAtBoundary && normalized !== nextValue) {
        scrubStartXRef.current = clientX;
        scrubStartValueRef.current = normalized;
      }
    },
    [emit, normalize, rebaseAtBoundary],
  );

  const applyScrubSnapshot = useCallback(
    (snapshot: ScrubSnapshot, force = false, publish = true) => {
      const deltaPixels = snapshot.clientX - scrubStartXRef.current;
      if (!hasDragStartedRef.current && Math.abs(deltaPixels) < threshold) {
        lastScrubXRef.current = snapshot.clientX;
        return;
      }
      const activeStep = getStep(snapshot.shiftKey, snapshot.altKey);
      const previousStep = activeScrubStepRef.current;
      if (hasDragStartedRef.current && activeStep !== previousStep) {
        scrubStartXRef.current = lastScrubXRef.current;
        scrubStartValueRef.current = scrubCurrentValueRef.current;
      }
      hasDragStartedRef.current = true;
      setIsScrubbing(true);
      activeScrubStepRef.current = activeStep;
      const rebasedDeltaPixels = snapshot.clientX - scrubStartXRef.current;
      const nextValue = getScrubValueFromDelta(rebasedDeltaPixels, activeStep);
      lastScrubXRef.current = snapshot.clientX;
      commitScrubValue(nextValue, snapshot.clientX, force, publish);
    },
    [commitScrubValue, getStep, getScrubValueFromDelta, threshold],
  );

  const schedulePendingScrubFrame = useCallback(() => {
    scrubFrameRef.current = requestAnimationFrame((frameTime: number) => {
      processPendingScrubRef.current(frameTime);
    });
  }, []);

  const shouldRateLimitScrub = useCallback(() => {
    return (
      maxCommitRate !== undefined &&
      Number.isFinite(maxCommitRate) &&
      maxCommitRate > 0
    );
  }, [maxCommitRate]);

  const processPendingScrub = useCallback(
    (frameTime: number) => {
      scrubFrameRef.current = null;
      const pending = pendingScrubRef.current;
      if (!pending || activePointerIdRef.current === null) {
        pendingScrubRef.current = null;
        return;
      }

      const safeRate = maxCommitRate ?? 120;
      const minFrameDelta = 1000 / safeRate;
      if (
        lastScrubCommitTsRef.current > 0 &&
        frameTime >= lastScrubCommitTsRef.current &&
        frameTime - lastScrubCommitTsRef.current < minFrameDelta
      ) {
        schedulePendingScrubFrame();
        return;
      }

      pendingScrubRef.current = null;
      applyScrubSnapshot(pending);
      lastScrubCommitTsRef.current = frameTime;

      if (pendingScrubRef.current) {
        schedulePendingScrubFrame();
      }
    },
    [applyScrubSnapshot, maxCommitRate, schedulePendingScrubFrame],
  );

  useEffect(() => {
    processPendingScrubRef.current = processPendingScrub;
  }, [processPendingScrub]);

  const queueScrubValue = useCallback(
    (clientX: number, shiftKey: boolean, altKey: boolean) => {
      const snapshot = { clientX, shiftKey, altKey };
      if (!shouldRateLimitScrub()) {
        applyScrubSnapshot(snapshot);
        return;
      }

      const pending = pendingScrubRef.current;
      if (
        pending &&
        getStep(pending.shiftKey, pending.altKey) !== getStep(shiftKey, altKey)
      ) {
        // Preserve the previous movement segment without bypassing the
        // configured callback rate when modifiers change between frames.
        applyScrubSnapshot(pending, false, false);
      }
      pendingScrubRef.current = snapshot;
      if (scrubFrameRef.current === null) {
        schedulePendingScrubFrame();
      }
    },
    [
      applyScrubSnapshot,
      getStep,
      schedulePendingScrubFrame,
      shouldRateLimitScrub,
    ],
  );

  const stopScrubFrame = useCallback(() => {
    if (scrubFrameRef.current !== null) {
      cancelAnimationFrame(scrubFrameRef.current);
      scrubFrameRef.current = null;
    }
    pendingScrubRef.current = null;
  }, []);

  const endScrub = useCallback(
    (clientX = lastScrubXRef.current, shiftKey?: boolean, altKey?: boolean) => {
      const wasActive = activePointerIdRef.current !== null;
      if (wasActive) {
        if (shiftKey !== undefined && altKey !== undefined) {
          const snapshot = { clientX, shiftKey, altKey };
          applyScrubSnapshot(snapshot, true);
        } else if (pendingScrubRef.current) {
          applyScrubSnapshot(pendingScrubRef.current, true);
        } else {
          applyScrubSnapshot({ clientX, shiftKey: false, altKey: false }, true);
        }
      }
      const moved = hasDragStartedRef.current;
      activePointerIdRef.current = null;
      hasDragStartedRef.current = false;
      lastScrubCommitTsRef.current = 0;
      setIsScrubbing(false);
      stopScrubFrame();
      scheduleClearPreservedSelection();
      if (hasPointerLock()) {
        document.exitPointerLock?.();
      }
      if (wasActive) {
        onScrubEndRef.current?.({
          value: scrubCurrentValueRef.current,
          moved,
        });
      }
    },
    [
      applyScrubSnapshot,
      hasPointerLock,
      scheduleClearPreservedSelection,
      stopScrubFrame,
    ],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<TElement>) => {
      if (!enabled || event.button !== 0) {
        return;
      }
      event.preventDefault();
      clearPreservedSelection();
      preserveCurrentSelection();
      activePointerIdRef.current = event.pointerId;
      scrubStartXRef.current = event.clientX;
      lastScrubXRef.current = event.clientX;
      scrubStartValueRef.current = value;
      scrubCurrentValueRef.current = value;
      lastEmittedValueRef.current = value;
      activeScrubStepRef.current = getStep(event.shiftKey, event.altKey);
      hasDragStartedRef.current = false;
      lastScrubCommitTsRef.current = 0;
      pendingScrubRef.current = null;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      if (pointerLock) {
        try {
          const lockRequest =
            event.currentTarget.requestPointerLock?.() as Promise<void> | void;
          if (lockRequest) {
            void lockRequest.catch(() => {});
          }
        } catch {
          // Embedded previews may reject pointer lock synchronously; document
          // pointer listeners keep scrub dragging available without it.
        }
      }
    },
    [
      clearPreservedSelection,
      enabled,
      getStep,
      pointerLock,
      preserveCurrentSelection,
      value,
    ],
  );

  const handleLostPointerCapture = useCallback(
    (event: ReactPointerEvent<TElement>) => {
      if (event.pointerId === activePointerIdRef.current) {
        endScrub();
      }
    },
    [endScrub],
  );

  useEffect(() => {
    const handleDocumentPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== activePointerIdRef.current || hasPointerLock()) {
        return;
      }
      queueScrubValue(event.clientX, event.shiftKey, event.altKey);
    };

    const handleDocumentPointerUp = (event: PointerEvent) => {
      if (event.pointerId !== activePointerIdRef.current) {
        return;
      }
      if (hasPointerLock()) {
        endScrub();
      } else {
        endScrub(event.clientX, event.shiftKey, event.altKey);
      }
    };

    const handleDocumentPointerCancel = (event: PointerEvent) => {
      if (event.pointerId === activePointerIdRef.current) {
        endScrub();
      }
    };

    const handleLockedMouseMove = (event: MouseEvent) => {
      if (activePointerIdRef.current === null || !hasPointerLock()) {
        return;
      }
      queueScrubValue(
        (pendingScrubRef.current?.clientX ?? lastScrubXRef.current) +
          event.movementX,
        event.shiftKey,
        event.altKey,
      );
    };

    const handlePointerLockChange = () => {
      if (activePointerIdRef.current !== null && !hasPointerLock()) {
        endScrub();
      }
    };

    document.addEventListener('pointermove', handleDocumentPointerMove);
    document.addEventListener('pointerup', handleDocumentPointerUp);
    document.addEventListener('pointercancel', handleDocumentPointerCancel);
    document.addEventListener('mousemove', handleLockedMouseMove);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    return () => {
      document.removeEventListener('pointermove', handleDocumentPointerMove);
      document.removeEventListener('pointerup', handleDocumentPointerUp);
      document.removeEventListener(
        'pointercancel',
        handleDocumentPointerCancel,
      );
      document.removeEventListener('mousemove', handleLockedMouseMove);
      document.removeEventListener(
        'pointerlockchange',
        handlePointerLockChange,
      );
    };
  }, [endScrub, hasPointerLock, queueScrubValue]);

  useEffect(() => clearPreservedSelection, [clearPreservedSelection]);
  useEffect(() => stopScrubFrame, [stopScrubFrame]);
  useEffect(() => {
    onScrubbingChangeRef.current = onScrubbingChange;
  }, [onScrubbingChange]);
  const hasReportedScrubbingRef = useRef(false);
  useEffect(() => {
    if (!hasReportedScrubbingRef.current) {
      hasReportedScrubbingRef.current = true;
      return;
    }
    onScrubbingChangeRef.current?.(isScrubbing);
  }, [isScrubbing]);

  return {
    handleRef,
    isScrubbing,
    /** Re-applies the preserved input selection after the value re-renders. */
    restoreSelection,
    handleProps: {
      onPointerDown: handlePointerDown,
      onLostPointerCapture: handleLostPointerCapture,
    },
  };
}
