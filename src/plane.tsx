import * as React from 'react';
import { cn } from './utils.js';

export type PlaneValue = {
  x: number;
  y: number;
};

export type PlaneInteraction = 'pointer' | 'keyboard';

export type PlaneValueChangeDetails = {
  interaction: PlaneInteraction;
  thumbId?: string;
};

export type PlanePoint = {
  clientX: number;
  clientY: number;
};

export type PlaneBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type PlanePressBehavior = 'auto' | 'none' | 'nearest';

export type PlaneProps = Omit<
  React.ComponentProps<'div'>,
  'defaultValue' | 'onChange'
> & {
  disabled?: boolean;
  readOnly?: boolean;
  pressBehavior?: PlanePressBehavior;
};

export type PlaneThumbProps = Omit<
  React.ComponentProps<'div'>,
  'defaultValue' | 'onChange'
> & {
  thumbId?: string;
  value?: PlaneValue;
  defaultValue?: PlaneValue;
  onValueChange?: (value: PlaneValue, details: PlaneValueChangeDetails) => void;
  onValueCommit?: (value: PlaneValue, details: PlaneValueChangeDetails) => void;
  disabled?: boolean;
  readOnly?: boolean;
  step?: number;
  shiftStep?: number;
  xAriaLabel?: string;
  yAriaLabel?: string;
  getAriaValueText?: (value: PlaneValue) => string;
};

export type PlaneContextValue = {
  disabled: boolean;
  readOnly: boolean;
  dragging: boolean;
};

type PlaneThumbRegistration = {
  key: string;
  getValue: () => PlaneValue;
  isInteractive: () => boolean;
  publishValue: (value: PlaneValue, interaction: PlaneInteraction) => boolean;
  commitPointerValue: () => void;
  focus: () => void;
};

type InternalPlaneContextValue = PlaneContextValue & {
  activeThumbKey: string | null;
  registerThumb: (registration: PlaneThumbRegistration) => () => void;
  cancelThumbInteraction: (thumbKey: string) => void;
};

const DEFAULT_VALUE: PlaneValue = { x: 0.5, y: 0.5 };
const DEFAULT_STEP = 0.01;
const DEFAULT_SHIFT_STEP = 0.1;
const PlaneContext = React.createContext<InternalPlaneContextValue | null>(
  null,
);

function clampCoordinate(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function clampPlaneValue(value: PlaneValue): PlaneValue {
  return {
    x: clampCoordinate(value.x),
    y: clampCoordinate(value.y),
  };
}

export function getPlaneValueFromPoint(
  point: PlanePoint,
  bounds: PlaneBounds,
): PlaneValue {
  return clampPlaneValue({
    x: bounds.width > 0 ? (point.clientX - bounds.left) / bounds.width : 0,
    y: bounds.height > 0 ? 1 - (point.clientY - bounds.top) / bounds.height : 0,
  });
}

function planeValuesEqual(a: PlaneValue, b: PlaneValue) {
  return a.x === b.x && a.y === b.y;
}

function getValueChangeDetails(
  interaction: PlaneInteraction,
  thumbId: string | undefined,
): PlaneValueChangeDetails {
  return thumbId ? { interaction, thumbId } : { interaction };
}

function normalizePlaneStep(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function assignRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') {
    ref(value);
    return;
  }

  if (ref) ref.current = value;
}

function useInternalPlaneContext() {
  const context = React.useContext(PlaneContext);

  if (!context) {
    throw new Error('usePlaneContext must be used inside a Plane.');
  }

  return context;
}

export function usePlaneContext(): PlaneContextValue {
  return useInternalPlaneContext();
}

function getNearestThumb(
  registrations: PlaneThumbRegistration[],
  point: PlanePoint,
  bounds: PlaneBounds,
) {
  let nearest: PlaneThumbRegistration | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const registration of registrations) {
    const value = registration.getValue();
    const thumbX = bounds.left + value.x * bounds.width;
    const thumbY = bounds.top + (1 - value.y) * bounds.height;
    const distance = Math.hypot(point.clientX - thumbX, point.clientY - thumbY);

    if (distance < nearestDistance) {
      nearest = registration;
      nearestDistance = distance;
    }
  }

  return nearest;
}

