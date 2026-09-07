import { describe, expect, it } from 'vitest';
import {
  advanceGravitySimulation,
  createGravitySimulation,
  GRAVITY_BALL_COUNT,
  isBallContained,
} from './gravity-vector.js';

describe('gravity-vector physics', () => {
  it('spawns sixteen separated balls inside the hexagon', () => {
    const simulation = createGravitySimulation();

    expect(simulation.balls).toHaveLength(GRAVITY_BALL_COUNT);
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

  it('preserves all ball identities while gravity changes', () => {
    const simulation = createGravitySimulation();
    const balls = [...simulation.balls];

    advanceGravitySimulation(simulation, { x: 0, y: 0 }, 1 / 60);
    advanceGravitySimulation(simulation, { x: 1, y: 0 }, 1 / 60);
    advanceGravitySimulation(simulation, { x: 0, y: -1 }, 1 / 60);

    expect(simulation.balls).toHaveLength(GRAVITY_BALL_COUNT);
    simulation.balls.forEach((ball, index) => {
      expect(ball).toBe(balls[index]);
    });
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
    const simulation = createGravitySimulation();

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
    const simulation = createGravitySimulation();
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
    expect(simulation.balls).toHaveLength(GRAVITY_BALL_COUNT);
  });
});
