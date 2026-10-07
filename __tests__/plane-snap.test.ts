import { describe, expect, it, vi } from 'vitest';
import {
  resolvePlaneSnap,
  springMotion,
  type PlaneSnapContext,
  type PlaneSnapTarget,
} from '../src/plane.js';
import {
  getGridArrowChordValue,
  getGridAxisKeyValue,
  getGridAxisStep,
} from '../src/plane/keyboard.js';
import {
  getLockedAxis,
  getNextGridLine,
  getPlaneGridAxes,
  getPlaneGridHit,
  planeSnapHitsEqual,
  quantizeToGrid,
} from '../src/plane/snap.js';

function ctx(
  targets: readonly PlaneSnapTarget[],
  overrides: Partial<PlaneSnapContext> = {},
): PlaneSnapContext {
  return {
    targets,
    boundsPx: { width: 100, height: 100 },
    previous: null,
    bypass: false,
    radiusPx: 8,
    ...overrides,
  };
}

describe('resolvePlaneSnap', () => {
  it('returns the raw value without targets or when bypassed', () => {
    const raw = { x: 0.123, y: 0.456 };
    expect(resolvePlaneSnap(raw, ctx([]))).toEqual({ value: raw, hit: null });
    const grid: PlaneSnapTarget = { type: 'grid', x: 0.1, y: 0.1 };
    expect(resolvePlaneSnap(raw, ctx([grid], { bypass: true }))).toEqual({
      value: raw,
      hit: null,
    });
  });

  it('quantizes each grid axis independently and leaves omitted axes free', () => {
    const both: PlaneSnapTarget = { type: 'grid', x: 0.25, y: 0.1 };
    expect(resolvePlaneSnap({ x: 0.3, y: 0.46 }, ctx([both]))).toEqual({
      value: { x: 0.25, y: 0.5 },
      hit: { target: both, index: 0, axes: ['x', 'y'] },
    });

    const xOnly: PlaneSnapTarget = { type: 'grid', x: 0.2 };
    expect(resolvePlaneSnap({ x: 0.33, y: 0.456 }, ctx([xOnly]))).toEqual({
      value: { x: 0.4, y: 0.456 },
      hit: { target: xOnly, index: 0, axes: ['x'] },
    });
  });

  it('avoids floating point noise on grid lines', () => {
    const grid: PlaneSnapTarget = { type: 'grid', x: 0.1, y: 0.1 };
    expect(resolvePlaneSnap({ x: 0.31, y: 0.69 }, ctx([grid])).value).toEqual({
      x: 0.3,
      y: 0.7,
    });
  });

  it('offsets grid lines by origin and keeps them inside the range', () => {
    const grid: PlaneSnapTarget = {
      type: 'grid',
      x: 0.1,
      y: 0.3,
      origin: { x: 0.05, y: 0 },
    };
    expect(resolvePlaneSnap({ x: 0.12, y: 0.98 }, ctx([grid])).value).toEqual({
      x: 0.15,
      y: 0.9,
    });
    // 0.01 rounds to origin 0.05; 0.999 rounds to 1.05 then steps inward.
    expect(resolvePlaneSnap({ x: 0.01, y: 0 }, ctx([grid])).value.x).toBe(0.05);
    expect(resolvePlaneSnap({ x: 0.999, y: 0 }, ctx([grid])).value.x).toBe(
      0.95,
    );
  });

  it('ignores invalid grid sizes', () => {
    const grid = { type: 'grid', x: 0, y: -1 } as const;
    expect(resolvePlaneSnap({ x: 0.33, y: 0.33 }, ctx([grid]))).toEqual({
      value: { x: 0.33, y: 0.33 },
      hit: null,
    });
  });

  it('snaps magnetically to lines within the radius only', () => {
    const vertical: PlaneSnapTarget = { type: 'line', axis: 'x', at: 0.5 };
    const horizontal: PlaneSnapTarget = { type: 'line', axis: 'y', at: 0.25 };
    const targets = [vertical, horizontal];
    expect(resolvePlaneSnap({ x: 0.55, y: 0.8 }, ctx(targets))).toEqual({
      value: { x: 0.5, y: 0.8 },
      hit: { target: vertical, index: 0, axes: ['x'] },
    });
    expect(resolvePlaneSnap({ x: 0.1, y: 0.3 }, ctx(targets))).toEqual({
      value: { x: 0.1, y: 0.25 },
      hit: { target: horizontal, index: 1, axes: ['y'] },
    });
    expect(resolvePlaneSnap({ x: 0.6, y: 0.8 }, ctx(targets)).hit).toBeNull();
  });

  it('snaps to points within a pixel radius', () => {
    const point: PlaneSnapTarget = { type: 'point', x: 0.5, y: 0.5, id: 'c' };
    expect(resolvePlaneSnap({ x: 0.55, y: 0.55 }, ctx([point]))).toEqual({
      value: { x: 0.5, y: 0.5 },
      hit: { target: point, index: 0, axes: ['x', 'y'] },
    });
    // hypot(6, 6) px ≈ 8.49 > 8.
    expect(resolvePlaneSnap({ x: 0.56, y: 0.56 }, ctx([point])).hit).toBeNull();
  });

  it('converts the radius per axis on non-square bounds', () => {
    const vertical: PlaneSnapTarget = { type: 'line', axis: 'x', at: 0.5 };
    const horizontal: PlaneSnapTarget = { type: 'line', axis: 'y', at: 0.5 };
    const wide = { boundsPx: { width: 400, height: 100 } };
    // 0.03 of 400px = 12px: outside the radius horizontally.
    expect(
      resolvePlaneSnap({ x: 0.53, y: 0.9 }, ctx([vertical], wide)).hit,
    ).toBeNull();
    // 0.015 of 400px = 6px: inside.
    expect(
      resolvePlaneSnap({ x: 0.515, y: 0.9 }, ctx([vertical], wide)).value.x,
    ).toBe(0.5);
    // 0.07 of 100px = 7px: inside vertically.
    expect(
      resolvePlaneSnap({ x: 0.1, y: 0.57 }, ctx([horizontal], wide)).value.y,
    ).toBe(0.5);
  });

  it('disables magnetic targets when bounds are unmeasured', () => {
    const point: PlaneSnapTarget = { type: 'point', x: 0.5, y: 0.5 };
    const result = resolvePlaneSnap(
      { x: 0.5001, y: 0.5 },
      ctx([point], { boundsPx: { width: 0, height: 0 } }),
    );
    expect(result.hit).toBeNull();
  });

  it('prefers points over lines over grid, and fills free axes from the grid', () => {
    const grid: PlaneSnapTarget = { type: 'grid', x: 0.1, y: 0.1 };
    const line: PlaneSnapTarget = { type: 'line', axis: 'x', at: 0.52 };
    const point: PlaneSnapTarget = { type: 'point', x: 0.54, y: 0.54 };
    const targets = [grid, line, point];

    expect(resolvePlaneSnap({ x: 0.53, y: 0.53 }, ctx(targets))).toEqual({
      value: { x: 0.54, y: 0.54 },
      hit: { target: point, index: 2, axes: ['x', 'y'] },
    });
    // Far from the point: the line fixes x, the grid quantizes y.
    expect(resolvePlaneSnap({ x: 0.53, y: 0.23 }, ctx(targets))).toEqual({
      value: { x: 0.52, y: 0.2 },
      hit: {
        target: line,
        index: 1,
        axes: ['x', 'y'],
        parts: [
          { target: line, index: 1, axes: ['x'] },
          { target: grid, index: 0, axes: ['y'] },
        ],
      },
    });
    // Away from magnetic targets: grid only.
    expect(resolvePlaneSnap({ x: 0.83, y: 0.23 }, ctx(targets))).toEqual({
      value: { x: 0.8, y: 0.2 },
      hit: { target: grid, index: 0, axes: ['x', 'y'] },
    });
  });

  it('picks the nearest target of the same kind, then declaration order', () => {
    const a: PlaneSnapTarget = { type: 'point', x: 0.5, y: 0.5, id: 'a' };
    const b: PlaneSnapTarget = { type: 'point', x: 0.56, y: 0.5, id: 'b' };
    expect(resolvePlaneSnap({ x: 0.54, y: 0.5 }, ctx([a, b])).hit?.index).toBe(
      1,
    );
    // Equidistant: the first declared wins.
    expect(resolvePlaneSnap({ x: 0.53, y: 0.5 }, ctx([a, b])).hit?.index).toBe(
      0,
    );
    expect(resolvePlaneSnap({ x: 0.53, y: 0.5 }, ctx([b, a])).hit?.index).toBe(
      0,
    );
  });

  it('ignores targets outside the space range', () => {
    const targets: PlaneSnapTarget[] = [
      { type: 'point', x: 1.02, y: 0.5 },
      { type: 'line', axis: 'x', at: -0.02 },
      { type: 'point', x: -0.5, y: 0 },
    ];
    expect(resolvePlaneSnap({ x: 0.99, y: 0.5 }, ctx(targets)).hit).toBeNull();
    expect(resolvePlaneSnap({ x: 0.01, y: 0.5 }, ctx(targets)).hit).toBeNull();
    // In local space [-1, 1] the negative point is valid.
    expect(
      resolvePlaneSnap({ x: -0.49, y: 0 }, ctx(targets, { space: 'local' }))
        .value,
    ).toEqual({ x: -0.5, y: 0 });
  });

  it('quantizes negative local-space values with grid lines in [-1, 1]', () => {
    const grid: PlaneSnapTarget = { type: 'grid', x: 0.25, y: 0.25 };
    expect(
      resolvePlaneSnap({ x: -0.6, y: -0.99 }, ctx([grid], { space: 'local' }))
        .value,
    ).toEqual({ x: -0.5, y: -1 });
  });

  it('holds a magnetic target until 1.5x the radius (hysteresis)', () => {
    const point: PlaneSnapTarget = { type: 'point', x: 0.5, y: 0.5 };
    const first = resolvePlaneSnap({ x: 0.55, y: 0.5 }, ctx([point]));
    expect(first.hit).not.toBeNull();
    // 10px away: outside the 8px radius but inside the 12px release radius.
    const held = resolvePlaneSnap(
      { x: 0.6, y: 0.5 },
      ctx([point], { previous: first.hit }),
    );
    expect(held.value).toEqual({ x: 0.5, y: 0.5 });
    // Without a previous hit it does not engage.
    expect(resolvePlaneSnap({ x: 0.6, y: 0.5 }, ctx([point])).hit).toBeNull();
    // 13px: released.
    expect(
      resolvePlaneSnap(
        { x: 0.63, y: 0.5 },
        ctx([point], { previous: held.hit }),
      ).hit,
    ).toBeNull();
  });

  it('keeps a held target over a nearer one of equal priority, but yields to higher priority', () => {
    const a: PlaneSnapTarget = { type: 'point', x: 0.5, y: 0.5 };
    const b: PlaneSnapTarget = { type: 'point', x: 0.6, y: 0.5 };
    const previous = { target: a, index: 0, axes: ['x', 'y'] as const };
    expect(
      resolvePlaneSnap(
        { x: 0.54, y: 0.5 },
        ctx([a, b], {
          radiusPx: 7,
          previous: { ...previous, axes: [...previous.axes] },
        }),
      ).hit?.index,
    ).toBe(0);

    const line: PlaneSnapTarget = { type: 'line', axis: 'x', at: 0.5 };
    const point: PlaneSnapTarget = { type: 'point', x: 0.5, y: 0.57 };
    const lineHit = resolvePlaneSnap(
      { x: 0.51, y: 0.4 },
      ctx([line, point]),
    ).hit;
    expect(lineHit?.index).toBe(0);
    expect(
      resolvePlaneSnap(
        { x: 0.51, y: 0.52 },
        ctx([line, point], { previous: lineHit }),
      ).hit?.index,
    ).toBe(1);
  });

  it('matches previous hits structurally when targets are recreated', () => {
    const previous = {
      target: { type: 'point', x: 0.5, y: 0.5 } as const,
      index: 0,
      axes: ['x', 'y'] as ('x' | 'y')[],
    };
    const recreated: PlaneSnapTarget[] = [{ type: 'point', x: 0.5, y: 0.5 }];
    expect(
      resolvePlaneSnap({ x: 0.6, y: 0.5 }, ctx(recreated, { previous })).hit,
    ).not.toBeNull();
    const moved: PlaneSnapTarget[] = [{ type: 'point', x: 0.52, y: 0.5 }];
    expect(
      resolvePlaneSnap({ x: 0.62, y: 0.5 }, ctx(moved, { previous })).hit,
    ).toBeNull();
  });

  it('runs custom resolvers first and lets null defer', () => {
    const resolve = vi.fn((value: { x: number; y: number }) =>
      value.x > 0.5 ? { x: 1, y: value.y } : null,
    );
    const custom: PlaneSnapTarget = { type: 'custom', resolve };
    const point: PlaneSnapTarget = { type: 'point', x: 0.6, y: 0.5 };
    expect(resolvePlaneSnap({ x: 0.61, y: 0.5 }, ctx([point, custom]))).toEqual(
      {
        value: { x: 1, y: 0.5 },
        hit: { target: custom, index: 1, axes: ['x'] },
      },
    );
    expect(resolvePlaneSnap({ x: 0.2, y: 0.5 }, ctx([custom])).hit).toBeNull();
    expect(resolve).toHaveBeenCalledWith({ x: 0.2, y: 0.5 });
    const broken: PlaneSnapTarget = {
      type: 'custom',
      resolve: () => ({ x: Number.NaN, y: 0 }),
    };
    expect(resolvePlaneSnap({ x: 0.2, y: 0.5 }, ctx([broken])).hit).toBeNull();
  });

  it('defers custom results that clamp back to the raw value', () => {
    const outside: PlaneSnapTarget = {
      type: 'custom',
      resolve: (value) => ({ x: 1.5, y: value.y }),
    };
    const point: PlaneSnapTarget = { type: 'point', x: 1, y: 0.5 };
    // Raw x is already past the edge, so x = 1.5 changes nothing once
    // clamped; the point gets its turn.
    expect(
      resolvePlaneSnap({ x: 1.02, y: 0.5 }, ctx([outside, point])),
    ).toEqual({
      value: { x: 1, y: 0.5 },
      hit: { target: point, index: 1, axes: ['x', 'y'] },
    });
    expect(resolvePlaneSnap({ x: 1.2, y: 0.5 }, ctx([outside])).hit).toBeNull();
    // Inside the range it still applies (clamping happens later).
    expect(resolvePlaneSnap({ x: 0.9, y: 0.5 }, ctx([outside]))).toEqual({
      value: { x: 1.5, y: 0.5 },
      hit: { target: outside, index: 0, axes: ['x'] },
    });
  });

  it('combines perpendicular lines with per-axis hysteresis', () => {
    const vertical: PlaneSnapTarget = { type: 'line', axis: 'x', at: 0.5 };
    const horizontal: PlaneSnapTarget = { type: 'line', axis: 'y', at: 0.5 };
    const targets = [vertical, horizontal];
    const both = resolvePlaneSnap({ x: 0.51, y: 0.49 }, ctx(targets));
    expect(both).toEqual({
      value: { x: 0.5, y: 0.5 },
      hit: {
        target: vertical,
        index: 0,
        axes: ['x', 'y'],
        parts: [
          { target: vertical, index: 0, axes: ['x'] },
          { target: horizontal, index: 1, axes: ['y'] },
        ],
      },
    });
    // 10px from both: outside the radius, but both are held.
    expect(
      resolvePlaneSnap({ x: 0.6, y: 0.4 }, ctx(targets, { previous: both.hit }))
        .value,
    ).toEqual({ x: 0.5, y: 0.5 });
    // 13px on x releases only x.
    const released = resolvePlaneSnap(
      { x: 0.63, y: 0.4 },
      ctx(targets, { previous: both.hit }),
    );
    expect(released.value.x).toBeCloseTo(0.63);
    expect(released.value.y).toBe(0.5);
    expect(released.hit).toEqual({
      target: horizontal,
      index: 1,
      axes: ['y'],
    });
    // A point near the intersection overrides both lines.
    const point: PlaneSnapTarget = { type: 'point', x: 0.52, y: 0.52 };
    expect(
      resolvePlaneSnap(
        { x: 0.53, y: 0.53 },
        ctx([...targets, point], { previous: both.hit }),
      ).hit,
    ).toEqual({ target: point, index: 2, axes: ['x', 'y'] });
  });

  it('does not clamp; callers clamp afterwards', () => {
    const line: PlaneSnapTarget = { type: 'line', axis: 'y', at: 0.5 };
    expect(resolvePlaneSnap({ x: 1.4, y: 0.52 }, ctx([line])).value).toEqual({
      x: 1.4,
      y: 0.5,
    });
    // Grids pick the nearest in-range line for out-of-range values.
    const grid: PlaneSnapTarget = { type: 'grid', x: 0.3, y: 0.25 };
    expect(resolvePlaneSnap({ x: 1.4, y: -0.3 }, ctx([grid])).value).toEqual({
      x: 0.9,
      y: 0,
    });
  });

  it('never snaps a locked axis', () => {
    const grid: PlaneSnapTarget = { type: 'grid', x: 0.1, y: 0.1 };
    const point: PlaneSnapTarget = { type: 'point', x: 0.5, y: 0.5 };
    const horizontal: PlaneSnapTarget = { type: 'line', axis: 'y', at: 0.5 };
    const result = resolvePlaneSnap(
      { x: 0.51, y: 0.503 },
      ctx([grid, point, horizontal], { lockedAxis: 'y' }),
    );
    expect(result).toEqual({
      value: { x: 0.5, y: 0.503 },
      hit: { target: grid, index: 0, axes: ['x'] },
    });
    const custom: PlaneSnapTarget = {
      type: 'custom',
      resolve: () => ({ x: 0, y: 0 }),
    };
    expect(
      resolvePlaneSnap({ x: 0.3, y: 0.7 }, ctx([custom], { lockedAxis: 'x' })),
    ).toEqual({
      value: { x: 0.3, y: 0 },
      hit: { target: custom, index: 0, axes: ['y'] },
    });
  });
});