export function Plane({
  disabled = false,
  readOnly = false,
  pressBehavior = 'auto',
  className,
  children,
  ref,
  role = 'group',
  'aria-label': ariaLabel = '2D position',
  'aria-roledescription': ariaRoleDescription = '2D control',
  onFocus,
  onBlur,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onLostPointerCapture,
  ...props
}: PlaneProps) {
  const [activeThumbKey, setActiveThumbKey] = React.useState<string | null>(
    null,
  );
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const thumbsRef = React.useRef(new Map<string, PlaneThumbRegistration>());
  const activeThumbKeyRef = React.useRef<string | null>(null);
  const activePointerIdRef = React.useRef<number | null>(null);
  const activePointerBoundsRef = React.useRef<PlaneBounds | null>(null);
  const setRootRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      assignRef(ref, node);
    },
    [ref],
  );

  const clearActivePointer = React.useCallback((thumbKey?: string) => {
    if (thumbKey !== undefined && activeThumbKeyRef.current !== thumbKey) {
      return false;
    }

    const pointerId = activePointerIdRef.current;
    if (pointerId === null) return false;

    activePointerIdRef.current = null;
    activePointerBoundsRef.current = null;
    activeThumbKeyRef.current = null;
    setActiveThumbKey(null);

    if (rootRef.current?.hasPointerCapture(pointerId)) {
      rootRef.current.releasePointerCapture(pointerId);
    }

    return true;
  }, []);

  const cancelThumbInteraction = React.useCallback(
    (thumbKey: string) => {
      clearActivePointer(thumbKey);
    },
    [clearActivePointer],
  );

  const registerThumb = React.useCallback(
    (registration: PlaneThumbRegistration) => {
      thumbsRef.current.set(registration.key, registration);

      return () => {
        if (thumbsRef.current.get(registration.key) !== registration) return;
        thumbsRef.current.delete(registration.key);
        cancelThumbInteraction(registration.key);
      };
    },
    [cancelThumbInteraction],
  );

  React.useEffect(() => {
    if (!disabled && !readOnly) return;
    clearActivePointer();
  }, [clearActivePointer, disabled, readOnly]);

  const context = React.useMemo<InternalPlaneContextValue>(
    () => ({
      disabled,
      readOnly,
      dragging: activeThumbKey !== null,
      activeThumbKey,
      registerThumb,
      cancelThumbInteraction,
    }),
    [activeThumbKey, cancelThumbInteraction, disabled, readOnly, registerThumb],
  );

  return (
    <PlaneContext.Provider value={context}>
      <div
        {...props}
        ref={setRootRef}
        role={role}
        aria-label={ariaLabel}
        aria-roledescription={ariaRoleDescription}
        aria-disabled={disabled || undefined}
        data-slot="plane"
        data-dragging={activeThumbKey !== null || undefined}
        data-disabled={disabled || undefined}
        data-readonly={readOnly || undefined}
        className={cn(
          'relative touch-none select-none outline-none data-[disabled]:cursor-not-allowed data-[readonly]:cursor-default',
          className,
        )}
        onFocus={(event) => {
          onFocus?.(event);
        }}
        onBlur={(event) => {
          onBlur?.(event);
        }}
        onPointerDown={(event) => {
          onPointerDown?.(event);
          if (
            event.defaultPrevented ||
            disabled ||
            readOnly ||
            activePointerIdRef.current !== null ||
            event.button !== 0
          ) {
            return;
          }

          const directThumb =
            event.target instanceof Element
              ? event.target.closest<HTMLElement>('[data-plane-thumb-key]')
              : null;
          let registration: PlaneThumbRegistration | null = null;
          let bounds: PlaneBounds | null = null;
          const readBounds = () => {
            bounds ??= event.currentTarget.getBoundingClientRect();
            return bounds;
          };

          if (directThumb && event.currentTarget.contains(directThumb)) {
            const thumbKey = directThumb.dataset.planeThumbKey;
            if (!thumbKey) return;
            const directRegistration = thumbsRef.current.get(thumbKey);
            if (!directRegistration?.isInteractive()) return;
            registration = directRegistration;
          } else if (pressBehavior === 'auto') {
            const registrations = Array.from(thumbsRef.current.values());
            if (
              registrations.length === 1 &&
              registrations[0].isInteractive()
            ) {
              registration = registrations[0];
            }
          } else if (pressBehavior === 'nearest') {
            const registrations = Array.from(thumbsRef.current.values()).filter(
              (thumb) => thumb.isInteractive(),
            );
            registration = getNearestThumb(registrations, event, readBounds());
          }

          if (!registration) return;

          bounds = readBounds();
          event.preventDefault();
          activePointerIdRef.current = event.pointerId;
          activePointerBoundsRef.current = bounds;
          activeThumbKeyRef.current = registration.key;
          setActiveThumbKey(registration.key);
          event.currentTarget.setPointerCapture(event.pointerId);
          registration.publishValue(
            getPlaneValueFromPoint(event, bounds),
            'pointer',
          );
          registration.focus();
        }}
        onPointerMove={(event) => {
          onPointerMove?.(event);
          if (
            event.defaultPrevented ||
            disabled ||
            readOnly ||
            activePointerIdRef.current !== event.pointerId
          ) {
            return;
          }

          const bounds = activePointerBoundsRef.current;
          const thumbKey = activeThumbKeyRef.current;
          const registration = thumbKey
            ? thumbsRef.current.get(thumbKey)
            : undefined;
          if (bounds && registration?.isInteractive()) {
            registration.publishValue(
              getPlaneValueFromPoint(event, bounds),
              'pointer',
            );
          }
        }}
        onPointerUp={(event) => {
          onPointerUp?.(event);
          if (activePointerIdRef.current !== event.pointerId) return;

          const thumbKey = activeThumbKeyRef.current;
          const registration = thumbKey
            ? thumbsRef.current.get(thumbKey)
            : undefined;
          const canPublish = Boolean(
            !event.defaultPrevented &&
            !disabled &&
            !readOnly &&
            registration?.isInteractive(),
          );
          const bounds = activePointerBoundsRef.current;
          if (canPublish && bounds && registration) {
            registration.publishValue(
              getPlaneValueFromPoint(event, bounds),
              'pointer',
            );
          }

          clearActivePointer();
          if (canPublish && registration) {
            registration.commitPointerValue();
            registration.focus();
          }
        }}
        onPointerCancel={(event) => {
          onPointerCancel?.(event);
          if (activePointerIdRef.current !== event.pointerId) return;

          const thumbKey = activeThumbKeyRef.current;
          const registration = thumbKey
            ? thumbsRef.current.get(thumbKey)
            : undefined;
          const shouldCommit = Boolean(
            !event.defaultPrevented &&
            !disabled &&
            !readOnly &&
            registration?.isInteractive(),
          );

          clearActivePointer();
          if (shouldCommit && registration) registration.commitPointerValue();
        }}
        onLostPointerCapture={(event) => {
          onLostPointerCapture?.(event);
          if (activePointerIdRef.current !== event.pointerId) return;

          const thumbKey = activeThumbKeyRef.current;
          const registration = thumbKey
            ? thumbsRef.current.get(thumbKey)
            : undefined;
          const shouldCommit = Boolean(
            !event.defaultPrevented &&
            !disabled &&
            !readOnly &&
            registration?.isInteractive(),
          );

          clearActivePointer();
          if (shouldCommit && registration) registration.commitPointerValue();
        }}
      >
        {children}
      </div>
    </PlaneContext.Provider>
  );
}

