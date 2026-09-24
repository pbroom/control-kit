import * as React from 'react';
import { pointOverThumb } from './geometry.js';
import type { PlanePoint, PlaneThumbPointerHover } from './types.js';

/**
 * Owns a PlaneThumb's hovered state across direct pointer enter/leave and the
 * Plane root's pointer capture. While the root captures a pointer the thumb no
 * longer receives enter/leave, so the root drives hover through the returned
 * `pointerHover` methods. Controlled thumbs reconcile hover against the
 * rendered thumb bounds on the next animation frame, after the consumer has
 * had a chance to apply the new value.
 */
export function usePlaneThumbHover(
  thumbRef: React.RefObject<HTMLDivElement | null>,
) {
  const [hovered, setHovered] = React.useState(false);
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

  const pointerHover = React.useMemo<PlaneThumbPointerHover>(
    () => ({
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
    }),
    [cancelPendingHoverReconcile, thumbRef, updateHovered],
  );

  return { hovered, addHoverPointer, removeHoverPointer, pointerHover };
}
