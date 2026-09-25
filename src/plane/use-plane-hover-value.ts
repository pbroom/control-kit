import * as React from 'react';
import {
  getPlaneBounds,
  getPlaneValueFromPoint,
  planeBoundsContainPoint,
  planeValuesEqual,
} from './geometry.js';
import type { PlaneBounds, PlaneProps, PlaneValue } from './types.js';

/**
 * Tracks mouse and pen hover over the Plane root and reports the normalized
 * position through `onHoverValueChange`. Touch pointers are ignored. The most
 * recently moved pointer wins when several hover at once.
 */
export function usePlaneHoverValue(
  rootRef: React.RefObject<HTMLDivElement | null>,
  onHoverValueChange: PlaneProps['onHoverValueChange'],
) {
  const hoverPointersRef = React.useRef(new Map<number, PlaneValue>());
  const hoverPointerBoundsRef = React.useRef<PlaneBounds | null>(null);
  const hoverValueRef = React.useRef<PlaneValue | null>(null);
  const onHoverValueChangeRef = React.useRef(onHoverValueChange);
  onHoverValueChangeRef.current = onHoverValueChange;
  const observesHover = onHoverValueChange !== undefined;

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
  }, [observesHover, rootRef]);

  const publishHoverValue = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const notifyHoverValueChange = onHoverValueChangeRef.current;
      if (!notifyHoverValueChange || event.pointerType === 'touch') return;

      const bounds =
        hoverPointerBoundsRef.current ??
        (hoverPointerBoundsRef.current = getPlaneBounds(event.currentTarget));
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

  return { publishHoverValue, clearHoverValue };
}
