import * as React from 'react';
import type { PlaneMotion, PlaneValue } from './types.js';

export type PlaneSpringOptions = {
  /** @default 500 */
  stiffness?: number;
  /** @default 38 */
  damping?: number;
  /** @default 1 */
  mass?: number;
};

// Integrate in small fixed slices so stiff springs stay stable on slow frames.
const MAX_SLICE_MS = 4;
const REST_DISTANCE = 1e-4;
const REST_SPEED = 1e-3;

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
 * A damped spring for `PlaneThumb` presentation. Velocity is tracked per
 * presented value object, so one instance can drive several thumbs. Settles
 * instantly when the user prefers reduced motion.
 */
export function springMotion(options: PlaneSpringOptions = {}): PlaneMotion {
  const stiffness = positive(options.stiffness, 500);
  const damping = positive(options.damping, 38);
  const mass = positive(options.mass, 1);
  const velocities = new WeakMap<PlaneValue, PlaneValue>();

  return {
    step(current, target, dtMs) {
      if (prefersReducedMotion()) return { value: target, done: true };
      let { x, y } = current;
      let { x: vx, y: vy } = velocities.get(current) ?? { x: 0, y: 0 };
      let remaining = Math.max(0, Math.min(dtMs, 100));
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
      velocities.set(value, { x: vx, y: vy });
      return { value, done: false };
    },
  };
}

/**
 * Returns the presented value for `target`. Without `motion` this is
 * `target` itself and no state or frames are used. With `motion`, a rAF loop
 * runs only while the presented value is moving.
 */
export function usePlaneMotion(
  target: PlaneValue,
  motion: PlaneMotion | undefined,
): PlaneValue {
  const [presented, setPresented] = React.useState(target);
  const presentedRef = React.useRef(target);
  const { x, y } = target;

  React.useEffect(() => {
    if (!motion || typeof requestAnimationFrame !== 'function') {
      presentedRef.current = target;
      return;
    }
    // Resume from wherever the thumb is currently drawn.
    setPresented(presentedRef.current);
    if (
      presentedRef.current.x === target.x &&
      presentedRef.current.y === target.y
    ) {
      return;
    }
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.max(0, now - last);
      last = now;
      const result = motion.step(presentedRef.current, target, dt);
      presentedRef.current = result.done ? target : result.value;
      setPresented(presentedRef.current);
      if (!result.done) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // `target` is keyed by its coordinates so equal values do not restart.
  }, [motion, x, y]);

  return motion ? presented : target;
}
