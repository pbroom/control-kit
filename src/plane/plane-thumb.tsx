import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../utils.js';
import {
  NestedThumbSlotContext,
  PlaneThumbContext,
  PresentedWorldValueContext,
  assignRef,
  useInternalPlaneContext,
  type NestedThumbSlotContextValue,
} from './context.js';
import {
  DEFAULT_PLANE_VALUE,
  getValueChangeDetails,
  normalizePlaneStep,
  planeValuesEqual,
} from './geometry.js';
import {
  DEFAULT_LARGE_STEP,
  DEFAULT_SMALL_STEP,
  DEFAULT_STEP,
  getArrowChordValue,
  getArrowStep,
  getAxisKeyValue,
  getGridArrowChordValue,
  getGridAxisKeyValue,
  getKeyAxis,
  isOwnThumbEvent,
  isPlaneArrowKey,
  useArrowRepeat,
  type PlaneArrowKey,
  type PlaneAxis,
} from './keyboard.js';
import { usePlaneMotion } from './motion.js';
import {
  DEFAULT_SNAP_RADIUS,
  getLockedAxis,
  getPlaneGridAxes,
  getPlaneGridHit,
  isOnGridLine,
  isSnapHitCurrent,
  planeSnapHitsEqual,
  quantizeToGrid,
  resolvePlaneSnap,
} from './snap.js';
import { usePlaneThumbHover } from './use-plane-thumb-hover.js';
import type {
  PlaneKeyboardReason,
  PlaneMotionReason,
  PlaneResolvedPointerValue,
  PlaneSnapHit,
  PlaneThumbContextValue,
  PlaneThumbProps,
  PlaneThumbRegistration,
  PlaneValue,
  PlaneValueChangeSource,
} from './types.js';

// The snap hit recorded with the value it produced. `transition` marks values
// reached by entering, moving between, or leaving snap positions.
type PlaneSnapState = {
  value: PlaneValue;
  hit: PlaneSnapHit | null;
  transition: boolean;
};

function getDefaultAriaValueText(value: PlaneValue) {
  return `${Math.round(value.x * 100)}% horizontal, ${Math.round(value.y * 100)}% vertical`;
}

/**
 * Positioned marker inside a Plane. Renders two visually hidden range inputs
 * (one per axis) for keyboard, form, and assistive technology support, and
 * registers with the parent Plane so root-level pointer input can drive it.
 */
