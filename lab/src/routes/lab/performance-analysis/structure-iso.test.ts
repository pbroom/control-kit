import { describe, expect, it } from 'vitest';
import {
  buildStructureFigure,
  fitStructureCamera,
  hull,
  project,
  roundedRing,
  STRUCTURE_CAMERA_AZIMUTH,
  STRUCTURE_CAMERA_K,
  structureMaxGap,
} from './structure-iso.js';
import type {
  StructureMeasurement,
  StructureSlab,
} from './structure-measure.js';

function slab(overrides: Partial<StructureSlab>): StructureSlab {
  return {
    focused: false,
    ghost: false,
    height: 24,
    key: 'root:0',
    level: 0,
    marks: [],
    nodeId: 'root',
    painted: true,
    parentKey: null,
    portal: false,
    radius: 4,
    width: 128,
    x: 0,
    y: 0,
    ...overrides,
  };
}

const measurement: StructureMeasurement = {
  fitLevels: 2,
  height: 24,
  levels: 2,
  signature: '',
  slabs: [
    slab({}),
    slab({
      height: 22,
      key: 'input:0',
      level: 1,
      marks: [{ kind: 'text', rect: { height: 5, width: 12, x: 30, y: 8 } }],
      nodeId: 'input',
      parentKey: 'root:0',
      radius: 0,
      width: 102,
      x: 25,
      y: 1,
    }),
  ],
  width: 128,
};
const region = { x0: 0, x1: 400, y0: 0, y1: 300 };

describe('structure isometric projection', () => {
  it('projects the ground plane at a 2:1 isometric angle', () => {
    const camera = {
      az: STRUCTURE_CAMERA_AZIMUTH,
      k: STRUCTURE_CAMERA_K,
      ox: 0,
      oy: 0,
      scale: 1,
    };
    const [x, y] = project(camera, 10, 0, 0);

    expect(y / x).toBeCloseTo(0.5);
    // z goes straight up the screen.
    const [zx, zy] = project(camera, 0, 0, 10);
    expect(zx).toBeCloseTo(0);
    expect(zy).toBeLessThan(0);
  });

  it('samples rounded rectangles and clamps the radius', () => {
    const ring = roundedRing(0, 0, 10, 4, 20, 3);

    expect(ring).toHaveLength(16);
    expect(Math.max(...ring.map((sample) => sample.v))).toBeCloseTo(4);
    expect(hull(ring.map((sample) => [sample.u, sample.v]))).not.toHaveLength(
      0,
    );
  });

  it('stacks levels by the explode gap and keeps the fit stable', () => {
    const camera = fitStructureCamera(measurement, region);
    const closed = buildStructureFigure(measurement, 0, camera);
    const open = buildStructureFigure(measurement, 1, camera);

    expect(closed.gap).toBe(0);
    expect(open.gap).toBeCloseTo(structureMaxGap(measurement));
    // Base slab does not move as the gap opens; the upper one rises.
    expect(open.slabs[0]!.top).toBe(closed.slabs[0]!.top);
    expect(open.slabs[1]!.anchor[1]).toBeLessThan(closed.slabs[1]!.anchor[1]);
    expect(open.slabs[1]!.guide).not.toBe('');
    expect(open.slabs[1]!.text).toMatch(/^M.*Z$/);
    expect(open.bounds.maxX).toBeLessThanOrEqual(region.x1 + 0.01);
  });

  it('frames from the root only, so other parts never refit the figure', () => {
    const camera = fitStructureCamera(measurement, region);
    // A thumb-like part moves and a popup appears, far outside the root.
    const moved: StructureMeasurement = {
      ...measurement,
      levels: 3,
      slabs: [
        measurement.slabs[0]!,
        { ...measurement.slabs[1]!, x: 80, y: -40 },
        slab({
          height: 170,
          key: 'popup:0',
          level: 2,
          nodeId: 'popup',
          width: 208,
          x: 0,
          y: 30,
        }),
      ],
    };

    expect(fitStructureCamera(moved, region)).toEqual(camera);
    expect(buildStructureFigure(moved, 0.75, camera).slabs[0]!.top).toBe(
      buildStructureFigure(measurement, 0.75, camera).slabs[0]!.top,
    );
  });
});
