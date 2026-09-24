import * as React from 'react';
import { cn } from '../utils.js';
import {
  PlaneThumbContext,
  assignRef,
  useInternalPlaneContext,
} from './context.js';
import {
  DEFAULT_PLANE_VALUE,
  clampCoordinate,
  clampPlaneValue,
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
  getKeyAxis,
  isPlaneArrowKey,
  useArrowRepeat,
  type PlaneArrowKey,
  type PlaneAxis,
} from './keyboard.js';
import { usePlaneThumbHover } from './use-plane-thumb-hover.js';
import type {
  PlaneKeyboardReason,
  PlaneThumbContextValue,
  PlaneThumbProps,
  PlaneThumbRegistration,
  PlaneValue,
  PlaneValueChangeSource,
} from './types.js';

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
  defaultValue = DEFAULT_PLANE_VALUE,
  onValueChange,
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
  const internalKey = React.useId();
  const [uncontrolledValue, setUncontrolledValue] = React.useState(() =>
    clampPlaneValue(defaultValue),
  );
  const [focused, setFocused] = React.useState(false);
  const [focusVisible, setFocusVisible] = React.useState(false);
  const [tabbableAxis, setTabbableAxis] = React.useState<PlaneAxis>('x');
  const thumbRef = React.useRef<HTMLDivElement | null>(null);
  const keyboardDirtyRef = React.useRef(false);
  const keyboardOriginalEventRef = React.useRef<Event | undefined>(undefined);
  const pressedArrowKeysRef = React.useRef(new Set<PlaneArrowKey>());
  const pointerFocusRef = React.useRef(false);
  const isControlled = controlledValue !== undefined;
  const sourceValue = isControlled ? controlledValue : uncontrolledValue;
  const defaultValueRef = React.useRef(defaultValue);
  defaultValueRef.current = defaultValue;
  const renderedX = clampCoordinate(sourceValue.x);
  const renderedY = clampCoordinate(sourceValue.y);
  const renderedValue = React.useMemo(
    () => ({ x: renderedX, y: renderedY }),
    [renderedX, renderedY],
  );
  const interactionValueRef = React.useRef(renderedValue);
  const isDragging = context.activeThumbKey === internalKey;
  const isDisabled = context.disabled || disabled;
  const isReadOnly = context.readOnly || readOnly;
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
      '[data-plane-axis="x"]',
    );
    const ownerForm = input?.form;
    if (!ownerForm) return;

    const handleReset = () => {
      const resetValue = clampPlaneValue(defaultValueRef.current);
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
  ]);

  React.useEffect(() => {
    if (!isDragging && !keyboardDirtyRef.current) {
      interactionValueRef.current = renderedValue;
    }
  }, [isDragging, renderedValue]);

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

  const publishValue = React.useCallback(
    (nextValue: PlaneValue, source: PlaneValueChangeSource) => {
      if (isDisabled || isReadOnly) return false;
      const normalizedValue = clampPlaneValue(nextValue);

      if (planeValuesEqual(normalizedValue, interactionValueRef.current)) {
        return false;
      }

      interactionValueRef.current = normalizedValue;
      if (!isControlled) setUncontrolledValue(normalizedValue);
      onValueChange?.(normalizedValue, getValueChangeDetails(source, thumbId));
      return true;
    },
    [isControlled, isDisabled, isReadOnly, onValueChange, thumbId],
  );

  const setKeyboardValue = React.useCallback(
    (
      nextValue: PlaneValue,
      reason: PlaneKeyboardReason,
      originalEvent?: Event,
    ) => {
      const changed = publishValue(nextValue, {
        interaction: 'keyboard',
        reason,
        originalEvent,
      });
      keyboardDirtyRef.current ||= changed;
      return changed;
    },
    [publishValue],
  );

  applyArrowChordRef.current = () => {
    if (pressedArrowKeysRef.current.size === 0) return;
    setKeyboardValue(
      getArrowChordValue(
        interactionValueRef.current,
        pressedArrowKeysRef.current,
        getArrowStep(
          smallStepRef.current,
          stepRef.current,
          largeStepRef.current,
          modifierKeysRef.current.alt,
          modifierKeysRef.current.shift,
        ),
      ),
      'keyboard',
      keyboardOriginalEventRef.current,
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
      onValueCommit?.(
        committedValue,
        getValueChangeDetails(
          { interaction: 'keyboard', reason, originalEvent },
          thumbId,
        ),
      );
      keyboardOriginalEventRef.current = undefined;
      if (isControlled) interactionValueRef.current = renderedValue;
    },
    [
      isControlled,
      isDisabled,
      isReadOnly,
      onValueCommit,
      renderedValue,
      thumbId,
    ],
  );

  const commitPointerValue = React.useCallback(
    (source: PlaneValueChangeSource) => {
      onValueCommit?.(
        interactionValueRef.current,
        getValueChangeDetails(source, thumbId),
      );
      if (isControlled) interactionValueRef.current = renderedValue;
    },
    [isControlled, onValueCommit, renderedValue, thumbId],
  );

  const beginRelativeDrag = () => {
    // A controlled consumer may not have accepted a previous keyboard change.
    // Start from the visible position without emitting a change on press.
    interactionValueRef.current = renderedValue;
    return renderedValue;
  };

  // The registration object identity is stable for the thumb's lifetime so the
  // Plane can hold it across renders; per-render closures are refreshed below.
  const registrationRef = React.useRef<PlaneThumbRegistration | null>(null);
  if (!registrationRef.current) {
    registrationRef.current = {
      ...pointerHover,
      key: internalKey,
      getValue: () => renderedValue,
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
      publishValue,
      commitPointerValue,
      focus: () => {
        const input = thumbRef.current?.querySelector<HTMLInputElement>(
          '[data-plane-axis="x"]',
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
  registration.getValue = () => renderedValue;
  registration.beginRelativeDrag = beginRelativeDrag;
  registration.isControlled = () => isControlled;
  registration.isInteractive = () => !isDisabled && !isReadOnly;
  registration.acceptsPlanePress = () => pressBehavior !== 'none';
  registration.publishValue = publishValue;
  registration.commitPointerValue = commitPointerValue;

  const thumbContext = React.useMemo<PlaneThumbContextValue>(
    () => ({
      value: renderedValue,
      hovered,
      dragging: isDragging,
      focused,
      focusVisible,
      disabled: isDisabled,
      readOnly: isReadOnly,
    }),
    [
      focusVisible,
      focused,
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

  const renderAxisInput = (axis: PlaneAxis, axisAriaLabel: string) => (
    <input
      data-plane-axis={axis}
      className="sr-only"
      type="range"
      min={0}
      max={1}
      step="any"
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
        const changed = setKeyboardValue(
          {
            ...renderedValue,
            [axis]: Number(event.currentTarget.value),
          },
          'input-change',
          event.nativeEvent,
        );
        if (changed) commitKeyboardValue('input-change', event.nativeEvent);
      }}
    />
  );

  return (
    <div
      {...props}
      ref={setThumbRef}
      data-slot="plane-thumb"
      data-plane-thumb-key={internalKey}
      data-thumb-id={thumbId}
      data-hovered={hovered || undefined}
      data-dragging={isDragging || undefined}
      data-disabled={isDisabled || undefined}
      data-readonly={isReadOnly || undefined}
      data-focused={focused || undefined}
      data-focus-visible={focusVisible || undefined}
      className={cn(
        'absolute z-[1] flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[color:var(--ck-border,#4c4c4c)] bg-[var(--ck-foreground,#ffffff)] text-[color:var(--ck-surface-content,#1f1f1f)] shadow-sm data-[disabled]:opacity-40 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[color:var(--ck-accent,#0d99ff)]/70 data-[focus-visible]:ring-offset-2 data-[focus-visible]:ring-offset-[color:var(--ck-surface-content,#1f1f1f)]',
        className,
      )}
      style={{
        left: `${renderedValue.x * 100}%`,
        top: `${(1 - renderedValue.y) * 100}%`,
        ...style,
      }}
      onPointerEnter={(event) => {
        onPointerEnter?.(event);
        if (!event.defaultPrevented) addHoverPointer(event);
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
          const axis =
            event.target instanceof HTMLElement
              ? event.target.dataset.planeAxis
              : undefined;
          if (axis === 'x' || axis === 'y') setTabbableAxis(axis);
          setFocused(true);
          setFocusVisible(
            !pointerFocusRef.current && event.target.matches(':focus-visible'),
          );
        }
      }}
      onBlurCapture={(event) => {
        onBlurCapture?.(event);
        if (
          !event.defaultPrevented &&
          !event.currentTarget.contains(event.relatedTarget)
        ) {
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
        if (event.defaultPrevented) return;
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
          nextValue = getArrowChordValue(
            interactionValueRef.current,
            pressedArrowKeysRef.current,
            getArrowStep(
              smallStepRef.current,
              stepRef.current,
              largeStepRef.current,
              modifierKeysRef.current.alt,
              modifierKeysRef.current.shift,
            ),
          );
        } else {
          nextValue = getAxisKeyValue(
            sourceAxis,
            event.key,
            interactionValueRef.current,
            normalizedSmallStep,
            normalizedStep,
            normalizedLargeStep,
            event.altKey,
            event.shiftKey,
          );
        }
        if (!nextValue) return;

        event.preventDefault();
        setFocusVisible(true);
        if (targetAxis !== sourceAxis) {
          setTabbableAxis(targetAxis);
          event.currentTarget
            .querySelector<HTMLInputElement>(
              `[data-plane-axis="${targetAxis}"]`,
            )
            ?.focus({ preventScroll: true });
        }
        keyboardOriginalEventRef.current = event.nativeEvent;
        setKeyboardValue(nextValue, 'keyboard', event.nativeEvent);
      }}
      onKeyUp={(event) => {
        onKeyUp?.(event);
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
        {children}
        {renderAxisInput('x', resolvedXAriaLabel)}
        {renderAxisInput('y', resolvedYAriaLabel)}
      </PlaneThumbContext.Provider>
    </div>
  );
}
