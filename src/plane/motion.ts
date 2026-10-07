import * as React from 'react';
import type { PlaneMotion, PlaneMotionReason, PlaneValue } from './types.js';

export type PlaneSpringOptions = {
  /** Spring constant. Non-positive or non-finite values use the default. @default 500 */
  stiffness?: number;
  /**
   * Damping coefficient. The damping ratio is kept between 0.05 and 10 times
   * critical so the spring always settles; non-finite or negative values use
   * the default. Any animation also settles within 3 seconds. @default 38
   */
  damping?: number;
  /** Non-positive or non-finite values use the default. @default 1 */
  mass?: number;
  /** Also smooth free drag samples instead of following the pointer. */
  smoothDrag?: boolean;
};

const MAX_FRAME_MS = 100;
const MIN_DAMPING_RATIO = 0.05;
const MAX_DAMPING_RATIO = 10;
const REST_DISTANCE = 1e-4;
const REST_SPEED = 1e-3;
// Settle by this time even for very soft or heavily overdamped springs.
const MAX_DURATION_MS = 3000;

// Velocity is keyed by the presented value object a spring returned, and
// shared by every spring instance. A thumb therefore keeps its momentum even
// when `motion={springMotion()}` creates a new instance on each render.
// It also tracks how long the animation has run, to bound it.
const springStates = new WeakMap<
  PlaneValue,
  { vx: number; vy: number; elapsedMs: number }
>();

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
 * Advances a damped harmonic oscillator by `t` seconds using its closed-form
 * solution, so any positive stiffness and mass, and any frame length, stay
 * stable. `d` is the displacement from the target and `v` the velocity.
 */
export function stepDampedSpring(
  d: number,
  v: number,
  t: number,
  omega: number,
  zeta: number,
): { d: number; v: number } {
  if (zeta < 1 - 1e-6) {
    const wd = omega * Math.sqrt(1 - zeta * zeta);
    const decay = Math.exp(-zeta * omega * t);
    const b = (v + zeta * omega * d) / wd;
    const cos = Math.cos(wd * t);
    const sin = Math.sin(wd * t);
    const a = zeta * omega;
    return {
      d: decay * (d * cos + b * sin),
      v: decay * ((b * wd - a * d) * cos - (a * b + d * wd) * sin),
    };
  }
  if (zeta <= 1 + 1e-6) {
    const decay = Math.exp(-omega * t);
    const b = v + omega * d;
    return {
      d: (d + b * t) * decay,
      v: (b - omega * (d + b * t)) * decay,
    };
  }
  const root = Math.sqrt(zeta * zeta - 1);
  // -omega * (zeta - root), written to avoid cancellation for large zeta.
  const r1 = -omega / (zeta + root);
  const r2 = -omega * (zeta + root);
  const c2 = (v - r1 * d) / (r2 - r1);
  const c1 = d - c2;
  const e1 = Math.exp(r1 * t);
  const e2 = Math.exp(r2 * t);
  return { d: c1 * e1 + c2 * e2, v: c1 * r1 * e1 + c2 * r2 * e2 };
}

/**
 * A damped spring for `PlaneThumb` presentation, solved in closed form so it
 * is stable for every accepted option and frame length, and always settles
 * (the damping ratio is kept within 0.05–10, and any animation ends within
 * 3 seconds). One instance can drive
 * several thumbs, and an inline `springMotion()` per render keeps momentum,
 * although hoisting it (or `useMemo`) avoids the allocation. Settles
 * instantly when the user prefers reduced motion.
 */
