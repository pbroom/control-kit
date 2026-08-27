import * as React from 'react';
import { getPrimitiveModifiedStep } from './primitive-value-input-helpers.js';
import { cn } from './utils.js';

export type PlaneValue = {
  x: number;
  y: number;
};

export type PlaneInteraction = 'pointer' | 'keyboard';

export type PlaneValueChangeReason =
  | 'thumb-drag'
  | 'plane-press'
  | 'keyboard'
  | 'input-change';

export type PlaneValueChangeDetails = {
  interaction: PlaneInteraction;
  reason: PlaneValueChangeReason;
  thumbId?: string;
  originalEvent?: Event;
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

export type PlaneHoverValueChangeDetails = {
  pointerType: string;
  originalEvent: PointerEvent;
};

export type PlaneProps = Omit<
  React.ComponentProps<'div'>,
  'defaultValue' | 'onChange'
> & {
  disabled?: boolean;
  readOnly?: boolean;
  pressBehavior?: PlanePressBehavior;
  onHoverValueChange?: (
    value: PlaneValue | null,
    details: PlaneHoverValueChangeDetails,
  ) => void;
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
  smallStep?: number;
  largeStep?: number;
  xName?: string;
  yName?: string;
  form?: string;
  xAriaLabel?: string;
  yAriaLabel?: string;
  getAriaValueText?: (value: PlaneValue) => string;
};

export type PlaneContextValue = {
  disabled: boolean;
  readOnly: boolean;
  dragging: boolean;
};

export type PlaneThumbContextValue = {
  value: PlaneValue;
  hovered: boolean;
  dragging: boolean;
  focused: boolean;
  focusVisible: boolean;
  disabled: boolean;
  readOnly: boolean;
};

type PlaneValueChangeSource = Pick<
  PlaneValueChangeDetails,
  'interaction' | 'reason' | 'originalEvent'
>;

type PlaneThumbRegistration = {
  key: string;
  getValue: () => PlaneValue;
  getHoverSize: () => { width: number; height: number };
  isControlled: () => boolean;
  isInteractive: () => boolean;
  publishValue: (value: PlaneValue, source: PlaneValueChangeSource) => boolean;
  commitPointerValue: (source: PlaneValueChangeSource) => void;
  focus: () => void;
  syncPointerHover: (
    pointerId: number,
    pointerType: string,
    hovered: boolean,
    captured: boolean,
  ) => void;
  capturePointerHover: (pointerId: number, pointerType: string) => void;
  reconcilePointerHover: (
    pointerId: number,
    pointerType: string,
    point: PlanePoint,
    capturedOnly: boolean,
  ) => void;
  releasePointerHover: (pointerId: number, clearHover: boolean) => void;
};

type InternalPlaneContextValue = PlaneContextValue & {
  activeThumbKey: string | null;
  registerThumb: (registration: PlaneThumbRegistration) => () => void;
  cancelThumbInteraction: (thumbKey: string) => void;
};

const DEFAULT_VALUE: PlaneValue = { x: 0.5, y: 0.5 };
const DEFAULT_SMALL_STEP = 0.001;
const DEFAULT_STEP = 0.01;
const DEFAULT_LARGE_STEP = 0.1;
const PlaneContext = React.createContext<InternalPlaneContextValue | null>(
  null,
);
const PlaneThumbContext = React.createContext<PlaneThumbContextValue | null>(
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

function planeValuesEqual(a: PlaneValue | null, b: PlaneValue | null) {
  return a === b || (a !== null && b !== null && a.x === b.x && a.y === b.y);
}

function getValueChangeDetails(
  source: PlaneValueChangeSource,
  thumbId: string | undefined,
): PlaneValueChangeDetails {
  return thumbId ? { ...source, thumbId } : source;
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

export function usePlaneThumbContext(): PlaneThumbContextValue {
  const context = React.useContext(PlaneThumbContext);

  if (!context) {
    throw new Error('usePlaneThumbContext must be used inside a PlaneThumb.');
  }

  return context;
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

function planeBoundsContainPoint(point: PlanePoint, bounds: PlaneBounds) {
  return (
    point.clientX >= bounds.left &&
    point.clientX <= bounds.left + bounds.width &&
    point.clientY >= bounds.top &&
    point.clientY <= bounds.top + bounds.height
  );
}

function pointOverClampedThumb(
  point: PlanePoint,
  bounds: PlaneBounds,
  thumbSize: { width: number; height: number },
) {
  const thumbCenterX = Math.min(
    bounds.left + bounds.width,
    Math.max(bounds.left, point.clientX),
  );
  const thumbCenterY = Math.min(
    bounds.top + bounds.height,
    Math.max(bounds.top, point.clientY),
  );

  return (
    Math.abs(point.clientX - thumbCenterX) <= thumbSize.width / 2 &&
    Math.abs(point.clientY - thumbCenterY) <= thumbSize.height / 2
  );
}

function pointOverThumb(point: PlanePoint, bounds: DOMRect | null) {
  return Boolean(
    bounds &&
    point.clientX >= bounds.left &&
    point.clientX <= bounds.right &&
    point.clientY >= bounds.top &&
    point.clientY <= bounds.bottom,
  );
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
  onPointerEnter,
  onPointerDown,
  onPointerMove,
  onPointerLeave,
  onPointerUp,
  onPointerCancel,
  onLostPointerCapture,
  onHoverValueChange,
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
  const activePointerThumbSizeRef = React.useRef<{
    width: number;
    height: number;
  } | null>(null);
  const hoverPointersRef = React.useRef(new Map<number, PlaneValue>());
  const hoverPointerBoundsRef = React.useRef<PlaneBounds | null>(null);
  const hoverValueRef = React.useRef<PlaneValue | null>(null);
  const onHoverValueChangeRef = React.useRef(onHoverValueChange);
  onHoverValueChangeRef.current = onHoverValueChange;
  const observesHover = onHoverValueChange !== undefined;
  const activePointerReasonRef = React.useRef<Extract<
    PlaneValueChangeReason,
    'thumb-drag' | 'plane-press'
  > | null>(null);
  const setRootRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      assignRef(ref, node);
    },
    [ref],
  );

  const clearActivePointer = React.useCallback(
    (thumbKey?: string, clearHover = false) => {
      if (thumbKey !== undefined && activeThumbKeyRef.current !== thumbKey) {
        return false;
      }

      const pointerId = activePointerIdRef.current;
      if (pointerId === null) return false;

      const activeThumbKey = activeThumbKeyRef.current;
      if (activeThumbKey) {
        thumbsRef.current
          .get(activeThumbKey)
          ?.releasePointerHover(pointerId, clearHover);
      }

      activePointerIdRef.current = null;
      activePointerBoundsRef.current = null;
      activePointerThumbSizeRef.current = null;
      activePointerReasonRef.current = null;
      activeThumbKeyRef.current = null;
      setActiveThumbKey(null);

      if (rootRef.current?.hasPointerCapture(pointerId)) {
        rootRef.current.releasePointerCapture(pointerId);
      }

      return true;
    },
    [],
  );

  const cancelThumbInteraction = React.useCallback(
    (thumbKey: string) => {
      clearActivePointer(thumbKey, true);
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
    clearActivePointer(undefined, true);
  }, [clearActivePointer, disabled, readOnly]);

  React.useEffect(() => {
    if (!observesHover) return;

    const invalidateHoverBounds = () => {
      hoverPointerBoundsRef.current = null;
    };
    const node = rootRef.current;
    const resizeObserver =
      node && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(invalidateHoverBounds)
        : null;

    if (node) resizeObserver?.observe(node);
    window.addEventListener('resize', invalidateHoverBounds);
    window.addEventListener('scroll', invalidateHoverBounds, true);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', invalidateHoverBounds);
      window.removeEventListener('scroll', invalidateHoverBounds, true);
    };
  }, [observesHover]);

  const publishHoverValue = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const notifyHoverValueChange = onHoverValueChangeRef.current;
      if (!notifyHoverValueChange || event.pointerType === 'touch') return;

      const bounds =
        hoverPointerBoundsRef.current ??
        (hoverPointerBoundsRef.current =
          event.currentTarget.getBoundingClientRect());
      const value = getPlaneValueFromPoint(event, bounds);
      if (!planeBoundsContainPoint(event, bounds)) {
        hoverPointersRef.current.delete(event.pointerId);
        const remainingValue = Array.from(hoverPointersRef.current.values()).at(
          -1,
        );
        if (!planeValuesEqual(hoverValueRef.current, remainingValue ?? null)) {
          hoverValueRef.current = remainingValue ?? null;
          notifyHoverValueChange(remainingValue ?? null, {
            pointerType: event.pointerType,
            originalEvent: event.nativeEvent,
          });
        }
        return;
      }

      hoverPointersRef.current.delete(event.pointerId);
      hoverPointersRef.current.set(event.pointerId, value);
      if (
        hoverValueRef.current &&
        planeValuesEqual(hoverValueRef.current, value)
      ) {
        return;
      }

      hoverValueRef.current = value;
      notifyHoverValueChange(value, {
        pointerType: event.pointerType,
        originalEvent: event.nativeEvent,
      });
    },
    [],
  );

  const clearHoverValue = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'touch') {
        return;
      }

      if (!hoverPointersRef.current.delete(event.pointerId)) return;

      const remainingValue = Array.from(hoverPointersRef.current.values()).at(
        -1,
      );
      if (hoverPointersRef.current.size === 0) {
        hoverPointerBoundsRef.current = null;
      }
      if (!planeValuesEqual(hoverValueRef.current, remainingValue ?? null)) {
        hoverValueRef.current = remainingValue ?? null;
        onHoverValueChangeRef.current?.(remainingValue ?? null, {
          pointerType: event.pointerType,
          originalEvent: event.nativeEvent,
        });
      }
    },
    [],
  );

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
        onPointerEnter={(event) => {
          onPointerEnter?.(event);
          if (!event.defaultPrevented) publishHoverValue(event);
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
          let reason: Extract<
            PlaneValueChangeReason,
            'thumb-drag' | 'plane-press'
          > = 'thumb-drag';
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
              reason = 'plane-press';
            }
          } else if (pressBehavior === 'nearest') {
            const registrations = Array.from(thumbsRef.current.values()).filter(
              (thumb) => thumb.isInteractive(),
            );
            registration = getNearestThumb(registrations, event, readBounds());
            reason = 'plane-press';
          }

          if (!registration) return;

          bounds = readBounds();
          const thumbSize = registration.getHoverSize();
          event.preventDefault();
          activePointerIdRef.current = event.pointerId;
          activePointerBoundsRef.current = bounds;
          activePointerThumbSizeRef.current = thumbSize;
          activePointerReasonRef.current = reason;
          activeThumbKeyRef.current = registration.key;
          setActiveThumbKey(registration.key);
          event.currentTarget.setPointerCapture(event.pointerId);
          registration.publishValue(getPlaneValueFromPoint(event, bounds), {
            interaction: 'pointer',
            reason,
            originalEvent: event.nativeEvent,
          });
          if (registration.isControlled()) {
            registration.capturePointerHover(
              event.pointerId,
              event.pointerType,
            );
            registration.reconcilePointerHover(
              event.pointerId,
              event.pointerType,
              event,
              true,
            );
          } else {
            registration.syncPointerHover(
              event.pointerId,
              event.pointerType,
              pointOverClampedThumb(event, bounds, thumbSize),
              true,
            );
          }
          registration.focus();
        }}
        onPointerMove={(event) => {
          onPointerMove?.(event);
          if (!event.defaultPrevented) publishHoverValue(event);
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
            const reason = activePointerReasonRef.current ?? 'thumb-drag';
            registration.publishValue(getPlaneValueFromPoint(event, bounds), {
              interaction: 'pointer',
              reason,
              originalEvent: event.nativeEvent,
            });
            const thumbSize = activePointerThumbSizeRef.current;
            if (thumbSize) {
              if (registration.isControlled()) {
                registration.reconcilePointerHover(
                  event.pointerId,
                  event.pointerType,
                  event,
                  true,
                );
              } else {
                registration.syncPointerHover(
                  event.pointerId,
                  event.pointerType,
                  pointOverClampedThumb(event, bounds, thumbSize),
                  true,
                );
              }
            }
          }
        }}
        onPointerLeave={(event) => {
          onPointerLeave?.(event);
          clearHoverValue(event);
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
          const reason = activePointerReasonRef.current ?? 'thumb-drag';
          if (canPublish && bounds && registration) {
            registration.publishValue(getPlaneValueFromPoint(event, bounds), {
              interaction: 'pointer',
              reason,
              originalEvent: event.nativeEvent,
            });
          }

          const thumbSize = activePointerThumbSizeRef.current;
          if (
            registration &&
            !registration.isControlled() &&
            bounds &&
            thumbSize
          ) {
            registration.syncPointerHover(
              event.pointerId,
              event.pointerType,
              pointOverClampedThumb(event, bounds, thumbSize),
              false,
            );
          }

          clearActivePointer();
          if (registration?.isControlled()) {
            registration.reconcilePointerHover(
              event.pointerId,
              event.pointerType,
              event,
              false,
            );
          }
          if (canPublish && registration) {
            registration.commitPointerValue({
              interaction: 'pointer',
              reason,
              originalEvent: event.nativeEvent,
            });
            registration.focus();
          }
        }}
        onPointerCancel={(event) => {
          onPointerCancel?.(event);
          clearHoverValue(event);
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
          const reason = activePointerReasonRef.current ?? 'thumb-drag';

          clearActivePointer(undefined, true);
          if (shouldCommit && registration) {
            registration.commitPointerValue({
              interaction: 'pointer',
              reason,
              originalEvent: event.nativeEvent,
            });
          }
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
          const reason = activePointerReasonRef.current ?? 'thumb-drag';

          clearActivePointer(undefined, true);
          if (shouldCommit && registration) {
            registration.commitPointerValue({
              interaction: 'pointer',
              reason,
              originalEvent: event.nativeEvent,
            });
          }
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
  smallStep: number,
  step: number,
  largeStep: number,
  altKey: boolean,
  shiftKey: boolean,
): PlaneValue | null {
  const amount = getPrimitiveModifiedStep(shiftKey, altKey, {
    fineStep: smallStep,
    step,
    coarseStep: largeStep,
    pageStep: largeStep,
  });
  const nextValue = { ...value };

  if (key === 'Home') nextValue[axis] = 0;
  else if (key === 'End') nextValue[axis] = 1;
  else if (key === 'ArrowLeft') nextValue.x -= amount;
  else if (key === 'ArrowRight') nextValue.x += amount;
  else if (key === 'ArrowDown') nextValue.y -= amount;
  else if (key === 'ArrowUp') nextValue.y += amount;
  else if (key === 'PageDown') nextValue[axis] -= largeStep;
  else if (key === 'PageUp') nextValue[axis] += largeStep;
  else return null;

  return clampPlaneValue(nextValue);
}

function getArrowStep(
  smallStep: number,
  step: number,
  largeStep: number,
  altKey: boolean,
  shiftKey: boolean,
) {
  return getPrimitiveModifiedStep(shiftKey, altKey, {
    fineStep: smallStep,
    step,
    coarseStep: largeStep,
    pageStep: largeStep,
  });
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
  const [hovered, setHovered] = React.useState(false);
  const [tabbableAxis, setTabbableAxis] = React.useState<PlaneAxis>('x');
  const thumbRef = React.useRef<HTMLDivElement | null>(null);
  const keyboardDirtyRef = React.useRef(false);
  const keyboardOriginalEventRef = React.useRef<Event | undefined>(undefined);
  const pressedArrowKeysRef = React.useRef(new Set<PlaneArrowKey>());
  const pointerFocusRef = React.useRef(false);
  const hoveredRef = React.useRef(false);
  const hoverPointerIdsRef = React.useRef(new Set<number>());
  const capturedHoverPointerIdsRef = React.useRef(new Set<number>());
  const hoverReconcileFrameRef = React.useRef<number | null>(null);
  const pendingHoverReconcileRef = React.useRef<{
    pointerId: number;
    pointerType: string;
    point: PlanePoint;
    capturedOnly: boolean;
  } | null>(null);
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

  React.useEffect(
    () => () => {
      hoverPointerIdsRef.current.clear();
      capturedHoverPointerIdsRef.current.clear();
      if (hoverReconcileFrameRef.current !== null) {
        cancelAnimationFrame(hoverReconcileFrameRef.current);
      }
    },
    [],
  );

  const updateHovered = React.useCallback((nextHovered: boolean) => {
    if (hoveredRef.current === nextHovered) return;
    hoveredRef.current = nextHovered;
    setHovered(nextHovered);
  }, []);

  const cancelPendingHoverReconcile = React.useCallback((pointerId: number) => {
    if (pendingHoverReconcileRef.current?.pointerId !== pointerId) return;
    pendingHoverReconcileRef.current = null;
    if (hoverReconcileFrameRef.current !== null) {
      cancelAnimationFrame(hoverReconcileFrameRef.current);
      hoverReconcileFrameRef.current = null;
    }
  }, []);

  const addHoverPointer = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'touch') return;
      cancelPendingHoverReconcile(event.pointerId);
      hoverPointerIdsRef.current.add(event.pointerId);
      updateHovered(true);
    },
    [cancelPendingHoverReconcile, updateHovered],
  );

  const removeHoverPointer = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'touch') return;
      if (capturedHoverPointerIdsRef.current.has(event.pointerId)) return;
      cancelPendingHoverReconcile(event.pointerId);
      hoverPointerIdsRef.current.delete(event.pointerId);
      updateHovered(hoverPointerIdsRef.current.size > 0);
    },
    [cancelPendingHoverReconcile, updateHovered],
  );

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
      reason: Extract<PlaneValueChangeReason, 'keyboard' | 'input-change'>,
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
    (
      reason: Extract<
        PlaneValueChangeReason,
        'keyboard' | 'input-change'
      > = 'keyboard',
      originalEvent?: Event,
    ) => {
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

  const registrationRef = React.useRef<PlaneThumbRegistration | null>(null);
  if (!registrationRef.current) {
    registrationRef.current = {
      key: internalKey,
      getValue: () => renderedValue,
      getHoverSize: () => {
        const bounds = thumbRef.current?.getBoundingClientRect();
        return {
          width: bounds?.width ?? 0,
          height: bounds?.height ?? 0,
        };
      },
      isControlled: () => isControlled,
      isInteractive: () => !isDisabled && !isReadOnly,
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
      syncPointerHover: (pointerId, pointerType, nextHovered, captured) => {
        if (pointerType === 'touch') return;
        if (captured) capturedHoverPointerIdsRef.current.add(pointerId);
        else capturedHoverPointerIdsRef.current.delete(pointerId);
        if (nextHovered) hoverPointerIdsRef.current.add(pointerId);
        else hoverPointerIdsRef.current.delete(pointerId);
        updateHovered(hoverPointerIdsRef.current.size > 0);
      },
      capturePointerHover: (pointerId, pointerType) => {
        if (pointerType === 'touch') return;
        capturedHoverPointerIdsRef.current.add(pointerId);
      },
      reconcilePointerHover: (pointerId, pointerType, point, capturedOnly) => {
        if (pointerType === 'touch') return;
        pendingHoverReconcileRef.current = {
          pointerId,
          pointerType,
          point: { clientX: point.clientX, clientY: point.clientY },
          capturedOnly,
        };
        if (hoverReconcileFrameRef.current !== null) return;
        hoverReconcileFrameRef.current = requestAnimationFrame(() => {
          hoverReconcileFrameRef.current = null;
          const pending = pendingHoverReconcileRef.current;
          pendingHoverReconcileRef.current = null;
          if (
            !pending ||
            (pending.capturedOnly &&
              !capturedHoverPointerIdsRef.current.has(pending.pointerId))
          ) {
            return;
          }
          const nextHovered = pointOverThumb(
            pending.point,
            thumbRef.current?.getBoundingClientRect() ?? null,
          );
          if (nextHovered) hoverPointerIdsRef.current.add(pending.pointerId);
          else hoverPointerIdsRef.current.delete(pending.pointerId);
          updateHovered(hoverPointerIdsRef.current.size > 0);
        });
      },
      releasePointerHover: (pointerId, clearHover) => {
        capturedHoverPointerIdsRef.current.delete(pointerId);
        if (pendingHoverReconcileRef.current?.pointerId === pointerId) {
          cancelPendingHoverReconcile(pointerId);
        }
        if (!clearHover) return;
        hoverPointerIdsRef.current.delete(pointerId);
        updateHovered(hoverPointerIdsRef.current.size > 0);
      },
    };
  }

  const registration = registrationRef.current;
  registration.getValue = () => renderedValue;
  registration.isControlled = () => isControlled;
  registration.isInteractive = () => !isDisabled && !isReadOnly;
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
