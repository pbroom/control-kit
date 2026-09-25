// Plane primitives. Implementation lives in ./plane/; this module is the
// stable entry point re-exported from the package root.
export { Plane } from './plane/plane-root.js';
export { PlaneThumb } from './plane/plane-thumb.js';
export { clampPlaneValue, getPlaneValueFromPoint } from './plane/geometry.js';
export { usePlaneContext, usePlaneThumbContext } from './plane/context.js';
export type {
  PlaneBounds,
  PlaneContextValue,
  PlaneDragBehavior,
  PlaneHoverValueChangeDetails,
  PlaneInteraction,
  PlanePoint,
  PlanePressBehavior,
  PlaneProps,
  PlaneThumbContextValue,
  PlaneThumbPressBehavior,
  PlaneThumbProps,
  PlaneValue,
  PlaneValueChangeDetails,
  PlaneValueChangeReason,
} from './plane/types.js';
