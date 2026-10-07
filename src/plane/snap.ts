// Pure snap resolution for Plane. No DOM or React here: everything is a
// function of the raw value, the targets, the measured bounds, and the
// previous hit (for hysteresis).
import type {
  PlaneSnapAxis,
  PlaneSnapHit,
  PlaneSnapHitPart,
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
  if (a.type === 'grid' && b.type === 'grid') {
    return (
      a.x === b.x &&
      a.y === b.y &&
      a.origin?.x === b.origin?.x &&
      a.origin?.y === b.origin?.y
    );
  }
  // Custom resolvers are commonly recreated each render; at the same index
  // they count as the same target.
  return a.type === 'custom';
}

function getHitParts(hit: PlaneSnapHit): readonly PlaneSnapHitPart[] {
  return hit.parts ?? [hit];
}

/**
 * True when the same target (by index and value) fixes `axis` in both hits,
 * or neither hit fixes it.
 */
export function sameSnapAxisSource(
  a: PlaneSnapHit | null,
  b: PlaneSnapHit | null,
  axis: PlaneSnapAxis,
) {
  const partA = a
    ? getHitParts(a).find((part) => part.axes.includes(axis))
    : undefined;
  const partB = b
    ? getHitParts(b).find((part) => part.axes.includes(axis))
    : undefined;
  if (!partA || !partB) return !partA && !partB;
  return partA.index === partB.index && sameTarget(partA.target, partB.target);
}

/**
 * True while every target a hit refers to is still present at its index in
 * `targets`. Hits for removed or replaced targets are stale.
 */
export function isSnapHitCurrent(
  hit: PlaneSnapHit,
  targets: readonly PlaneSnapTarget[] | undefined,
) {
  if (!targets) return false;
  return getHitParts(hit).every(
    (part) =>
      part.index >= 0 &&
      part.index < targets.length &&
      sameTarget(targets[part.index], part.target),
  );
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

// A point fixes both axes; a line fixes the axis it is named after.
type MagneticKind = 'point' | PlaneSnapAxis;

function getMagneticKind(target: MagneticCandidate['target']): MagneticKind {
  return target.type === 'point' ? 'point' : target.axis;
}

/**
 * Picks the magnetic targets that apply: one point, or up to one line per
 * axis. Each kind has its own hysteresis: a previously held target stays held
 * until the value moves beyond the release radius. A point (held or within
 * the radius) overrides lines.
 */
function pickMagnetic(
  raw: PlaneValue,
  ctx: PlaneSnapContext,
  min: number,
  max: number,
  lockedAxis: PlaneSnapAxis | null,
): MagneticCandidate[] {
  const { boundsPx, radiusPx, targets, previous } = ctx;
  if (
    !(boundsPx.width > 0) ||
    !(boundsPx.height > 0) ||
    !(radiusPx >= 0) ||
    !Number.isFinite(radiusPx)
  ) {
    return [];
  }

  // Nearest within the radius per kind; ties keep declaration order.
  const best: Partial<Record<MagneticKind, MagneticCandidate>> = {};
  targets.forEach((target, index) => {
    if (!isUsableMagnetic(target, min, max, lockedAxis)) return;
    const distancePx = getMagneticDistancePx(target, raw, boundsPx);
    if (distancePx > radiusPx) return;
    const kind = getMagneticKind(target);
    const current = best[kind];
    if (!current || distancePx < current.distancePx) {
      best[kind] = { target, index, distancePx };
    }
  });

  const held: Partial<Record<MagneticKind, MagneticCandidate>> = {};
  for (const part of previous ? getHitParts(previous) : []) {
    if (part.index < 0 || part.index >= targets.length) continue;
    const target = targets[part.index];
    if (
      !sameTarget(target, part.target) ||
      !isUsableMagnetic(target, min, max, lockedAxis)
    ) {
      continue;
    }
    const distancePx = getMagneticDistancePx(target, raw, boundsPx);
    if (distancePx <= radiusPx * SNAP_RELEASE_FACTOR) {
      held[getMagneticKind(target)] = {
        target,
        index: part.index,
        distancePx,
      };
    }
  }

  const point = held.point ?? best.point;
  if (point) return [point];
  const lines: MagneticCandidate[] = [];
  for (const axis of ['x', 'y'] as const) {
    const line = held[axis] ?? best[axis];
    if (line) lines.push(line);
  }
  return lines;
}

function addPart(
  parts: PlaneSnapHitPart[],
  target: PlaneSnapTarget,
  index: number,
  axis: PlaneSnapAxis,
) {
  const part = parts.find((entry) => entry.index === index);
  if (part) part.axes.push(axis);
  else parts.push({ target, index, axes: [axis] });
}

function toHit(
  parts: PlaneSnapHitPart[],
  axes: PlaneSnapAxis[],
): PlaneSnapHit | null {
  if (parts.length === 0) return null;
  const [primary] = parts;
  const hit: PlaneSnapHit = {
    target: primary.target,
    index: primary.index,
    axes,
  };
  if (parts.length > 1) hit.parts = parts;
  return hit;
}

/**
 * Resolves a raw value against snap targets.
 *
 * - Custom resolvers run first, in declaration order. The first non-null
 *   result that still differs from the raw value once both are limited to
 *   the space's range wins; other results defer.
 * - Otherwise the nearest magnetic point within `radiusPx` (measured in
 *   pixels, so it is aspect-correct) fixes both axes. Without a point, the
 *   nearest line on each axis fixes that axis, so perpendicular lines
 *   combine. A held target (`previous`) releases only beyond 1.5x the radius.
 * - Grids quantize every axis no magnetic target fixed.
 * - Targets outside the space's range are ignored. The result is not
 *   clamped; callers clamp afterwards.
 *
 * `hit.target`/`hit.index` name the highest-priority target applied and
 * `hit.axes` every snapped axis. When several targets applied, `hit.parts`
 * lists each one with its own axes, in priority order.
 */
export function resolvePlaneSnap(
  raw: PlaneValue,
  ctx: PlaneSnapContext,
): PlaneSnapResult {
  const { targets, bypass } = ctx;
  if (bypass || targets.length === 0) return { value: raw, hit: null };

  const { min, max } = getSnapRange(ctx.space);
  const lockedAxis = ctx.lockedAxis ?? null;
  const freeAxes = (['x', 'y'] as const).filter((axis) => axis !== lockedAxis);
  const limit = (value: number) => Math.min(max, Math.max(min, value));

  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index];
    if (target.type !== 'custom' || typeof target.resolve !== 'function') {
      continue;
    }
    const resolved = target.resolve(raw);
    if (
      !resolved ||
      !Number.isFinite(resolved.x) ||
      !Number.isFinite(resolved.y)
    ) {
      continue;
    }
    const value = { ...raw };
    const axes: PlaneSnapAxis[] = [];
    for (const axis of freeAxes) {
      value[axis] = resolved[axis];
      if (limit(resolved[axis]) !== limit(raw[axis])) axes.push(axis);
    }
    // A result that clamps back to the raw value changes nothing: defer.
    if (axes.length === 0) continue;
    return { value, hit: { target, index, axes } };
  }

  const value = { ...raw };
  const parts: PlaneSnapHitPart[] = [];
  const fixed = new Set<PlaneSnapAxis>();

  for (const { target, index } of pickMagnetic(
    raw,
    ctx,
    min,
    max,
    lockedAxis,
  )) {
    if (target.type === 'point') {
      value.x = target.x;
      value.y = target.y;
      parts.push({ target, index, axes: ['x', 'y'] });
      fixed.add('x').add('y');
    } else {
      value[target.axis] = target.at;
      parts.push({ target, index, axes: [target.axis] });
      fixed.add(target.axis);
    }
  }

  const grid = getPlaneGridAxes(targets);
  for (const axis of freeAxes) {
    const gridAxis = grid[axis];
    if (!gridAxis || fixed.has(axis)) continue;
    const line = quantizeToGrid(raw[axis], gridAxis, min, max);
    if (line === null) continue;
    value[axis] = line;
    fixed.add(axis);
    addPart(parts, targets[gridAxis.index], gridAxis.index, axis);
  }

  const hit = toHit(
    parts,
    (['x', 'y'] as const).filter((axis) => fixed.has(axis)),
  );
  return hit ? { value, hit } : { value: raw, hit: null };
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
 * input change): reports which of `axes` (default both) rest on a grid line.
 * Magnetic targets are not considered.
 */
