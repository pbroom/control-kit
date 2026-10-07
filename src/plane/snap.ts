// Pure snap resolution for Plane. No DOM or React here: everything is a
// function of the raw value, the targets, the measured bounds, and the
// previous hit (for hysteresis).
import type {
  PlaneSnapAxis,
  PlaneSnapHit,
  PlaneSnapTarget,
  PlaneValue,
} from './types.js';

export const DEFAULT_SNAP_RADIUS = 8;
/** A held magnetic target releases only beyond this multiple of the radius. */
export const SNAP_RELEASE_FACTOR = 1.5;

export type PlaneSnapSpace = 'unit' | 'local';

export type PlaneSnapContext = {
  targets: readonly PlaneSnapTarget[];
  /** Measured plane size in CSS pixels, used to convert the radius per axis. */
  boundsPx: { width: number; height: number };
  /** The hit from the previous sample of the same interaction, if any. */
  previous: PlaneSnapHit | null;
  /** When true, snapping is skipped entirely. */
  bypass: boolean;
  /** Magnetic radius in CSS pixels. */
  radiusPx: number;
  /** 'unit' is [0, 1] (root thumbs); 'local' is [-1, 1] (nested thumbs). */
  space?: PlaneSnapSpace;
  /** An axis held fixed by axis lock: it is never snapped. */
  lockedAxis?: PlaneSnapAxis | null;
};

export type PlaneSnapResult = { value: PlaneValue; hit: PlaneSnapHit | null };

export type PlaneGridAxis = { size: number; origin: number; index: number };
export type PlaneGridAxes = { x?: PlaneGridAxis; y?: PlaneGridAxis };

type MagneticCandidate = {
  target: Extract<PlaneSnapTarget, { type: 'point' | 'line' }>;
  index: number;
  distancePx: number;
};

const EPSILON = 1e-9;

export function getSnapRange(space: PlaneSnapSpace = 'unit') {
  return { min: space === 'local' ? -1 : 0, max: 1 };
}

function inRange(value: number, min: number, max: number) {
  return (
    Number.isFinite(value) && value >= min - EPSILON && value <= max + EPSILON
  );
}

/** Rounds away binary noise such as 0.30000000000000004. */
function tidy(value: number) {
  return Math.round(value * 1e12) / 1e12;
}

function validGridSize(size: number | undefined): size is number {
  return typeof size === 'number' && Number.isFinite(size) && size > 0;
}

/** The first grid target defining each axis wins. */
export function getPlaneGridAxes(
  targets: readonly PlaneSnapTarget[] | undefined,
): PlaneGridAxes {
  const axes: PlaneGridAxes = {};
  if (!targets) return axes;
  targets.forEach((target, index) => {
    if (target.type !== 'grid') return;
    for (const axis of ['x', 'y'] as const) {
      const size = target[axis];
      if (axes[axis] || !validGridSize(size)) continue;
      const origin = target.origin?.[axis];
      axes[axis] = {
        size,
        origin:
          typeof origin === 'number' && Number.isFinite(origin) ? origin : 0,
        index,
      };
    }
  });
  return axes;
}

/** Nearest grid line to `value` that lies inside [min, max], if any. */
export function quantizeToGrid(
  value: number,
  grid: Pick<PlaneGridAxis, 'size' | 'origin'>,
  min: number,
  max: number,
): number | null {
  if (!Number.isFinite(value)) return null;
  const { size, origin } = grid;
  const bounded = Math.min(max, Math.max(min, value));
  let line = tidy(origin + Math.round((bounded - origin) / size) * size);
  if (line > max + EPSILON) line = tidy(line - size);
  if (line < min - EPSILON) line = tidy(line + size);
  return inRange(line, min, max) ? line : null;
}

/**
 * The next grid line strictly beyond `value` in `direction`, inside
 * [min, max]. Returns null when there is none.
 */
export function getNextGridLine(
  value: number,
  direction: 1 | -1,
  grid: Pick<PlaneGridAxis, 'size' | 'origin'>,
  min: number,
  max: number,
): number | null {
  const { size, origin } = grid;
  const position = (value - origin) / size;
  // Values within EPSILON of a line count as on it.
  const k =
    direction > 0
      ? Math.floor(position + EPSILON) + 1
      : Math.ceil(position - EPSILON) - 1;
  const line = tidy(origin + k * size);
  return inRange(line, min, max) ? line : null;
}