export function springMotion(options: PlaneSpringOptions = {}): PlaneMotion {
  const stiffness = positive(options.stiffness, 500);
  const mass = positive(options.mass, 1);
  const damping =
    typeof options.damping === 'number' &&
    Number.isFinite(options.damping) &&
    options.damping >= 0
      ? options.damping
      : 38;
  const omega = Math.sqrt(stiffness / mass);
  const zeta = Math.min(
    MAX_DAMPING_RATIO,
    Math.max(MIN_DAMPING_RATIO, damping / (2 * Math.sqrt(stiffness * mass))),
  );

  return {
    smoothDrag: options.smoothDrag === true,
    step(current, target, dtMs) {
      if (prefersReducedMotion()) return { value: target, done: true };
      const state = springStates.get(current) ?? { vx: 0, vy: 0, elapsedMs: 0 };
      const frameMs = Number.isFinite(dtMs)
        ? Math.max(0, Math.min(dtMs, MAX_FRAME_MS))
        : 0;
      const elapsedMs = state.elapsedMs + frameMs;
      const t = frameMs / 1000;
      const nextX = stepDampedSpring(
        current.x - target.x,
        state.vx,
        t,
        omega,
        zeta,
      );
      const nextY = stepDampedSpring(
        current.y - target.y,
        state.vy,
        t,
        omega,
        zeta,
      );
      const finite = [nextX.d, nextX.v, nextY.d, nextY.v].every(
        Number.isFinite,
      );
      const done =
        !finite ||
        elapsedMs >= MAX_DURATION_MS ||
        (Math.hypot(nextX.d, nextY.d) < REST_DISTANCE &&
          Math.hypot(nextX.v, nextY.v) < REST_SPEED);
      if (done) return { value: target, done: true };
      const value = { x: target.x + nextX.d, y: target.y + nextY.d };
      springStates.set(value, { vx: nextX.v, vy: nextY.v, elapsedMs });
      return { value, done: false };
    },
  };
}

/**
 * Moves the given axes of a presented value straight to the target, keeping
 * any spring state for the other axes.
 */
function jumpAxes(
  from: PlaneValue,
  goal: PlaneValue,
  axes: readonly ('x' | 'y')[],
): PlaneValue {
  const next = { ...from };
  for (const axis of axes) next[axis] = goal[axis];
  const state = springStates.get(from);
  if (state) {
    springStates.set(next, {
      vx: axes.includes('x') ? 0 : state.vx,
      vy: axes.includes('y') ? 0 : state.vy,
      elapsedMs: state.elapsedMs,
    });
  }
  return next;
}

/**
 * Returns the presented value for `target`.
 *
 * Without `motion` this is `target` itself: no state and no frames. With
 * `motion`, `instantAxes` (axes following the pointer) take the new target
 * in the same render, unless `motion.smoothDrag`; the remaining axes animate
 * in one animation-frame loop that runs only while something is moving. The
 * loop reads the latest target and reason from refs, so changes retarget it
 * without restarting, and computes `dt` from frame timestamps.
 */
export function usePlaneMotion(
  target: PlaneValue,
  reason: PlaneMotionReason,
  instantAxes: readonly ('x' | 'y')[],
  motion: PlaneMotion | undefined,
): PlaneValue {
  const [, rerender] = React.useReducer((count: number) => count + 1, 0);
  const presentedRef = React.useRef(target);
  const lastTargetRef = React.useRef(target);
  const targetRef = React.useRef(target);
  const reasonRef = React.useRef(reason);
  const motionRef = React.useRef(motion);
  const frameRef = React.useRef(0);
  const lastTimeRef = React.useRef<number | null>(null);
  targetRef.current = target;
  reasonRef.current = reason;
  motionRef.current = motion;
  const { x, y } = target;

  // Applied during render so following axes never lag a frame.
  if (!motion) {
    presentedRef.current = target;
    lastTargetRef.current = target;
  } else if (
    lastTargetRef.current.x !== target.x ||
    lastTargetRef.current.y !== target.y
  ) {
    lastTargetRef.current = target;
    const axes = motion.smoothDrag ? [] : instantAxes;
    if (axes.length > 0) {
      presentedRef.current = jumpAxes(presentedRef.current, target, axes);
    }
  }

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
    rerender();
    if (result.done) lastTimeRef.current = null;
    else frameRef.current = requestAnimationFrame(tick);
  }, []);

  React.useEffect(() => {
    const goal = targetRef.current;
    const presented = presentedRef.current;
    if (presented.x === goal.x && presented.y === goal.y) {
      stop();
      return;
    }
    if (!motionRef.current || typeof requestAnimationFrame !== 'function') {
      stop();
      presentedRef.current = goal;
      rerender();
      return;
    }
    if (frameRef.current === 0) frameRef.current = requestAnimationFrame(tick);
  }, [motion, x, y, stop, tick]);

  React.useEffect(() => stop, [stop]);

  return motion ? presentedRef.current : target;
}