describe('snap helpers', () => {
  it('collects the first grid per axis', () => {
    const a: PlaneSnapTarget = { type: 'grid', x: 0.1 };
    const b: PlaneSnapTarget = {
      type: 'grid',
      x: 0.5,
      y: 0.2,
      origin: { x: 0, y: 0.1 },
    };
    expect(getPlaneGridAxes([a, b])).toEqual({
      x: { size: 0.1, origin: 0, index: 0 },
      y: { size: 0.2, origin: 0.1, index: 1 },
    });
    expect(getPlaneGridAxes(undefined)).toEqual({});
  });

  it('finds grid lines', () => {
    const grid = { size: 0.25, origin: 0 };
    expect(quantizeToGrid(0.4, grid, 0, 1)).toBe(0.5);
    expect(quantizeToGrid(Number.NaN, grid, 0, 1)).toBeNull();
    expect(quantizeToGrid(0.5, { size: 5, origin: 0.5 }, 0, 1)).toBe(0.5);
    expect(quantizeToGrid(0.5, { size: 5, origin: 3 }, 0, 1)).toBeNull();
    expect(getNextGridLine(0.5, 1, grid, 0, 1)).toBe(0.75);
    expect(getNextGridLine(0.5, -1, grid, 0, 1)).toBe(0.25);
    expect(getNextGridLine(0.6, 1, grid, 0, 1)).toBe(0.75);
    expect(getNextGridLine(0.6, -1, grid, 0, 1)).toBe(0.5);
    expect(getNextGridLine(1, 1, grid, 0, 1)).toBeNull();
    expect(
      getNextGridLine(0.3 + 1e-12, -1, { size: 0.1, origin: 0 }, 0, 1),
    ).toBe(0.2);
  });

  it('reports grid hits for non-pointer values', () => {
    const grid: PlaneSnapTarget = { type: 'grid', x: 0.1, y: 0.25 };
    expect(getPlaneGridHit({ x: 0.3, y: 0.5 }, [grid])).toEqual({
      target: grid,
      index: 0,
      axes: ['x', 'y'],
    });
    expect(getPlaneGridHit({ x: 0.33, y: 0.5 }, [grid])?.axes).toEqual(['y']);
    expect(getPlaneGridHit({ x: 0.33, y: 0.6 }, [grid])).toBeNull();
  });

  it('compares hits by value', () => {
    const a = {
      target: { type: 'line', axis: 'x', at: 0.5 } as const,
      index: 1,
    };
    expect(
      planeSnapHitsEqual(
        { ...a, axes: ['x'] },
        { ...a, target: { ...a.target }, axes: ['x'] },
      ),
    ).toBe(true);
    expect(
      planeSnapHitsEqual({ ...a, axes: ['x'] }, { ...a, axes: ['x', 'y'] }),
    ).toBe(false);
    expect(planeSnapHitsEqual(null, null)).toBe(true);
    expect(planeSnapHitsEqual({ ...a, axes: ['x'] }, null)).toBe(false);
  });

  it('locks axes', () => {
    const bounds = { width: 400, height: 100 };
    const start = { x: 0.5, y: 0.5 };
    expect(getLockedAxis('x', { x: 0, y: 0 }, start, bounds, false)).toBe('y');
    expect(getLockedAxis('y', { x: 0, y: 0 }, start, bounds, false)).toBe('x');
    expect(getLockedAxis(undefined, { x: 0, y: 0 }, start, bounds, true)).toBe(
      null,
    );
    expect(
      getLockedAxis(
        'dominant-with-shift',
        { x: 0.6, y: 0.9 },
        start,
        bounds,
        false,
      ),
    ).toBe(null);
    // 0.1 * 400 = 40px of x travel beats 0.3 * 100 = 30px of y travel.
    expect(
      getLockedAxis(
        'dominant-with-shift',
        { x: 0.6, y: 0.8 },
        start,
        bounds,
        true,
      ),
    ).toBe('y');
    expect(
      getLockedAxis(
        'dominant-with-shift',
        { x: 0.55, y: 0.8 },
        start,
        bounds,
        true,
      ),
    ).toBe('x');
  });
});

