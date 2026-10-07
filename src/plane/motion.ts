import * as React from 'react';
import type { PlaneMotion, PlaneMotionReason, PlaneValue } from './types.js';

export type PlaneSpringOptions = {
  /** @default 500 */
  stiffness?: number;
  /** @default 38 */
  damping?: number;
  /** @default 1 */
  mass?: number;
  /** Also smooth free drag samples instead of following the pointer. */
  smoothDrag?: boolean;
};

// Integrate in small fixed slices so stiff springs stay stable on slow frames.
const MAX_SLICE_MS = 4;
const MAX_FRAME_MS = 100;
const REST_DISTANCE = 1e-4;
const REST_SPEED = 1e-3;

// Velocity is keyed by the presented value object a spring returned, and
// shared by every spring instance. A thumb therefore keeps its momentum even
// when `motion={springMotion()}` creates a new instance on each render.
const springVelocities = new WeakMap<PlaneValue, PlaneValue>();

export function prefersReducedMotion() {
  return (
    typeof globalThis.matchMedia === 'function' &&
    globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function positive(value: number | undefined, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}

/**
 * A damped spring for `PlaneThumb` presentation. One instance can drive
 * several thumbs, and an inline `springMotion()` per render keeps momentum,
 * although hoisting it (or `useMemo`) avoids the allocation. Settles
 * instantly when the user prefers reduced motion.
 */
export function springMotion(options: PlaneSpringOptions = {}): PlaneMotion {
  const stiffness = positive(options.stiffness, 500);
  const damping = positive(options.damping, 38);
  const mass = positive(options.mass, 1);

  return {
    smoothDrag: options.smoothDrag === true,
    step(current, target, dtMs) {
      if (prefersReducedMotion()) return { value: target, done: true };
      let { x, y } = current;
      let { x: vx, y: vy } = springVelocities.get(current) ?? { x: 0, y: 0 };
      let remaining = Math.max(0, Math.min(dtMs, MAX_FRAME_MS));
      while (remaining > 0) {
        const slice = Math.min(remaining, MAX_SLICE_MS) / 1000;
        remaining -= MAX_SLICE_MS;
        vx += ((-stiffness * (x - target.x) - damping * vx) / mass) * slice;
        vy += ((-stiffness * (y - target.y) - damping * vy) / mass) * slice;
        x += vx * slice;
        y += vy * slice;
      }
      const done =
        Math.hypot(x - target.x, y - target.y) < REST_DISTANCE &&
        Math.hypot(vx, vy) < REST_SPEED;
      if (done) return { value: target, done: true };
      const value = { x, y };
      springVelocities.set(value, { x: vx, y: vy });
      return { value, done: false };
    },
  };
}

/**
 * Returns the presented value for `target`.
 *
 * Without `motion` this is `target` itself: no state and no frames. With
 * `motion`, one animation-frame loop runs while the presented value is
 * moving. It reads the latest target and reason from refs, so changes during
 * an animation retarget it without restarting, and computes `dt` from frame
 * timestamps. `'drag'` changes jump instantly unless `motion.smoothDrag`.
 */
export function usePlaneMotion(
  target: PlaneValue,
  reason: PlaneMotionReason,
  motion: PlaneMotion | undefined,
): PlaneValue {
  const [presented, setPresented] = React.useState(target);
  const presentedRef = React.useRef(target);
  const targetRef = React.useRef(target);
  const reasonRef = React.useRef(reason);
  const motionRef = React.useRef(motion);
  const frameRef = React.useRef(0);
  const lastTimeRef = React.useRef<number | null>(null);
  targetRef.current = target;
  reasonRef.current = reason;
  motionRef.current = motion;
  const { x, y } = target;

  const stop = React.useCallback(() => {
    if (frameRef.current !== 0) cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
    lastTimeRef.current = null;
  }, []);

  const tick = React.useCallback((time: number) => {
    frameRef.current = 0;
    const activeMotion = motionRef.current;
    const goal = targetRef.current;
    const last = lastTimeRef.current;
    lastTimeRef.current = time;
    const result = activeMotion
      ? activeMotion.step(
          presentedRef.current,
          goal,
          last === null ? 1000 / 60 : Math.max(0, time - last),
          { reason: reasonRef.current },
        )
      : { value: goal, done: true };
    presentedRef.current = result.done ? goal : result.value;
    setPresented(presentedRef.current);
    if (result.done) lastTimeRef.current = null;
    else frameRef.current = requestAnimationFrame(tick);
  }, []);

  React.useEffect(() => {
    const goal = targetRef.current;
    const activeMotion = motionRef.current;
    if (
      !activeMotion ||
      typeof requestAnimationFrame !== 'function' ||
      (reasonRef.current === 'drag' && !activeMotion.smoothDrag)
    ) {
      // Jump: follow the target directly.
      stop();
      presentedRef.current = goal;
      if (activeMotion) setPresented(goal);
      return;
    }
    // Resume from wherever the thumb is drawn (also syncs state when motion
    // was just enabled).
    setPresented(presentedRef.current);
    if (
      presentedRef.current.x === goal.x &&
      presentedRef.current.y === goal.y
    ) {
      return;
    }
    if (frameRef.current === 0) frameRef.current = requestAnimationFrame(tick);
  }, [motion, x, y, stop, tick]);

  React.useEffect(() => stop, [stop]);

  return motion ? presented : target;
}