export function getPlaneGridHit(
  value: PlaneValue,
  targets: readonly PlaneSnapTarget[] | undefined,
  axes: readonly PlaneSnapAxis[] = ['x', 'y'],
): PlaneSnapHit | null {
  if (!targets) return null;
  const grid = getPlaneGridAxes(targets);
  const parts: PlaneSnapHitPart[] = [];
  const snapped: PlaneSnapAxis[] = [];
  for (const axis of ['x', 'y'] as const) {
    const gridAxis = grid[axis];
    if (
      !axes.includes(axis) ||
      !gridAxis ||
      !isOnGridLine(value[axis], gridAxis)
    ) {
      continue;
    }
    snapped.push(axis);
    addPart(parts, targets[gridAxis.index], gridAxis.index, axis);
  }
  return toHit(parts, snapped);
}

function partsEqual(a: PlaneSnapHitPart, b: PlaneSnapHitPart) {
  return (
    a.index === b.index &&
    sameTarget(a.target, b.target) &&
    a.axes.length === b.axes.length &&
    a.axes.every((axis, i) => axis === b.axes[i])
  );
}

/** Value-equality for hits, ignoring array identity. */
export function planeSnapHitsEqual(
  a: PlaneSnapHit | null,
  b: PlaneSnapHit | null,
) {
  if (a === b) return true;
  if (!a || !b || !partsEqual(a, b)) return false;
  const aParts = a.parts ?? [];
  const bParts = b.parts ?? [];
  return (
    aParts.length === bParts.length &&
    aParts.every((part, i) => partsEqual(part, bParts[i]))
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