describe('keyboard grid stepping', () => {
  const grid = { size: 0.25, origin: 0 };

  it('moves to the next grid line rather than adding a step', () => {
    expect(getGridAxisStep(0.5, 1, false, grid, 0.1, 0)).toBe(0.75);
    expect(getGridAxisStep(0.6, 1, false, grid, 0.1, 0)).toBe(0.75);
    expect(getGridAxisStep(0.6, -1, false, grid, 0.1, 0)).toBe(0.5);
    expect(getGridAxisStep(1, 1, false, grid, 0.1, 0)).toBe(1);
    // Past the last line of a grid that does not divide the range, step to
    // the bound.
    const third = { size: 0.3, origin: 0 };
    expect(getGridAxisStep(0.9, 1, false, third, 0.1, 0)).toBe(1);
    expect(getGridAxisStep(0.95, 1, true, third, 0.1, 0)).toBe(1);
    expect(
      getGridAxisStep(0.05, -1, false, { size: 0.3, origin: 0.1 }, 0.1, 0),
    ).toBe(0);
    expect(getGridAxisStep(-1, -1, false, grid, 0.1, -1)).toBe(-1);
  });

  it('takes a large step rounded to the grid, at least one line', () => {
    const fine = { size: 0.05, origin: 0 };
    expect(getGridAxisStep(0.5, 1, true, fine, 0.2, 0)).toBe(0.7);
    expect(getGridAxisStep(0.5, -1, true, fine, 0.2, 0)).toBe(0.3);
    // largeStep smaller than the grid still moves one line.
    expect(getGridAxisStep(0.5, 1, true, grid, 0.1, 0)).toBe(0.75);
    // Large steps past the edge stop at the last line.
    expect(getGridAxisStep(0.9, 1, true, fine, 0.2, 0)).toBe(1);
  });

  it('steps chords per axis and ignores the grid with Alt', () => {
    const axes = { x: { ...grid, index: 0 } };
    const steps = { smallStep: 0.001, step: 0.01, largeStep: 0.1 };
    const keys = new Set(['ArrowRight', 'ArrowUp'] as const);
    expect(
      getGridArrowChordValue(
        { x: 0.5, y: 0.5 },
        keys,
        steps,
        { alt: false, shift: false },
        axes,
        0,
      ),
    ).toEqual({ x: 0.75, y: 0.51 });
    expect(
      getGridArrowChordValue(
        { x: 0.5, y: 0.5 },
        keys,
        steps,
        { alt: true, shift: false },
        axes,
        0,
      ),
    ).toEqual({ x: 0.501, y: 0.501 });
  });

  it('maps Home, End, and Page keys onto the grid', () => {
    const axes = { x: { size: 0.3, origin: 0, index: 0 } };
    const value = { x: 0.3, y: 0.5 };
    expect(getGridAxisKeyValue('x', 'End', value, 0.1, axes, 0)).toEqual({
      x: 0.9,
      y: 0.5,
    });
    expect(getGridAxisKeyValue('x', 'Home', value, 0.1, axes, 0)).toEqual({
      x: 0,
      y: 0.5,
    });
    expect(getGridAxisKeyValue('x', 'PageUp', value, 0.1, axes, 0)).toEqual({
      x: 0.6,
      y: 0.5,
    });
    expect(getGridAxisKeyValue('x', 'PageDown', value, 0.1, axes, 0)).toEqual({
      x: 0,
      y: 0.5,
    });
    // Home/End never move away from their bound.
    expect(
      getGridAxisKeyValue('x', 'End', { x: 0.95, y: 0.5 }, 0.1, axes, 0),
    ).toEqual({ x: 1, y: 0.5 });
    expect(
      getGridAxisKeyValue('x', 'End', { x: 0.9, y: 0.5 }, 0.1, axes, 0),
    ).toEqual({ x: 1, y: 0.5 });
    expect(getGridAxisKeyValue('y', 'End', value, 0.1, axes, 0)).toBeNull();
    expect(getGridAxisKeyValue('x', 'Tab', value, 0.1, axes, 0)).toBeNull();
  });
});