function getDefaultAriaValueText(value: PlaneValue) {
  return `${Math.round(value.x * 100)}% horizontal, ${Math.round(value.y * 100)}% vertical`;
}

type PlaneAxis = 'x' | 'y';
type PlaneArrowKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowDown' | 'ArrowUp';

const ARROW_REPEAT_DELAY = 300;
const ARROW_REPEAT_INTERVAL = 50;

function isPlaneArrowKey(key: string): key is PlaneArrowKey {
  return (
    key === 'ArrowLeft' ||
    key === 'ArrowRight' ||
    key === 'ArrowDown' ||
    key === 'ArrowUp'
  );
}

function getArrowChordValue(
  value: PlaneValue,
  keys: ReadonlySet<PlaneArrowKey>,
  amount: number,
) {
  return clampPlaneValue({
    x:
      value.x +
      (keys.has('ArrowRight') ? amount : 0) -
      (keys.has('ArrowLeft') ? amount : 0),
    y:
      value.y +
      (keys.has('ArrowUp') ? amount : 0) -
      (keys.has('ArrowDown') ? amount : 0),
  });
}

function getAxisKeyValue(
  axis: PlaneAxis,
  key: string,
  value: PlaneValue,
  step: number,
  shiftStep: number,
  shiftKey: boolean,
): PlaneValue | null {
  const amount = shiftKey ? shiftStep : step;
  const nextValue = { ...value };

  if (key === 'Home') nextValue[axis] = 0;
  else if (key === 'End') nextValue[axis] = 1;
  else if (key === 'ArrowLeft') nextValue.x -= amount;
  else if (key === 'ArrowRight') nextValue.x += amount;
  else if (key === 'ArrowDown') nextValue.y -= amount;
  else if (key === 'ArrowUp') nextValue.y += amount;
  else if (key === 'PageDown') nextValue[axis] -= shiftStep;
  else if (key === 'PageUp') nextValue[axis] += shiftStep;
  else return null;

  return clampPlaneValue(nextValue);
}

