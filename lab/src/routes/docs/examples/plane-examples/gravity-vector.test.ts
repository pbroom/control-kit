import { describe, expect, it } from 'vitest';
import {
  advanceGravitySimulation,
  createGravitySimulation,
  getBallCount,
  isBallContained,
  reconcileBallCount,
} from './gravity-vector.js';

describe('gravity-vector physics', () => {
  it('maps the Plane radius monotonically from one to eight balls', () => {
    const counts = Array.from({ length: 101 }, (_, index) =>
      getBallCount(index / 100),
    );

    expect(counts[0]).toBe(1);
    expect(counts.at(-1)).toBe(8);
    expect(
      counts.every((count, index) => index === 0 || count >= counts[index - 1]),
    ).toBe(true);
    expect(new Set(counts)).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8]));
  });

  it('spawns eight separated balls inside the hexagon', () => {
    const simulation = createGravitySimulation(8);

    expect(simulation.balls).toHaveLength(8);
    simulation.balls.forEach((ball) => {
      expect(isBallContained(ball, simulation.angle)).toBe(true);
    });
    for (let first = 0; first < simulation.balls.length; first += 1) {
      for (
        let second = first + 1;
        second < simulation.balls.length;
        second += 1
      ) {
        expect(
          Math.hypot(
            simulation.balls[first].x - simulation.balls[second].x,
            simulation.balls[first].y - simulation.balls[second].y,
          ),
        ).toBeGreaterThanOrEqual(18);
      }
    }
  });

  it('preserves existing balls while the count changes', () => {
    const simulation = createGravitySimulation(3);
    for (let frame = 0; frame < 60; frame += 1) {
      advanceGravitySimulation(simulation, { x: 0.5, y: -0.7 }, 1 / 60);
    }
    const existing = simulation.balls.map((ball) => ({ ...ball }));

    const expanded = reconcileBallCount(simulation.balls, 8, simulation.angle);
    expect(expanded.slice(0, 3)).toEqual(existing);
    expect(expanded).toHaveLength(8);

    const contracted = reconcileBallCount(expanded, 1, simulation.angle);
    expect(contracted).toEqual(existing.slice(0, 1));
  });

  it.each([
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: 0.707, y: 0.707 },
    { x: -0.707, y: 0.707 },
    { x: 0.707, y: -0.707 },
    { x: -0.707, y: -0.707 },
    { x: 0, y: 0 },
  ])('keeps every ball finite and contained with gravity $x, $y', (gravity) => {
    const simulation = createGravitySimulation(8);

    for (let frame = 0; frame < 1_200; frame += 1) {
      const elapsed = frame % 173 === 0 ? 1.5 : 1 / 60;
      advanceGravitySimulation(simulation, gravity, elapsed);
      simulation.balls.forEach((ball) => {
        expect([ball.x, ball.y, ball.vx, ball.vy].every(Number.isFinite)).toBe(
          true,
        );
        expect(isBallContained(ball, simulation.angle)).toBe(true);
      });
    }
  });

  it('recovers invalid state without allowing a ball to escape', () => {
    const simulation = createGravitySimulation(2);
    simulation.balls[0].x = Number.NaN;
    simulation.balls[0].vy = Number.POSITIVE_INFINITY;

    advanceGravitySimulation(simulation, { x: 0, y: -1 }, 1 / 30);

    expect(
      simulation.balls.every((ball) =>
        [ball.x, ball.y, ball.vx, ball.vy].every(Number.isFinite),
      ),
    ).toBe(true);
    expect(
      simulation.balls.every((ball) => isBallContained(ball, simulation.angle)),
    ).toBe(true);
  });
});