describe('springMotion', () => {
  it('converges on the target and reports done', () => {
    const motion = springMotion({ stiffness: 400, damping: 40 });
    let value = { x: 0, y: 0 };
    const target = { x: 1, y: 0.5 };
    let done = false;
    let frames = 0;
    while (!done && frames < 600) {
      const result = motion.step(value, target, 16, { reason: 'snap' });
      value = result.value;
      done = result.done;
      frames += 1;
    }
    expect(done).toBe(true);
    expect(value).toBe(target);
    expect(frames).toBeGreaterThan(3);
  });

  it('tracks velocity per presented value', () => {
    const motion = springMotion();
    const target = { x: 1, y: 0 };
    const first = motion.step({ x: 0, y: 0 }, target, 16, {
      reason: 'snap',
    }).value;
    const second = motion.step(first, target, 16, { reason: 'snap' }).value;
    // A fresh value with the same coordinates starts at rest, so it moves
    // less than one that carries velocity.
    const fresh = motion.step({ ...first }, target, 16, {
      reason: 'snap',
    }).value;
    expect(second.x - first.x).toBeGreaterThan(fresh.x - first.x);
  });

  it('keeps momentum when a new instance with the same options takes over', () => {
    const target = { x: 1, y: 0 };
    const info = { reason: 'snap' as const };
    const first = springMotion().step({ x: 0, y: 0 }, target, 16, info).value;
    const continued = springMotion().step(first, target, 16, info).value;
    const same = springMotion();
    const reference = same.step(
      same.step({ x: 0, y: 0 }, target, 16, info).value,
      target,
      16,
      info,
    ).value;
    expect(continued).toEqual(reference);
  });

  it('opts into drag smoothing only when asked', () => {
    expect(springMotion().smoothDrag).toBe(false);
    expect(springMotion({ smoothDrag: true }).smoothDrag).toBe(true);
  });

  it('settles instantly under prefers-reduced-motion', () => {
    const matchMedia = vi.fn(() => ({ matches: true }));
    vi.stubGlobal('matchMedia', matchMedia);
    try {
      const target = { x: 1, y: 1 };
      expect(
        springMotion().step({ x: 0, y: 0 }, target, 16, { reason: 'snap' }),
      ).toEqual({
        value: target,
        done: true,
      });
      expect(matchMedia).toHaveBeenCalledWith(
        '(prefers-reduced-motion: reduce)',
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