function getKeyAxis(axis: PlaneAxis, key: string): PlaneAxis | null {
  if (key === 'ArrowLeft' || key === 'ArrowRight') return 'x';
  if (key === 'ArrowDown' || key === 'ArrowUp') return 'y';
  if (
    key === 'Home' ||
    key === 'End' ||
    key === 'PageDown' ||
    key === 'PageUp'
  ) {
    return axis;
  }
  return null;
}

export function PlaneThumb({
  thumbId,
  value: controlledValue,
  defaultValue = DEFAULT_VALUE,
  onValueChange,
  onValueCommit,
  disabled = false,
  readOnly = false,
  step = DEFAULT_STEP,
  shiftStep = DEFAULT_SHIFT_STEP,
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
  const pressedArrowKeysRef = React.useRef(new Set<PlaneArrowKey>());
  const pointerFocusRef = React.useRef(false);
  const isControlled = controlledValue !== undefined;
  const sourceValue = isControlled ? controlledValue : uncontrolledValue;
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
  const normalizedStep = normalizePlaneStep(step, DEFAULT_STEP);
  const normalizedShiftStep = normalizePlaneStep(shiftStep, DEFAULT_SHIFT_STEP);
  const arrowStepRef = React.useRef(normalizedStep);
  const arrowRepeatTimeoutRef = React.useRef<number | null>(null);
  const arrowRepeatIntervalRef = React.useRef<number | null>(null);
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

  const cancelArrowRepeat = React.useCallback(() => {
    if (arrowRepeatTimeoutRef.current !== null) {
      window.clearTimeout(arrowRepeatTimeoutRef.current);
      arrowRepeatTimeoutRef.current = null;
    }
    if (arrowRepeatIntervalRef.current !== null) {
      window.clearInterval(arrowRepeatIntervalRef.current);
      arrowRepeatIntervalRef.current = null;
    }
  }, []);

  const startArrowRepeat = React.useCallback(() => {
    if (
      arrowRepeatTimeoutRef.current !== null ||
      arrowRepeatIntervalRef.current !== null
    ) {
      return;
    }
    arrowRepeatTimeoutRef.current = window.setTimeout(() => {
      arrowRepeatTimeoutRef.current = null;
      applyArrowChordRef.current();
      arrowRepeatIntervalRef.current = window.setInterval(() => {
        applyArrowChordRef.current();
      }, ARROW_REPEAT_INTERVAL);
    }, ARROW_REPEAT_DELAY);
  }, []);

  React.useEffect(() => cancelArrowRepeat, [cancelArrowRepeat]);

  React.useEffect(() => {
    if (!isDragging && !keyboardDirtyRef.current) {
      interactionValueRef.current = renderedValue;
    }
  }, [isDragging, renderedValue]);

  React.useEffect(() => {
    if (!isDisabled && !isReadOnly) return;
    keyboardDirtyRef.current = false;
    cancelArrowRepeat();
    pressedArrowKeysRef.current.clear();
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
    (nextValue: PlaneValue, interaction: PlaneInteraction) => {
      if (isDisabled || isReadOnly) return false;
      const normalizedValue = clampPlaneValue(nextValue);

      if (planeValuesEqual(normalizedValue, interactionValueRef.current)) {
        return false;
      }

      interactionValueRef.current = normalizedValue;
      if (!isControlled) setUncontrolledValue(normalizedValue);
      onValueChange?.(
        normalizedValue,
        getValueChangeDetails(interaction, thumbId),
      );
      return true;
    },
    [isControlled, isDisabled, isReadOnly, onValueChange, thumbId],
  );

  const setKeyboardValue = React.useCallback(
    (nextValue: PlaneValue) => {
      const changed = publishValue(nextValue, 'keyboard');
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
        arrowStepRef.current,
      ),
    );
  };

  const commitKeyboardValue = React.useCallback(() => {
    if (!keyboardDirtyRef.current) return;
    if (isDisabled || isReadOnly) {
      keyboardDirtyRef.current = false;
      return;
    }
    const committedValue = interactionValueRef.current;
    keyboardDirtyRef.current = false;
    onValueCommit?.(committedValue, getValueChangeDetails('keyboard', thumbId));
    if (isControlled) interactionValueRef.current = renderedValue;
  }, [
    isControlled,
    isDisabled,
    isReadOnly,
    onValueCommit,
    renderedValue,
    thumbId,
  ]);

  const commitPointerValue = React.useCallback(() => {
    onValueCommit?.(
      interactionValueRef.current,
      getValueChangeDetails('pointer', thumbId),
    );
    if (isControlled) interactionValueRef.current = renderedValue;
  }, [isControlled, onValueCommit, renderedValue, thumbId]);

  const registrationRef = React.useRef<PlaneThumbRegistration | null>(null);
  if (!registrationRef.current) {
    registrationRef.current = {
      key: internalKey,
      getValue: () => renderedValue,
      isInteractive: () => !isDisabled && !isReadOnly,
      publishValue,
      commitPointerValue,
      focus: () => {
        const input = thumbRef.current?.querySelector<HTMLInputElement>(
          '[data-plane-axis="x"]',
        );
        cancelArrowRepeat();
        pressedArrowKeysRef.current.clear();
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
  registration.isInteractive = () => !isDisabled && !isReadOnly;
  registration.publishValue = publishValue;
  registration.commitPointerValue = commitPointerValue;

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
      step={normalizedStep}
      tabIndex={tabbableAxis === axis ? 0 : -1}
      value={renderedValue[axis]}
      disabled={isDisabled}
      aria-label={axisAriaLabel}
      aria-orientation={axis === 'x' ? 'horizontal' : 'vertical'}
      aria-valuetext={valueText}
      aria-readonly={isReadOnly || undefined}
      aria-roledescription="2D slider axis"
      onChange={(event) => {
        if (isReadOnly) return;
        const changed = setKeyboardValue({
          ...renderedValue,
          [axis]: Number(event.currentTarget.value),
        });
        if (changed) commitKeyboardValue();
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
          commitKeyboardValue();
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
        const targetAxis = getKeyAxis(sourceAxis, event.key);
        if (!targetAxis) return;
        let nextValue: PlaneValue | null;
        if (isPlaneArrowKey(event.key)) {
          const wasIdle = pressedArrowKeysRef.current.size === 0;
          pressedArrowKeysRef.current.add(event.key);
          arrowStepRef.current = event.shiftKey
            ? normalizedShiftStep
            : normalizedStep;
          if (wasIdle) startArrowRepeat();
          if (event.repeat) {
            event.preventDefault();
            return;
          }
          nextValue = getArrowChordValue(
            interactionValueRef.current,
            pressedArrowKeysRef.current,
            arrowStepRef.current,
          );
        } else {
          nextValue = getAxisKeyValue(
            sourceAxis,
            event.key,
            interactionValueRef.current,
            normalizedStep,
            normalizedShiftStep,
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
        setKeyboardValue(nextValue);
      }}
      onKeyUp={(event) => {
        onKeyUp?.(event);
        const arrowKey = isPlaneArrowKey(event.key) ? event.key : null;
        if (arrowKey) pressedArrowKeysRef.current.delete(arrowKey);
        if (event.key === 'Shift') arrowStepRef.current = normalizedStep;
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
          commitKeyboardValue();
        }
      }}
    >
      {children}
      {renderAxisInput('x', resolvedXAriaLabel)}
      {renderAxisInput('y', resolvedYAriaLabel)}
    </div>
  );
}