export function PlaneThumb({
  thumbId,
  pressBehavior = 'inherit',
  value: controlledValue,
  defaultValue: defaultValueProp,
  onValueChange,
  onValueCommitted,
  onValueCommit,
  disabled = false,
  readOnly = false,
  smallStep = DEFAULT_SMALL_STEP,
  step = DEFAULT_STEP,
  largeStep = DEFAULT_LARGE_STEP,
  xName,
  yName,
  form,
  xAriaLabel,
  yAriaLabel,
  getAriaValueText = getDefaultAriaValueText,
  snap: snapProp,
  snapRadius: snapRadiusProp,
  axisLock: axisLockProp,
  snapBypass: snapBypassProp,
  motion: motionProp,
  className,
  style,
  children,
  ref,
  'aria-label': ariaLabel,
  onFocusCapture,
  onBlurCapture,
  onPointerEnter,
  onPointerLeave,
  onPointerCancel,
  onKeyDown,
  onKeyUp,
  ...props
}: PlaneThumbProps) {
  const context = useInternalPlaneContext();
  const parentThumb = React.useContext(PlaneThumbContext);
  const parentSlot = React.useContext(NestedThumbSlotContext);
  const presentedWorldContext = React.useContext(PresentedWorldValueContext);
  // Only a parent thumb's drawn position applies; a Plane resets the context.
  const parentPresentedWorld = parentThumb ? presentedWorldContext : null;
  const { snapDefaults } = context;
  // Plane snap targets are in plane space, so nested thumbs do not inherit them.
  const snapTargets = snapProp ?? (parentThumb ? undefined : snapDefaults.snap);
  const snapRadius = snapRadiusProp ?? snapDefaults.snapRadius;
  const axisLock = axisLockProp ?? snapDefaults.axisLock;
  const snapBypass =
    snapBypassProp !== undefined
      ? snapBypassProp
      : snapDefaults.snapBypass !== undefined
        ? snapDefaults.snapBypass
        : 'alt';
  const motion = motionProp ?? snapDefaults.motion;
  const gridAxes = React.useMemo(
    () => getPlaneGridAxes(snapTargets),
    [snapTargets],
  );
  const hasGrid = gridAxes.x !== undefined || gridAxes.y !== undefined;
  const [nestedSlotElement, setNestedSlotElement] =
    React.useState<HTMLDivElement | null>(null);
  const [nestedThumbCount, setNestedThumbCount] = React.useState(0);
  const registerNestedThumb = React.useCallback(() => {
    setNestedThumbCount((count) => count + 1);
    return () => setNestedThumbCount((count) => count - 1);
  }, []);
  const nestedSlot = React.useMemo<NestedThumbSlotContextValue>(
    () => ({ container: nestedSlotElement, register: registerNestedThumb }),
    [nestedSlotElement, registerNestedThumb],
  );
  const registerWithParentSlot = parentThumb ? parentSlot?.register : undefined;
  React.useLayoutEffect(
    () => registerWithParentSlot?.(),
    [registerWithParentSlot],
  );
  // Root thumbs clamp to [0, 1]; nested thumbs are parent offsets in [-1, 1].
  const minimum = parentThumb ? -1 : 0;
  const normalizeValue = React.useCallback(
    (value: PlaneValue): PlaneValue => ({
      x: Number.isFinite(value.x) ? Math.min(1, Math.max(minimum, value.x)) : 0,
      y: Number.isFinite(value.y) ? Math.min(1, Math.max(minimum, value.y)) : 0,
    }),
    [minimum],
  );
  const defaultValue =
    defaultValueProp ?? (parentThumb ? { x: 0, y: 0 } : DEFAULT_PLANE_VALUE);
  const parentX = parentThumb?.worldValue.x ?? 0;
  const parentY = parentThumb?.worldValue.y ?? 0;
  const internalKey = React.useId();
  const [uncontrolledValue, setUncontrolledValue] = React.useState(() =>
    normalizeValue(defaultValue),
  );
  const [element, setElement] = React.useState<HTMLDivElement | null>(null);
  const [focusedWithin, setFocusedWithin] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [focusVisible, setFocusVisible] = React.useState(false);
  const [tabbableAxis, setTabbableAxis] = React.useState<PlaneAxis>('x');
  const thumbRef = React.useRef<HTMLDivElement | null>(null);
  const keyboardDirtyRef = React.useRef(false);
  const keyboardOriginalEventRef = React.useRef<Event | undefined>(undefined);
  const pressedArrowKeysRef = React.useRef(new Set<PlaneArrowKey>());
  const pointerFocusRef = React.useRef(false);
  // `onValueCommit` is the deprecated alias; the new name takes precedence.
  const onCommit = onValueCommitted ?? onValueCommit;
  const isControlled = controlledValue !== undefined;
  const sourceValue = isControlled ? controlledValue : uncontrolledValue;
  const defaultValueRef = React.useRef(defaultValue);
  defaultValueRef.current = defaultValue;
  const { x: renderedX, y: renderedY } = normalizeValue(sourceValue);
  const renderedValue = React.useMemo(
    () => ({ x: renderedX, y: renderedY }),
    [renderedX, renderedY],
  );
  const worldValue = React.useMemo(
    () => ({ x: parentX + renderedX, y: parentY + renderedY }),
    [parentX, parentY, renderedX, renderedY],
  );
  const interactionValueRef = React.useRef(renderedValue);
  const [snapState, setSnapState] = React.useState<PlaneSnapState | null>(null);
  const snapStateRef = React.useRef<PlaneSnapState | null>(null);
  // Hysteresis input for the next pointer sample of the current drag.
  const pointerSnapRef = React.useRef<PlaneSnapHit | null>(null);
  // Controlled values set by the parent are not snapped: a hit recorded for a
  // different value is dropped, as is a hit for removed or replaced targets.
  const snapStateCurrent = Boolean(
    snapState &&
    planeValuesEqual(snapState.value, renderedValue) &&
    (!snapState.hit || isSnapHitCurrent(snapState.hit, snapTargets)),
  );
  const snapped = snapStateCurrent ? (snapState?.hit ?? null) : null;
  const snapTransition = snapStateCurrent && Boolean(snapState?.transition);
  // Why the latest value changed, for the motion layer.
  const motionChangeRef = React.useRef<{
    value: PlaneValue;
    reason: PlaneMotionReason;
  } | null>(null);
  const motionChange = motionChangeRef.current;
  const motionReason: PlaneMotionReason =
    motionChange && planeValuesEqual(motionChange.value, renderedValue)
      ? motionChange.reason
      : 'programmatic';
  const motionValue = usePlaneMotion(renderedValue, motionReason, motion);
  // A motion can never draw the thumb outside its range.
  const presentedLocal = React.useMemo(
    () =>
      motionValue === renderedValue ? motionValue : normalizeValue(motionValue),
    [motionValue, normalizeValue, renderedValue],
  );
  const presentedWorld = React.useMemo(
    () => ({
      x: (parentPresentedWorld?.x ?? parentX) + presentedLocal.x,
      y: (parentPresentedWorld?.y ?? parentY) + presentedLocal.y,
    }),
    [parentPresentedWorld, parentX, parentY, presentedLocal],
  );
  const isDragging = context.activeThumbKey === internalKey;
  const isDisabled = context.disabled || parentThumb?.disabled || disabled;
  const isReadOnly = context.readOnly || parentThumb?.readOnly || readOnly;
  const { cancelThumbInteraction, registerThumb } = context;
  const normalizedSmallStep = normalizePlaneStep(smallStep, DEFAULT_SMALL_STEP);
  const normalizedStep = normalizePlaneStep(step, DEFAULT_STEP);
  const normalizedLargeStep = normalizePlaneStep(largeStep, DEFAULT_LARGE_STEP);
  const smallStepRef = React.useRef(normalizedSmallStep);
  const stepRef = React.useRef(normalizedStep);
  const largeStepRef = React.useRef(normalizedLargeStep);
  smallStepRef.current = normalizedSmallStep;
  stepRef.current = normalizedStep;
  largeStepRef.current = normalizedLargeStep;
  const modifierKeysRef = React.useRef({ alt: false, shift: false });
  const applyArrowChordRef = React.useRef<() => void>(() => {});
  const resolvedXAriaLabel =
    xAriaLabel ??
    (ariaLabel ? `${ariaLabel}, horizontal position` : 'Horizontal position');
  const resolvedYAriaLabel =
    yAriaLabel ??
    (ariaLabel ? `${ariaLabel}, vertical position` : 'Vertical position');
  const valueText = getAriaValueText(renderedValue);
  const setThumbRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      thumbRef.current = node;
      setElement(node);
      assignRef(ref, node);
    },
    [ref],
  );

  const { cancelArrowRepeat, startArrowRepeat } =
    useArrowRepeat(applyArrowChordRef);
  const { hovered, addHoverPointer, removeHoverPointer, pointerHover } =
    usePlaneThumbHover(thumbRef);

  React.useEffect(() => {
    if (isControlled) return;

    const input = thumbRef.current?.querySelector<HTMLInputElement>(
      ':scope > [data-plane-axis="x"]',
    );
    const ownerForm = input?.form;
    if (!ownerForm) return;

    const handleReset = () => {
      const resetValue = normalizeValue(defaultValueRef.current);
      keyboardDirtyRef.current = false;
      keyboardOriginalEventRef.current = undefined;
      cancelArrowRepeat();
      pressedArrowKeysRef.current.clear();
      modifierKeysRef.current = { alt: false, shift: false };
      interactionValueRef.current = resetValue;
      setUncontrolledValue(resetValue);
      cancelThumbInteraction(internalKey);
    };

    ownerForm.addEventListener('reset', handleReset);
    return () => ownerForm.removeEventListener('reset', handleReset);
  }, [
    cancelArrowRepeat,
    cancelThumbInteraction,
    form,
    internalKey,
    isControlled,
    normalizeValue,
  ]);

  React.useEffect(() => {
    if (!isDragging && !keyboardDirtyRef.current) {
      interactionValueRef.current = renderedValue;
    }
  }, [isDragging, renderedValue]);

  // An external value (for example a controlled update) replaces the
  // recorded snap, so returning to that value later does not restore it.
  React.useEffect(() => {
    const record = snapStateRef.current;
    if (record && !planeValuesEqual(record.value, renderedValue)) {
      snapStateRef.current = null;
      setSnapState(null);
    }
  }, [renderedValue]);

  React.useEffect(() => {
    if (!isDisabled && !isReadOnly) return;
    keyboardDirtyRef.current = false;
    keyboardOriginalEventRef.current = undefined;
    cancelArrowRepeat();
    pressedArrowKeysRef.current.clear();
    modifierKeysRef.current = { alt: false, shift: false };
    if (isControlled) interactionValueRef.current = renderedValue;
    cancelThumbInteraction(internalKey);
  }, [
    cancelThumbInteraction,
    cancelArrowRepeat,
    internalKey,
    isControlled,
    isDisabled,
    isReadOnly,
    renderedValue,
  ]);

  // Returns whether the change entered, moved between, or left snap
  // positions. Leaving only counts for pointer input.
  const recordSnap = React.useCallback(
    (value: PlaneValue, hit: PlaneSnapHit | null, pointer: boolean) => {
      const previous = snapStateRef.current;
      const previousHit =
        previous &&
        planeValuesEqual(previous.value, interactionValueRef.current)
          ? previous.hit
          : null;
      const transition = hit !== null || (pointer && previousHit !== null);
      // A free change after a free (or leaving) value clears the record.
      // Without snapping this never sets state.
      if (!transition) {
        if (previous) {
          snapStateRef.current = null;
          setSnapState(null);
        }
        return false;
      }
      const next: PlaneSnapState = { value, hit, transition };
      if (
        previous &&
        planeValuesEqual(previous.value, next.value) &&
        planeSnapHitsEqual(previous.hit, next.hit) &&
        previous.transition === next.transition
      ) {
        return transition;
      }
      snapStateRef.current = next;
      setSnapState(next);
      return transition;
    },
    [],
  );

  const publishValue = React.useCallback(
    (
      nextValue: PlaneValue,
      source: PlaneValueChangeSource,
      hit: PlaneSnapHit | null = null,
    ) => {
      if (isDisabled || isReadOnly) return false;
      const normalizedValue = normalizeValue(nextValue);

      const pointer = source.interaction === 'pointer';
      if (planeValuesEqual(normalizedValue, interactionValueRef.current)) {
        // No value change, but the snap state may still change (snapping to
        // a target the thumb already sits on, or a bypassed press there).
        recordSnap(normalizedValue, hit, pointer);
        return false;
      }

      const transition = recordSnap(normalizedValue, hit, pointer);
      motionChangeRef.current = {
        value: normalizedValue,
        reason: pointer ? (transition ? 'snap' : 'drag') : 'keyboard',
      };
      interactionValueRef.current = normalizedValue;
      if (!isControlled) setUncontrolledValue(normalizedValue);
      onValueChange?.(
        normalizedValue,
        getValueChangeDetails(source, thumbId, hit),
      );
      return true;
    },
    [
      isControlled,
      isDisabled,
      isReadOnly,
      normalizeValue,
      onValueChange,
      recordSnap,
      thumbId,
    ],
  );

  const getCurrentSnapHit = () => {
    const state = snapStateRef.current;
    return state?.hit &&
      planeValuesEqual(state.value, interactionValueRef.current) &&
      isSnapHitCurrent(state.hit, snapTargets)
      ? state.hit
      : null;
  };

  const setKeyboardValue = React.useCallback(
    (
      nextValue: PlaneValue,
      reason: PlaneKeyboardReason,
      originalEvent?: Event,
      gridStepped = true,
    ) => {
      // Keyboard and input changes only report grid hits, and only for the
      // axes this change moved onto a grid line. Magnetic targets do not
      // affect them.
      const normalizedValue = normalizeValue(nextValue);
      const current = interactionValueRef.current;
      const movedAxes = (['x', 'y'] as const).filter(
        (axis) => normalizedValue[axis] !== current[axis],
      );
      const changed = publishValue(
        normalizedValue,
        { interaction: 'keyboard', reason, originalEvent },
        hasGrid && gridStepped
          ? getPlaneGridHit(normalizedValue, snapTargets, movedAxes)
          : null,
      );
      keyboardDirtyRef.current ||= changed;
      return changed;
    },
    [hasGrid, normalizeValue, publishValue, snapTargets],
  );

  const getChordValue = (value: PlaneValue) => {
    if (hasGrid) {
      return getGridArrowChordValue(
        value,
        pressedArrowKeysRef.current,
        {
          smallStep: smallStepRef.current,
          step: stepRef.current,
          largeStep: largeStepRef.current,
        },
        modifierKeysRef.current,
        gridAxes,
        minimum,
      );
    }
    return getArrowChordValue(
      value,
      pressedArrowKeysRef.current,
      getArrowStep(
        smallStepRef.current,
        stepRef.current,
        largeStepRef.current,
        modifierKeysRef.current.alt,
        modifierKeysRef.current.shift,
      ),
    );
  };

  applyArrowChordRef.current = () => {
    if (pressedArrowKeysRef.current.size === 0) return;
    setKeyboardValue(
      getChordValue(interactionValueRef.current),
      'keyboard',
      keyboardOriginalEventRef.current,
      !modifierKeysRef.current.alt,
    );
  };

  const commitKeyboardValue = React.useCallback(
    (reason: PlaneKeyboardReason = 'keyboard', originalEvent?: Event) => {
      if (!keyboardDirtyRef.current) return;
      if (isDisabled || isReadOnly) {
        keyboardDirtyRef.current = false;
        return;
      }
      const committedValue = interactionValueRef.current;
      keyboardDirtyRef.current = false;
      onCommit?.(
        committedValue,
        getValueChangeDetails(
          { interaction: 'keyboard', reason, originalEvent },
          thumbId,
          getCurrentSnapHit(),
        ),
      );
      keyboardOriginalEventRef.current = undefined;
      if (isControlled) interactionValueRef.current = renderedValue;
    },
    [isControlled, isDisabled, isReadOnly, onCommit, renderedValue, thumbId],
  );

  const commitPointerValue = React.useCallback(
    (source: PlaneValueChangeSource) => {
      onCommit?.(
        interactionValueRef.current,
        getValueChangeDetails(source, thumbId, getCurrentSnapHit()),
      );
      pointerSnapRef.current = null;
      if (isControlled) interactionValueRef.current = renderedValue;
    },
    [isControlled, onCommit, renderedValue, thumbId],
  );

  const resolvePointer: PlaneThumbRegistration['resolvePointer'] = (input) => {
    const local = { x: input.value.x - parentX, y: input.value.y - parentY };
    let value = local;
    let hit: PlaneSnapHit | null = null;
    if (axisLock !== undefined || snapTargets?.length) {
      const start = { x: input.start.x - parentX, y: input.start.y - parentY };
      const boundsPx = {
        width: input.bounds.width,
        height: input.bounds.height,
      };
      const lockedAxis = getLockedAxis(
        axisLock,
        local,
        start,
        boundsPx,
        input.modifiers.shiftKey,
      );
      if (lockedAxis) value = { ...value, [lockedAxis]: start[lockedAxis] };
      if (snapTargets?.length) {
        const result = resolvePlaneSnap(value, {
          targets: snapTargets,
          boundsPx,
          previous: pointerSnapRef.current,
          bypass:
            (snapBypass === 'alt' && input.modifiers.altKey) ||
            (snapBypass === 'meta' && input.modifiers.metaKey),
          radiusPx: snapRadius ?? DEFAULT_SNAP_RADIUS,
          space: parentThumb ? 'local' : 'unit',
          lockedAxis,
        });
        value = result.value;
        hit = result.hit;
      }
    }
    const clamped = normalizeValue(value);
    const resolved: PlaneResolvedPointerValue = {
      local: clamped,
      world: { x: parentX + clamped.x, y: parentY + clamped.y },
      hit,
    };
    return resolved;
  };

  const beginRelativeDrag = () => {
    // A controlled consumer may not have accepted a previous keyboard change.
    // Start from the visible position without emitting a change on press.
    interactionValueRef.current = renderedValue;
    return worldValue;
  };

  // The registration object identity is stable for the thumb's lifetime so the
  // Plane can hold it across renders; per-render closures are refreshed below.
  const registrationRef = React.useRef<PlaneThumbRegistration | null>(null);
  if (!registrationRef.current) {
    registrationRef.current = {
      ...pointerHover,
      key: internalKey,
      getValue: () => worldValue,
      resolvePointer,
      publishPointer: () => false,
      beginPointer: () => {},
      beginRelativeDrag,
      getHoverSize: () => {
        const bounds = thumbRef.current?.getBoundingClientRect();
        return {
          width: bounds?.width ?? 0,
          height: bounds?.height ?? 0,
        };
      },
      isControlled: () => isControlled,
      isInteractive: () => !isDisabled && !isReadOnly,
      acceptsPlanePress: () => pressBehavior !== 'none',
      commitPointerValue,
      focus: () => {
        const input = thumbRef.current?.querySelector<HTMLInputElement>(
          ':scope > [data-plane-axis="x"]',
        );
        cancelArrowRepeat();
        pressedArrowKeysRef.current.clear();
        modifierKeysRef.current = { alt: false, shift: false };
        setTabbableAxis('x');
        pointerFocusRef.current = true;
        input?.focus({ preventScroll: true });
        pointerFocusRef.current = false;
        setFocusVisible(false);
      },
    };
  }

  const registration = registrationRef.current;
  registration.getValue = () => worldValue;
  registration.resolvePointer = resolvePointer;
  registration.publishPointer = (resolved, source) => {
    pointerSnapRef.current = resolved.hit;
    return publishValue(resolved.local, source, resolved.hit);
  };
  registration.beginPointer = () => {
    pointerSnapRef.current = null;
  };
  registration.beginRelativeDrag = beginRelativeDrag;
  registration.isControlled = () => isControlled;
  registration.isInteractive = () => !isDisabled && !isReadOnly;
  registration.acceptsPlanePress = () => pressBehavior !== 'none';
  registration.commitPointerValue = commitPointerValue;

  const thumbContext = React.useMemo<PlaneThumbContextValue>(
    () => ({
      value: renderedValue,
      worldValue,
      element,
      focusedWithin,
      hovered,
      dragging: isDragging,
      focused,
      focusVisible,
      disabled: isDisabled,
      readOnly: isReadOnly,
      // Omitted entirely when unsnapped.
      ...(snapped ? { snapped } : null),
    }),
    [
      snapped,
      focusVisible,
      focused,
      focusedWithin,
      element,
      worldValue,
      hovered,
      isDisabled,
      isDragging,
      isReadOnly,
      renderedValue,
    ],
  );

  React.useEffect(
    () => registerThumb(registration),
    [registerThumb, registration],
  );

  // Expose the grid size as the native step when the value sits on a grid
  // line aligned with `min`; otherwise "any", so the browser never
  // sanitizes an off-grid value (from a bypassed drag, an Alt step, or a
  // controlled value) into a different one.
  const getAxisInputStep = (axis: PlaneAxis) => {
    const gridAxis = gridAxes[axis];
    if (
      !gridAxis ||
      !isOnGridLine(renderedValue[axis], gridAxis) ||
      !isOnGridLine(minimum, gridAxis)
    ) {
      return 'any';
    }
    return gridAxis.size;
  };

  const renderAxisInput = (axis: PlaneAxis, axisAriaLabel: string) => (
    <input
      data-plane-axis={axis}
      className="sr-only"
      type="range"
      min={minimum}
      max={1}
      step={getAxisInputStep(axis)}
      tabIndex={tabbableAxis === axis ? 0 : -1}
      value={renderedValue[axis]}
      name={axis === 'x' ? xName : yName}
      form={form}
      disabled={isDisabled}
      aria-label={axisAriaLabel}
      aria-orientation={axis === 'x' ? 'horizontal' : 'vertical'}
      aria-valuetext={valueText}
      aria-readonly={isReadOnly || undefined}
      aria-roledescription="2D slider axis"
      onChange={(event) => {
        if (isReadOnly) return;
        const inputValue = Number(event.currentTarget.value);
        const gridAxis = gridAxes[axis];
        const changed = setKeyboardValue(
          {
            ...renderedValue,
            [axis]: gridAxis
              ? (quantizeToGrid(inputValue, gridAxis, minimum, 1) ?? inputValue)
              : inputValue,
          },
          'input-change',
          event.nativeEvent,
        );
        if (changed) commitKeyboardValue('input-change', event.nativeEvent);
      }}
    />
  );

  const thumb = (
    <div
      {...props}
      ref={setThumbRef}
      data-slot="plane-thumb"
      data-plane-thumb-key={internalKey}
      data-thumb-id={thumbId}
      data-hovered={hovered || undefined}
      data-dragging={isDragging || undefined}
      data-snapped={snapped ? true : undefined}
      data-snapped-axis={
        snapped && snapped.axes.length > 0
          ? snapped.axes.length > 1
            ? 'both'
            : snapped.axes[0]
          : undefined
      }
      data-snap-transition={snapTransition || undefined}
      data-disabled={isDisabled || undefined}
      data-readonly={isReadOnly || undefined}
      data-focused={focused || undefined}
      data-focus-visible={focusVisible || undefined}
      className={cn(
        'absolute z-[1] flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[color:var(--ck-border,#4c4c4c)] bg-[var(--ck-foreground,#ffffff)] text-[color:var(--ck-surface-content,#1f1f1f)] shadow-sm data-[disabled]:opacity-40 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[color:var(--ck-accent,#0d99ff)]/70 data-[focus-visible]:ring-offset-2 data-[focus-visible]:ring-offset-[color:var(--ck-surface-content,#1f1f1f)]',
        className,
      )}
      style={{
        left: `${presentedWorld.x * 100}%`,
        top: `${(1 - presentedWorld.y) * 100}%`,
        ...style,
      }}
      onPointerEnter={(event) => {
        onPointerEnter?.(event);
        if (
          !event.defaultPrevented &&
          event.target instanceof Element &&
          event.target.closest('[data-plane-thumb-key]') === event.currentTarget
        )
          addHoverPointer(event);
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        removeHoverPointer(event);
      }}
      onPointerCancel={(event) => {
        onPointerCancel?.(event);
        removeHoverPointer(event);
      }}
      onFocusCapture={(event) => {
        onFocusCapture?.(event);
        if (!event.defaultPrevented) {
          setFocusedWithin(true);
          if (
            !(event.target instanceof Element) ||
            event.target.closest('[data-plane-thumb-key]') !==
              event.currentTarget
          )
            return;
          const axis =
            event.target instanceof HTMLElement
              ? event.target.dataset.planeAxis
              : undefined;
          if (axis !== 'x' && axis !== 'y') {
            setFocused(false);
            setFocusVisible(false);
            return;
          }
          setTabbableAxis(axis);
          setFocused(true);
          setFocusVisible(
            !pointerFocusRef.current && event.target.matches(':focus-visible'),
          );
        }
      }}
      onBlurCapture={(event) => {
        onBlurCapture?.(event);
        if (event.defaultPrevented) return;
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocusedWithin(false);
        const next = event.relatedTarget;
        const nextOwnAxis =
          next instanceof HTMLElement &&
          next.closest('[data-plane-thumb-key]') === event.currentTarget &&
          (next.dataset.planeAxis === 'x' || next.dataset.planeAxis === 'y');
        if (!nextOwnAxis) {
          setFocused(false);
          setFocusVisible(false);
          cancelArrowRepeat();
          pressedArrowKeysRef.current.clear();
          modifierKeysRef.current = { alt: false, shift: false };
          commitKeyboardValue('keyboard', event.nativeEvent);
        }
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        // Consumer handlers see bubbled events from child controls and nested
        // thumbs; only this thumb's own axes drive its keyboard behavior.
        if (event.defaultPrevented || !isOwnThumbEvent(event)) return;
        const sourceAxis =
          event.target instanceof HTMLElement
            ? event.target.dataset.planeAxis
            : undefined;
        if (sourceAxis !== 'x' && sourceAxis !== 'y') return;
        if (event.key === 'Tab' && !focusVisible) {
          event.preventDefault();
          setFocusVisible(true);
          return;
        }
        if (event.key === 'Alt' || event.key === 'Shift') {
          modifierKeysRef.current = {
            alt: event.altKey || event.key === 'Alt',
            shift: event.shiftKey || event.key === 'Shift',
          };
          return;
        }
        const targetAxis = getKeyAxis(sourceAxis, event.key);
        if (!targetAxis) return;
        let nextValue: PlaneValue | null;
        if (isPlaneArrowKey(event.key)) {
          keyboardOriginalEventRef.current = event.nativeEvent;
          const wasIdle = pressedArrowKeysRef.current.size === 0;
          pressedArrowKeysRef.current.add(event.key);
          modifierKeysRef.current = {
            alt: event.altKey,
            shift: event.shiftKey,
          };
          if (wasIdle) startArrowRepeat();
          if (event.repeat) {
            event.preventDefault();
            return;
          }
          nextValue = getChordValue(interactionValueRef.current);
        } else {
          nextValue =
            (hasGrid && !event.altKey
              ? getGridAxisKeyValue(
                  sourceAxis,
                  event.key,
                  interactionValueRef.current,
                  normalizedLargeStep,
                  gridAxes,
                  minimum,
                )
              : null) ??
            getAxisKeyValue(
              sourceAxis,
              event.key,
              interactionValueRef.current,
              normalizedSmallStep,
              normalizedStep,
              normalizedLargeStep,
              event.altKey,
              event.shiftKey,
              minimum,
            );
        }
        if (!nextValue) return;

        event.preventDefault();
        setFocusVisible(true);
        if (targetAxis !== sourceAxis) {
          setTabbableAxis(targetAxis);
          event.currentTarget
            .querySelector<HTMLInputElement>(
              `:scope > [data-plane-axis="${targetAxis}"]`,
            )
            ?.focus({ preventScroll: true });
        }
        keyboardOriginalEventRef.current = event.nativeEvent;
        setKeyboardValue(
          nextValue,
          'keyboard',
          event.nativeEvent,
          !event.altKey,
        );
      }}
      onKeyUp={(event) => {
        onKeyUp?.(event);
        if (!isOwnThumbEvent(event)) return;
        const arrowKey = isPlaneArrowKey(event.key) ? event.key : null;
        if (arrowKey) pressedArrowKeysRef.current.delete(arrowKey);
        if (event.key === 'Alt' || event.key === 'Shift') {
          modifierKeysRef.current = {
            alt: event.key === 'Alt' ? false : event.altKey,
            shift: event.key === 'Shift' ? false : event.shiftKey,
          };
        }
        if (arrowKey && pressedArrowKeysRef.current.size === 0) {
          cancelArrowRepeat();
        }
        if (event.defaultPrevented) return;
        const sourceAxis =
          event.target instanceof HTMLElement
            ? event.target.dataset.planeAxis
            : undefined;
        if (
          (sourceAxis === 'x' || sourceAxis === 'y') &&
          getKeyAxis(sourceAxis, event.key) &&
          (!arrowKey || pressedArrowKeysRef.current.size === 0)
        ) {
          commitKeyboardValue('keyboard', event.nativeEvent);
        }
      }}
    >
      <PlaneThumbContext.Provider value={thumbContext}>
        <PresentedWorldValueContext.Provider value={presentedWorld}>
          <NestedThumbSlotContext.Provider value={nestedSlot}>
            {renderAxisInput('x', resolvedXAriaLabel)}
            {renderAxisInput('y', resolvedYAriaLabel)}
            {children}
          </NestedThumbSlotContext.Provider>
        </PresentedWorldValueContext.Provider>
      </PlaneThumbContext.Provider>
    </div>
  );
  const rendered = (
    <>
      {thumb}
      {nestedThumbCount > 0 ? (
        <div
          ref={setNestedSlotElement}
          data-slot="plane-thumb-nested"
          style={{ display: 'contents' }}
        />
      ) : null}
    </>
  );
  const portalContainer = parentThumb ? parentSlot?.container : null;
  return portalContainer ? createPortal(rendered, portalContainer) : rendered;
}
