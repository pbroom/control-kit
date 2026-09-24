import * as React from 'react';
import { cn } from '../utils.js';
import { PlaneContext, assignRef } from './context.js';
import {
  getNearestThumb,
  getPlaneValueFromPoint,
  getRelativeDragValue,
  normalizeDragSensitivity,
  pointOverPositionedThumb,
  type PlaneRelativeDragOrigin,
} from './geometry.js';
import { usePlaneHoverValue } from './use-plane-hover-value.js';
import type {
  InternalPlaneContextValue,
  PlaneBounds,
  PlanePoint,
  PlanePointerReason,
  PlaneProps,
  PlaneThumbRegistration,
  PlaneThumbSize,
  PlaneValue,
} from './types.js';

/**
 * Plane root. Owns pointer capture for the whole surface and routes pointer
 * input to one registered PlaneThumb at a time: a direct thumb press, the only
 * thumb (`pressBehavior="auto"`), or the nearest thumb
 * (`pressBehavior="nearest"`).
 */
export function Plane({
  disabled = false,
  readOnly = false,
  pressBehavior = 'auto',
  dragBehavior = 'absolute',
  dragSensitivity = 1,
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
  const relativeDragOriginRef = React.useRef<PlaneRelativeDragOrigin | null>(
    null,
  );

  function getPointerValue(point: PlanePoint, bounds: PlaneBounds): PlaneValue {
    const origin = relativeDragOriginRef.current;
    if (!origin) return getPlaneValueFromPoint(point, bounds);
    return getRelativeDragValue(origin, point, bounds);
  }

  const activePointerThumbSizeRef = React.useRef<PlaneThumbSize | null>(null);
  const activePointerReasonRef = React.useRef<PlanePointerReason | null>(null);
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
      relativeDragOriginRef.current = null;
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

  const { publishHoverValue, clearHoverValue } = usePlaneHoverValue(
    rootRef,
    onHoverValueChange,
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
          let reason: PlanePointerReason = 'thumb-drag';
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
              registrations[0].isInteractive() &&
              registrations[0].acceptsPlanePress()
            ) {
              registration = registrations[0];
              reason = 'plane-press';
            }
          } else if (pressBehavior === 'nearest') {
            const registrations = Array.from(thumbsRef.current.values()).filter(
              (thumb) => thumb.isInteractive() && thumb.acceptsPlanePress(),
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
          relativeDragOriginRef.current =
            dragBehavior === 'relative'
              ? {
                  point: { clientX: event.clientX, clientY: event.clientY },
                  value: registration.beginRelativeDrag(),
                  sensitivity: normalizeDragSensitivity(dragSensitivity),
                }
              : null;
          activePointerThumbSizeRef.current = thumbSize;
          activePointerReasonRef.current = reason;
          activeThumbKeyRef.current = registration.key;
          setActiveThumbKey(registration.key);
          event.currentTarget.setPointerCapture(event.pointerId);
          const nextValue = getPointerValue(event, bounds);
          if (!relativeDragOriginRef.current) {
            registration.publishValue(nextValue, {
              interaction: 'pointer',
              reason,
              originalEvent: event.nativeEvent,
            });
          }
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
              pointOverPositionedThumb(event, bounds, thumbSize, nextValue),
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
            const nextValue = getPointerValue(event, bounds);
            registration.publishValue(nextValue, {
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
                  pointOverPositionedThumb(event, bounds, thumbSize, nextValue),
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
          const nextValue = bounds ? getPointerValue(event, bounds) : null;
          if (canPublish && nextValue && registration) {
            registration.publishValue(nextValue, {
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
              pointOverPositionedThumb(
                event,
                bounds,
                thumbSize,
                canPublish && nextValue ? nextValue : registration.getValue(),
              ),
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