function sameTarget(a: PlaneSnapTarget, b: PlaneSnapTarget) {
  if (a === b) return true;
  if (a.type !== b.type) return false;
  if (a.type === 'point' && b.type === 'point') {
    return a.x === b.x && a.y === b.y && a.id === b.id;
  }
  if (a.type === 'line' && b.type === 'line') {
    return a.axis === b.axis && a.at === b.at;
  }
  return false;
}

function getMagneticDistancePx(
  target: MagneticCandidate['target'],
  value: PlaneValue,
  boundsPx: { width: number; height: number },
) {
  if (target.type === 'point') {
    return Math.hypot(
      (value.x - target.x) * boundsPx.width,
      (value.y - target.y) * boundsPx.height,
    );
  }
  const size = target.axis === 'x' ? boundsPx.width : boundsPx.height;
  return Math.abs(value[target.axis] - target.at) * size;
}

function isUsableMagnetic(
  target: PlaneSnapTarget,
  min: number,
  max: number,
  lockedAxis: PlaneSnapAxis | null,
): target is MagneticCandidate['target'] {
  if (target.type === 'point') {
    // A point fixes both axes, so it cannot apply while one is locked.
    return (
      lockedAxis === null &&
      inRange(target.x, min, max) &&
      inRange(target.y, min, max)
    );
  }
  if (target.type === 'line') {
    return (
      (target.axis === 'x' || target.axis === 'y') &&
      target.axis !== lockedAxis &&
      inRange(target.at, min, max)
    );
  }
  return false;
}

const MAGNETIC_PRIORITY = { point: 2, line: 1 } as const;

function pickMagnetic(
  raw: PlaneValue,
  ctx: PlaneSnapContext,
  min: number,
  max: number,
  lockedAxis: PlaneSnapAxis | null,
): MagneticCandidate | null {
  const { boundsPx, radiusPx, targets, previous } = ctx;
  if (
    !(boundsPx.width > 0) ||
    !(boundsPx.height > 0) ||
    !(radiusPx >= 0) ||
    !Number.isFinite(radiusPx)
  ) {
    return null;
  }

  // Nearest within the radius per type; ties keep declaration order.
  const best: Partial<Record<'point' | 'line', MagneticCandidate>> = {};
  targets.forEach((target, index) => {
    if (!isUsableMagnetic(target, min, max, lockedAxis)) return;
    const distancePx = getMagneticDistancePx(target, raw, boundsPx);
    if (distancePx > radiusPx) return;
    const current = best[target.type];
    if (!current || distancePx < current.distancePx) {
      best[target.type] = { target, index, distancePx };
    }
  });

  // Hysteresis: a previously held magnetic target stays held until the value
  // moves beyond the release radius, unless a higher-priority target engages.
  let held: MagneticCandidate | null = null;
  if (previous && previous.index >= 0 && previous.index < targets.length) {
    const target = targets[previous.index];
    if (
      sameTarget(target, previous.target) &&
      isUsableMagnetic(target, min, max, lockedAxis)
    ) {
      const distancePx = getMagneticDistancePx(target, raw, boundsPx);
      if (distancePx <= radiusPx * SNAP_RELEASE_FACTOR) {
        held = { target, index: previous.index, distancePx };
      }
    }
  }

  let winner: MagneticCandidate | null = best.point ?? best.line ?? null;
  if (
    held &&
    (!winner ||
      MAGNETIC_PRIORITY[held.target.type] >=
        MAGNETIC_PRIORITY[winner.target.type])
  ) {
    winner = held;
  }
  return winner;
}

/**
 * Resolves a raw value against snap targets.
 *
 * - Custom resolvers run first, in declaration order; the first non-null
 *   result wins.
 * - Otherwise the nearest magnetic point, then line, within `radiusPx`
 *   (measured in pixels, so it is aspect-correct) engages. A held target
 *   (`previous`) releases only beyond 1.5x the radius.
 * - Grids quantize every axis no magnetic target fixed.
 * - Targets outside the space's range are ignored. The result is not
 *   clamped; callers clamp afterwards.
 */
