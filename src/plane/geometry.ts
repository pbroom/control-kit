import type {
  PlaneBounds,
  PlanePoint,
  PlaneThumbRegistration,
  PlaneThumbSize,
  PlaneValue,
  PlaneValueChangeDetails,
  PlaneValueChangeSource,
} from './types.js';

export const DEFAULT_PLANE_VALUE: PlaneValue = { x: 0.5, y: 0.5 };

export function clampCoordinate(value: number) {
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
  return clampPlaneValue(getRawPlaneValueFromPoint(point, bounds));
}

/** Like getPlaneValueFromPoint, but without clamping to the plane. */
export function getRawPlaneValueFromPoint(
  point: PlanePoint,
  bounds: PlaneBounds,
): PlaneValue {
  return {
    x: bounds.width > 0 ? (point.clientX - bounds.left) / bounds.width : 0,
    y: bounds.height > 0 ? 1 - (point.clientY - bounds.top) / bounds.height : 0,
  };
}

// Absolute percentage positioning uses the padding box, excluding the border.
// Match that coordinate space for pointer input, including CSS scaling.
export function getPlaneBounds(element: HTMLElement): PlaneBounds {
  const bounds = element.getBoundingClientRect();
  const scaleX =
    element.offsetWidth > 0 ? bounds.width / element.offsetWidth : 1;
  const scaleY =
    element.offsetHeight > 0 ? bounds.height / element.offsetHeight : 1;
  return {
    left: bounds.left + element.clientLeft * scaleX,
    top: bounds.top + element.clientTop * scaleY,
    width:
      element.offsetWidth > 0 ? element.clientWidth * scaleX : bounds.width,
    height:
      element.offsetHeight > 0 ? element.clientHeight * scaleY : bounds.height,
  };
}

export type PlaneRelativeDragOrigin = {
  point: PlanePoint;
  value: PlaneValue;
  sensitivity: number;
};

export function normalizeDragSensitivity(value: number) {
  return Number.isFinite(value) && value >= 0 ? value : 1;
}

export function getRelativeDragValue(
  origin: PlaneRelativeDragOrigin,
  point: PlanePoint,
  bounds: PlaneBounds,
): PlaneValue {
  // Keep the raw pointer delta so moving outside the plane and back does not
  // discard the grab offset. The result is unclamped; the thumb clamps it in
  // its own local space.
  return {
    x:
      origin.value.x +
      (bounds.width > 0
        ? ((point.clientX - origin.point.clientX) / bounds.width) *
          origin.sensitivity
        : 0),
    y:
      origin.value.y -
      (bounds.height > 0
        ? ((point.clientY - origin.point.clientY) / bounds.height) *
          origin.sensitivity
        : 0),
  };
}

export function planeValuesEqual(a: PlaneValue | null, b: PlaneValue | null) {
  return a === b || (a !== null && b !== null && a.x === b.x && a.y === b.y);
}

export function getValueChangeDetails(
  source: PlaneValueChangeSource,
  thumbId: string | undefined,
): PlaneValueChangeDetails {
  return thumbId ? { ...source, thumbId } : source;
}

export function normalizePlaneStep(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getNearestThumb(
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

export function planeBoundsContainPoint(
  point: PlanePoint,
  bounds: PlaneBounds,
) {
  return (
    point.clientX >= bounds.left &&
    point.clientX <= bounds.left + bounds.width &&
    point.clientY >= bounds.top &&
    point.clientY <= bounds.top + bounds.height
  );
}

export function pointOverPositionedThumb(
  point: PlanePoint,
  bounds: PlaneBounds,
  thumbSize: PlaneThumbSize,
  value: PlaneValue,
) {
  const thumbCenterX = bounds.left + value.x * bounds.width;
  const thumbCenterY = bounds.top + (1 - value.y) * bounds.height;

  return (
    Math.abs(point.clientX - thumbCenterX) <= thumbSize.width / 2 &&
    Math.abs(point.clientY - thumbCenterY) <= thumbSize.height / 2
  );
}

export function pointOverThumb(point: PlanePoint, bounds: DOMRect | null) {
  return Boolean(
    bounds &&
    point.clientX >= bounds.left &&
    point.clientX <= bounds.right &&
    point.clientY >= bounds.top &&
    point.clientY <= bounds.bottom,
  );
}
