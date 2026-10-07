import { describe, expect, it } from 'vitest';
import {
  type LabelBody,
  type LabelTarget,
  labelsOverlap,
  snapLabels,
  solveLabelSlots,
  stepLabels,
} from './structure-labels.js';

const bounds = { gap: 4, maxY: 300, minY: 0 };
const label = (id: string, targetY: number, height = 20): LabelTarget => ({
  height,
  id,
  targetY,
  width: 80,
});

function run(
  bodies: LabelBody[],
  targets: LabelTarget[],
  frames: number,
  onFrame?: (bodies: LabelBody[]) => void,
) {
  let current = bodies;
  let settled = false;

  for (let frame = 0; frame < frames && !settled; frame += 1) {
    const result = stepLabels(current, targets, bounds, 1 / 60);
    current = result.bodies;
    settled = result.settled;
    onFrame?.(current);
  }

  return { bodies: current, settled };
}

describe('label slots', () => {
  it('keeps labels at their targets when there is room', () => {
    const slots = solveLabelSlots([label('a', 50), label('b', 150)], bounds);

    expect(slots.get('a')).toBe(50);
    expect(slots.get('b')).toBe(150);
  });

  it('spaces crowded labels by their heights, in target order', () => {
    const slots = solveLabelSlots(
      [label('b', 105, 30), label('a', 100), label('c', 110)],
      bounds,
    );

    expect(slots.get('a')).toBe(100);
    // (20 + 30) / 2 + 4
    expect(slots.get('b')).toBe(129);
    expect(slots.get('c')).toBe(158);
  });

  it('keeps the run inside the bounds', () => {
    const slots = solveLabelSlots(
      [label('a', 295), label('b', 296), label('c', 299)],
      bounds,
    );

    expect(slots.get('c')).toBe(290);
    expect(slots.get('b')).toBe(266);
    expect(slots.get('a')).toBe(242);
  });
});

describe('label springs', () => {
  it('trails a moved target and settles exactly on it', () => {
    const targets = [label('a', 100)];
    const start = snapLabels(targets, bounds);
    targets[0]!.targetY = 200;
    const positions: number[] = [];
    const result = run(start, targets, 600, (bodies) =>
      positions.push(bodies[0]!.y),
    );

    // Trails: not there on the first frame, there in the end.
    expect(positions[0]).toBeLessThan(150);
    expect(result.settled).toBe(true);
    expect(result.bodies[0]!.y).toBe(200);
  });

  it('lets labels trade places without ever overlapping', () => {
    const targets = [label('a', 100), label('b', 130)];
    const start = snapLabels(targets, bounds);
    // The targets swap order.
    targets[0]!.targetY = 140;
    targets[1]!.targetY = 90;
    let overlapped = false;
    let slid = false;
    const result = run(start, targets, 1200, (bodies) => {
      overlapped ||= labelsOverlap(bodies, targets);
      slid ||= bodies.some((body) => body.dx > 40);
    });

    expect(overlapped).toBe(false);
    expect(slid).toBe(true);
    expect(result.settled).toBe(true);
    const y = new Map(result.bodies.map((body) => [body.id, body.y]));
    expect(y.get('b')).toBeLessThan(y.get('a')!);
    expect(result.bodies.every((body) => body.dx === 0)).toBe(true);
  });

  it('keeps a crowd apart while it moves together', () => {
    const targets = [label('a', 60), label('b', 70), label('c', 80)];
    const start = snapLabels(targets, bounds);
    targets.forEach((target) => (target.targetY += 120));
    let overlapped = false;
    const result = run(start, targets, 900, (bodies) => {
      overlapped ||= labelsOverlap(bodies, targets);
    });

    expect(overlapped).toBe(false);
    expect(result.settled).toBe(true);
  });

  it('snaps straight to the solved slots (reduced motion)', () => {
    const targets = [label('a', 100), label('b', 102)];

    expect(snapLabels(targets, bounds)).toEqual([
      { dx: 0, id: 'a', vdx: 0, vy: 0, y: 100 },
      { dx: 0, id: 'b', vdx: 0, vy: 0, y: 124 },
    ]);
  });
});