export function resolvePlaneSnap(
  raw: PlaneValue,
  ctx: PlaneSnapContext,
): PlaneSnapResult {
  const { targets, bypass } = ctx;
  if (bypass || targets.length === 0) return { value: raw, hit: null };

  const { min, max } = getSnapRange(ctx.space);
  const lockedAxis = ctx.lockedAxis ?? null;
  const restoreLocked = (value: PlaneValue): PlaneValue =>
    lockedAxis ? { ...value, [lockedAxis]: raw[lockedAxis] } : value;

  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index];
    if (target.type !== 'custom' || typeof target.resolve !== 'function') {
      continue;
    }
    const resolved = target.resolve(raw);
    if (
      resolved &&
      Number.isFinite(resolved.x) &&
      Number.isFinite(resolved.y)
    ) {
      const axes = (['x', 'y'] as const).filter((axis) => axis !== lockedAxis);
      return {
        value: restoreLocked({ x: resolved.x, y: resolved.y }),
        hit: { target, index, axes },
      };
    }
  }

  const value = { ...raw };
  const axes: PlaneSnapAxis[] = [];
  let primary: { target: PlaneSnapTarget; index: number } | null = null;

  const magnetic = pickMagnetic(raw, ctx, min, max, lockedAxis);
  if (magnetic) {
    const { target } = magnetic;
    if (target.type === 'point') {
      value.x = target.x;
      value.y = target.y;
      axes.push('x', 'y');
    } else {
      value[target.axis] = target.at;
      axes.push(target.axis);
    }
    primary = { target, index: magnetic.index };
  }

  const grid = getPlaneGridAxes(targets);
  for (const axis of ['x', 'y'] as const) {
    const gridAxis = grid[axis];
    if (!gridAxis || axes.includes(axis) || axis === lockedAxis) continue;
    const line = quantizeToGrid(raw[axis], gridAxis, min, max);
    if (line === null) continue;
    value[axis] = line;
    axes.push(axis);
    primary ??= { target: targets[gridAxis.index], index: gridAxis.index };
  }

  if (!primary) return { value: raw, hit: null };
  axes.sort();
  return { value, hit: { ...primary, axes } };
}

/** True when `value` lies on a line of `grid`. */
export function isOnGridLine(
  value: number,
  grid: Pick<PlaneGridAxis, 'size' | 'origin'>,
) {
  const position = (value - grid.origin) / grid.size;
  return Math.abs(position - Math.round(position)) < 1e-6;
}

/**
 * The grid hit for a value that did not come from a pointer (keyboard or
 * input change): reports the axes resting on a grid line. Magnetic targets
 * are not considered.
 */
export function getPlaneGridHit(
  value: PlaneValue,
  targets: readonly PlaneSnapTarget[] | undefined,
): PlaneSnapHit | null {
  const grid = getPlaneGridAxes(targets);
  const axes: PlaneSnapAxis[] = [];
  let index = -1;
  for (const axis of ['x', 'y'] as const) {
    const gridAxis = grid[axis];
    if (!gridAxis || !isOnGridLine(value[axis], gridAxis)) continue;
    axes.push(axis);
    if (index < 0) index = gridAxis.index;
  }
  if (!targets || index < 0) return null;
  return { target: targets[index], index, axes };
}

/** Value-equality for hits, ignoring array identity. */
export function planeSnapHitsEqual(
  a: PlaneSnapHit | null,
  b: PlaneSnapHit | null,
) {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.index === b.index &&
    sameTarget(a.target, b.target) &&
    a.axes.length === b.axes.length &&
    a.axes.every((axis, i) => axis === b.axes[i])
  );
}

/**
 * Applies axis lock to a raw pointer value. `'dominant-with-shift'` locks the
 * axis with less pixel travel since `start`, only while Shift is held.
 * Returns the locked (fixed) axis, or null.
 */
export function getLockedAxis(
  axisLock: 'x' | 'y' | 'dominant-with-shift' | undefined,
  raw: PlaneValue,
  start: PlaneValue,
  boundsPx: { width: number; height: number },
  shiftKey: boolean,
): PlaneSnapAxis | null {
  if (axisLock === 'x') return 'y';
  if (axisLock === 'y') return 'x';
  if (axisLock !== 'dominant-with-shift' || !shiftKey) return null;
  const travelX = Math.abs(raw.x - start.x) * boundsPx.width;
  const travelY = Math.abs(raw.y - start.y) * boundsPx.height;
  return travelX >= travelY ? 'y' : 'x';
}
