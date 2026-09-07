import { describe, expect, it } from 'vitest';
import {
  applyToneTables,
  createToneTable,
  sourceHistograms,
} from './examples/plane-examples/color-curves';

const identity = [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
];

describe('photo tone curves', () => {
  it('preserves every source byte with the default curve, including alpha', () => {
    const table = createToneTable(identity);
    const source = new Uint8ClampedArray(
      Array.from({ length: 1024 }, (_, i) => i % 256),
    );
    const output = new Uint8ClampedArray(source.length);
    applyToneTables(source, output, {
      RGB: table,
      Red: table,
      Green: table,
      Blue: table,
    });
    expect(output).toEqual(source);
  });

  it('applies master and channel curves to actual pixels without changing alpha', () => {
    const linear = createToneTable(identity);
    const brighter = createToneTable([
      identity[0],
      { x: 0.5, y: 0.8 },
      identity[1],
    ]);
    const source = new Uint8ClampedArray([128, 128, 128, 73]);
    const output = new Uint8ClampedArray(4);
    applyToneTables(source, output, {
      RGB: brighter,
      Red: linear,
      Green: linear,
      Blue: linear,
    });
    expect(Array.from(output)).toEqual([204, 204, 204, 73]);
    applyToneTables(source, output, {
      RGB: linear,
      Red: brighter,
      Green: linear,
      Blue: linear,
    });
    expect(Array.from(output)).toEqual([204, 128, 128, 73]);
  });

  it('keeps smooth curves bounded between neighboring points and extends movable endpoints', () => {
    const points = [
      { x: 0.15, y: 0.2 },
      { x: 0.3, y: 0.8 },
      { x: 0.7, y: 0.4 },
      { x: 0.8, y: 0.9 },
    ];
    const table = createToneTable(points);
    expect(table[0]).toBe(0.2);
    expect(table[255]).toBe(0.9);
    for (let i = 0; i < table.length; i++) {
      const right = points.findIndex((point) => point.x >= i / 255);
      if (right <= 0) continue;
      expect(table[i]).toBeGreaterThanOrEqual(
        Math.min(points[right - 1].y, points[right].y),
      );
      expect(table[i]).toBeLessThanOrEqual(
        Math.max(points[right - 1].y, points[right].y),
      );
    }
  });

  it('bins the source channels at their real input values', () => {
    const histogram = sourceHistograms(
      new Uint8ClampedArray([10, 20, 30, 255, 10, 25, 30, 255, 0, 0, 0, 0]),
    );
    expect(histogram.Red[10]).toBe(2);
    expect(histogram.Green[20]).toBe(1);
    expect(histogram.Green[25]).toBe(1);
    expect(histogram.Blue[30]).toBe(2);
    expect(histogram.RGB.reduce((sum, count) => sum + count)).toBe(6);
    expect(histogram.RGB[0]).toBe(0);
  });
});
