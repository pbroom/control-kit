// Plane primitives. Implementation lives in ./plane/; this module is the
// stable entry point re-exported from the package root.
export { Plane } from './plane/plane-root.js';
export { PlaneThumb } from './plane/plane-thumb.js';
export { clampPlaneValue, getPlaneValueFromPoint } from './plane/geometry.js';
export { usePlaneContext, usePlaneThumbContext } from './plane/context.js';
export { resolvePlaneSnap } from './plane/snap.js';
export { springMotion } from './plane/motion.js';
export type {
  PlaneSnapContext,
  PlaneSnapResult,
  PlaneSnapSpace,
} from './plane/snap.js';
export type { PlaneSpringOptions } from './plane/motion.js';
export type {
  PlaneAxisLock,
  PlaneBounds,
  PlaneContextValue,
  PlaneDragBehavior,
  PlaneHoverValueChangeDetails,
  PlaneInteraction,
  PlaneMotion,
  PlaneMotionReason,
  PlanePoint,
  PlanePressBehavior,
  PlaneProps,
  PlaneSnapAxis,
  PlaneSnapBypass,
  PlaneSnapHit,
  PlaneSnapHitPart,
  PlaneSnapProps,
  PlaneSnapTarget,
  PlaneThumbContextValue,
  PlaneThumbPressBehavior,
  PlaneThumbProps,
  PlaneValue,
  PlaneValueChangeDetails,
  PlaneValueChangeReason,
} from './plane/types.js';
