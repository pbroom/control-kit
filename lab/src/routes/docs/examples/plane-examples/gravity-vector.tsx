import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from 'control-kit';

const WORLD_SIZE = 300;
const HEX_RADIUS = 124;
const BALL_RADIUS = 9;
const FIXED_STEP = 1 / 120;
const MAX_FRAME_TIME = 0.05;
const MAX_SUBSTEPS = 8;
const WALL_ANGULAR_VELOCITY = 0.28;
const GRAVITY_ACCELERATION = 520;
const WALL_RESTITUTION = 0.84;
const BALL_RESTITUTION = 0.92;
const TAU = Math.PI * 2;
const BALL_COLORS = [
  '#e0e7ff',
  '#c7d2fe',
  '#a5b4fc',
  '#818cf8',
  '#a78bfa',
  '#c4b5fd',
  '#ddd6fe',
  '#f5d0fe',
] as const;

type Point = { x: number; y: number };

export type PhysicsBall = Point & {
  color: string;
  vx: number;
  vy: number;
};

export type GravitySimulation = {
  accumulator: number;
  angle: number;
  balls: PhysicsBall[];
};

const EXAMPLE_PLANE_CLASS_NAME =
  'relative size-[188px] touch-none overflow-hidden rounded-full border border-white/12 bg-[#11131a] max-sm:size-[200px]';
const EXAMPLE_THUMB_CLASS_NAME =
  'size-6 border-2 border-white bg-indigo-500 shadow-[0_2px_12px_rgba(0,0,0,0.5)]';

function toCenteredVector(value: PlaneValue) {
  const x = value.x * 2 - 1;
  const y = value.y * 2 - 1;
  return {
    angle: (Math.atan2(y, x) * 180) / Math.PI,
    magnitude: Math.min(1, Math.hypot(x, y)),
    x,
    y,
  };
}

function projectToCircle(value: PlaneValue): PlaneValue {
  const { x, y } = toCenteredVector(value);
  const length = Math.hypot(x, y);
  if (length <= 1) return value;

  return { x: 0.5 + x / length / 2, y: 0.5 + y / length / 2 };
}

export function getBallCount(magnitude: number) {
  return 1 + Math.round(7 * Math.min(1, Math.max(0, magnitude)));
}

function hexagonVertices(angle: number) {
  return Array.from({ length: 6 }, (_, index) => {
    const vertexAngle = angle + (index * TAU) / 6;
    return {
      x: Math.cos(vertexAngle) * HEX_RADIUS,
      y: Math.sin(vertexAngle) * HEX_RADIUS,
    };
  });
}

function forEachWall(
  angle: number,
  visit: (start: Point, normal: Point) => void,
) {
  const vertices = hexagonVertices(angle);
  for (let index = 0; index < vertices.length; index += 1) {
    const start = vertices[index];
    const end = vertices[(index + 1) % vertices.length];
    const edgeX = end.x - start.x;
    const edgeY = end.y - start.y;
    const edgeLength = Math.hypot(edgeX, edgeY);
    visit(start, { x: -edgeY / edgeLength, y: edgeX / edgeLength });
  }
}

function distanceToClosestWall(point: Point, angle: number) {
  let closest = Number.POSITIVE_INFINITY;
  forEachWall(angle, (start, normal) => {
    closest = Math.min(
      closest,
      (point.x - start.x) * normal.x + (point.y - start.y) * normal.y,
    );
  });
  return closest;
}

export function isBallContained(ball: Point, angle: number) {
  return distanceToClosestWall(ball, angle) >= BALL_RADIUS - 0.05;
}

function isSpawnClear(
  point: Point,
  balls: readonly PhysicsBall[],
  angle: number,
) {
  if (distanceToClosestWall(point, angle) < BALL_RADIUS + 2) return false;
  return balls.every(
    (ball) =>
      Math.hypot(point.x - ball.x, point.y - ball.y) >= BALL_RADIUS * 2 + 2,
  );
}

function spawnBall(
  index: number,
  balls: readonly PhysicsBall[],
  angle: number,
): PhysicsBall {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const ringRadii = [0, 28, 52, 76];
  let point = { x: 0, y: 0 };

  for (let attempt = 0; attempt < 48; attempt += 1) {
    const radius =
      ringRadii[Math.min(ringRadii.length - 1, Math.floor(attempt / 12))];
    const candidateAngle = (index + attempt) * goldenAngle;
    const candidate = {
      x: Math.cos(candidateAngle) * radius,
      y: Math.sin(candidateAngle) * radius,
    };
    if (isSpawnClear(candidate, balls, angle)) {
      point = candidate;
      break;
    }
  }

  const launchAngle = index * 2.17 + 0.4;
  const speed = index === 0 ? 36 : 48 + (index % 3) * 7;
  return {
    ...point,
    color: BALL_COLORS[index % BALL_COLORS.length],
    vx: Math.cos(launchAngle) * speed,
    vy: Math.sin(launchAngle) * speed,
  };
}

export function reconcileBallCount(
  balls: readonly PhysicsBall[],
  count: number,
  angle: number,
) {
  const targetCount = Math.min(8, Math.max(1, Math.round(count)));
  const nextBalls = balls.slice(0, targetCount).map((ball) => ({ ...ball }));
  while (nextBalls.length < targetCount) {
    nextBalls.push(spawnBall(nextBalls.length, nextBalls, angle));
  }
  return nextBalls;
}

export function createGravitySimulation(count: number): GravitySimulation {
  return {
    accumulator: 0,
    angle: 0,
    balls: reconcileBallCount([], count, 0),
  };
}

function resetInvalidBall(ball: PhysicsBall, index: number) {
  if ([ball.x, ball.y, ball.vx, ball.vy].every(Number.isFinite)) return;
  Object.assign(ball, spawnBall(index, [], 0));
}

function resolveBallCollisions(balls: PhysicsBall[]) {
  const minimumDistance = BALL_RADIUS * 2;

  for (let firstIndex = 0; firstIndex < balls.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < balls.length;
      secondIndex += 1
    ) {
      const first = balls[firstIndex];
      const second = balls[secondIndex];
      const deltaX = second.x - first.x;
      const deltaY = second.y - first.y;
      const distance = Math.hypot(deltaX, deltaY);
      if (distance >= minimumDistance) continue;

      const normalX = distance > 0.0001 ? deltaX / distance : 1;
      const normalY = distance > 0.0001 ? deltaY / distance : 0;
      const overlap = minimumDistance - distance;
      first.x -= normalX * overlap * 0.5;
      first.y -= normalY * overlap * 0.5;
      second.x += normalX * overlap * 0.5;
      second.y += normalY * overlap * 0.5;

      const separatingSpeed =
        (second.vx - first.vx) * normalX + (second.vy - first.vy) * normalY;
      if (separatingSpeed >= 0) continue;

      const impulse = (-(1 + BALL_RESTITUTION) * separatingSpeed) / 2;
      first.vx -= impulse * normalX;
      first.vy -= impulse * normalY;
      second.vx += impulse * normalX;
      second.vy += impulse * normalY;
    }
  }
}

function resolveWallCollisions(ball: PhysicsBall, angle: number) {
  forEachWall(angle, (start, normal) => {
    const wallDistance =
      (ball.x - start.x) * normal.x + (ball.y - start.y) * normal.y;
    if (wallDistance >= BALL_RADIUS) return;

    const penetration = BALL_RADIUS - wallDistance;
    ball.x += normal.x * (penetration + 0.01);
    ball.y += normal.y * (penetration + 0.01);

    const contactX = ball.x - normal.x * BALL_RADIUS;
    const contactY = ball.y - normal.y * BALL_RADIUS;
    const wallVelocityX = -WALL_ANGULAR_VELOCITY * contactY;
    const wallVelocityY = WALL_ANGULAR_VELOCITY * contactX;
    const relativeVelocityX = ball.vx - wallVelocityX;
    const relativeVelocityY = ball.vy - wallVelocityY;
    const normalSpeed =
      relativeVelocityX * normal.x + relativeVelocityY * normal.y;
    if (normalSpeed >= 0) return;

    ball.vx -= (1 + WALL_RESTITUTION) * normalSpeed * normal.x;
    ball.vy -= (1 + WALL_RESTITUTION) * normalSpeed * normal.y;

    const tangentX = -normal.y;
    const tangentY = normal.x;
    const tangentSpeed =
      (ball.vx - wallVelocityX) * tangentX +
      (ball.vy - wallVelocityY) * tangentY;
    ball.vx -= tangentSpeed * tangentX * 0.018;
    ball.vy -= tangentSpeed * tangentY * 0.018;
  });
}

function stepPhysics(
  simulation: GravitySimulation,
  gravity: Point,
  rotateWalls: boolean,
) {
  if (rotateWalls) {
    simulation.angle =
      (simulation.angle + WALL_ANGULAR_VELOCITY * FIXED_STEP) % TAU;
  }

  for (let index = 0; index < simulation.balls.length; index += 1) {
    const ball = simulation.balls[index];
    resetInvalidBall(ball, index);
    ball.vx += gravity.x * GRAVITY_ACCELERATION * FIXED_STEP;
    ball.vy += gravity.y * GRAVITY_ACCELERATION * FIXED_STEP;
    const damping = Math.pow(0.999, FIXED_STEP * 120);
    ball.vx *= damping;
    ball.vy *= damping;

    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed > 720) {
      ball.vx = (ball.vx / speed) * 720;
      ball.vy = (ball.vy / speed) * 720;
    }

    ball.x += ball.vx * FIXED_STEP;
    ball.y += ball.vy * FIXED_STEP;
  }

  for (let pass = 0; pass < 3; pass += 1) {
    resolveBallCollisions(simulation.balls);
    simulation.balls.forEach((ball) =>
      resolveWallCollisions(ball, simulation.angle),
    );
  }
}

export function advanceGravitySimulation(
  simulation: GravitySimulation,
  gravity: Point,
  elapsedSeconds: number,
  rotateWalls = true,
) {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return;

  simulation.accumulator += Math.min(MAX_FRAME_TIME, elapsedSeconds);
  let substeps = 0;
  while (simulation.accumulator >= FIXED_STEP && substeps < MAX_SUBSTEPS) {
    stepPhysics(simulation, gravity, rotateWalls);
    simulation.accumulator -= FIXED_STEP;
    substeps += 1;
  }

  if (substeps === MAX_SUBSTEPS) {
    simulation.accumulator = Math.min(simulation.accumulator, FIXED_STEP);
  }
}

function drawSimulation(
  canvas: HTMLCanvasElement,
  simulation: GravitySimulation,
) {
  const context = canvas.getContext('2d');
  if (!context) return;

  const bounds = canvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.round(bounds.width * pixelRatio);
  const height = Math.round(bounds.height * pixelRatio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, width, height);
  const worldScale =
    (Math.min(bounds.width, bounds.height) / WORLD_SIZE) * pixelRatio;
  context.setTransform(worldScale, 0, 0, -worldScale, width / 2, height / 2);

  const vertices = hexagonVertices(simulation.angle);
  context.beginPath();
  vertices.forEach((vertex, index) => {
    if (index === 0) context.moveTo(vertex.x, vertex.y);
    else context.lineTo(vertex.x, vertex.y);
  });
  context.closePath();
  context.fillStyle = '#11141d';
  context.fill();
  context.strokeStyle = 'rgb(165 180 252 / 0.72)';
  context.lineWidth = 1.5;
  context.stroke();

  context.save();
  context.clip();
  simulation.balls.forEach((ball) => {
    const gradient = context.createRadialGradient(
      ball.x - 3,
      ball.y + 4,
      1,
      ball.x,
      ball.y,
      BALL_RADIUS,
    );
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.26, ball.color);
    gradient.addColorStop(1, '#6366f1');
    context.shadowColor = 'rgb(129 140 248 / 0.42)';
    context.shadowBlur = 10;
    context.beginPath();
    context.arc(ball.x, ball.y, BALL_RADIUS, 0, TAU);
    context.fillStyle = gradient;
    context.fill();
  });
  context.restore();
}

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  return reducedMotion;
}

function RotatingHexagon({
  ballCount,
  gravity,
}: {
  ballCount: number;
  gravity: Point;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulationRef = useRef(createGravitySimulation(ballCount));
  const gravityRef = useRef(gravity);
  const drawRef = useRef<(() => void) | null>(null);
  const reducedMotion = useReducedMotion();

  gravityRef.current = gravity;

  useEffect(() => {
    const simulation = simulationRef.current;
    simulation.balls = reconcileBallCount(
      simulation.balls,
      ballCount,
      simulation.angle,
    );
    drawRef.current?.();
  }, [ballCount, gravity.x, gravity.y]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationFrame: number | null = null;
    let lastTime: number | null = null;
    let intersecting = true;

    const draw = () => drawSimulation(canvas, simulationRef.current);
    drawRef.current = draw;

    const stop = () => {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      lastTime = null;
    };

    const tick = (now: number) => {
      animationFrame = null;
      const elapsed = lastTime === null ? 0 : (now - lastTime) / 1000;
      lastTime = now;
      advanceGravitySimulation(
        simulationRef.current,
        gravityRef.current,
        elapsed,
      );
      draw();
      if (intersecting && !document.hidden && !reducedMotion) {
        animationFrame = requestAnimationFrame(tick);
      }
    };

    const start = () => {
      if (
        animationFrame === null &&
        intersecting &&
        !document.hidden &&
        !reducedMotion
      ) {
        animationFrame = requestAnimationFrame(tick);
      } else {
        draw();
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else start();
    };

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      intersecting = entry?.isIntersecting ?? false;
      if (intersecting) start();
      else stop();
    });
    const resizeObserver = new ResizeObserver(draw);
    intersectionObserver.observe(canvas);
    resizeObserver.observe(canvas);
    document.addEventListener('visibilitychange', onVisibilityChange);
    draw();
    start();

    return () => {
      stop();
      drawRef.current = null;
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [reducedMotion]);

  return (
    <div className="relative aspect-square w-full max-w-[300px] overflow-hidden rounded-2xl border border-white/10 bg-[#0b0c10] shadow-[inset_0_1px_0_rgb(255_255_255/0.035)] max-sm:max-w-[270px]">
      <canvas
        aria-label={`${ballCount} ${ballCount === 1 ? 'ball' : 'balls'} bouncing inside a rotating hexagon`}
        className="block size-full"
        data-ball-count={ballCount}
        data-motion={reducedMotion ? 'paused' : 'running'}
        ref={canvasRef}
        role="img"
      />
      <div className="pointer-events-none absolute top-3 left-3 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 font-mono text-[10px] text-white/65 backdrop-blur-sm">
        {ballCount} {ballCount === 1 ? 'ball' : 'balls'}
      </div>
      {reducedMotion ? (
        <div className="pointer-events-none absolute right-3 bottom-3 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] text-white/55 backdrop-blur-sm">
          Motion paused
        </div>
      ) : null}
    </div>
  );
}

function ExampleFrame({
  children,
  readout,
}: {
  children: ReactNode;
  readout: ReactNode;
}) {
  return (
    <div className="flex min-h-[430px] flex-col items-center justify-center gap-5 bg-[#101114] p-6 max-sm:min-h-[620px] max-sm:p-4">
      {children}
      <div className="flex max-w-[420px] flex-col items-center gap-1.5 text-center">
        <output className="font-mono text-[11px] text-white/72">
          {readout}
        </output>
      </div>
    </div>
  );
}

const initialValue: PlaneValue = { x: 0.5, y: 0.12 };

function formatGravity(value: PlaneValue) {
  const vector = toCenteredVector(value);
  const ballCount = getBallCount(vector.magnitude);
  return `${Math.round(vector.angle)} degree gravity, ${Math.round(vector.magnitude * 100)} percent strength, ${ballCount} ${ballCount === 1 ? 'ball' : 'balls'}`;
}

export function GravityVectorExample() {
  const [value, setValue] = useState(initialValue);
  const vector = toCenteredVector(value);
  const ballCount = getBallCount(vector.magnitude);

  return (
    <ExampleFrame
      readout={`${ballCount} ${ballCount === 1 ? 'ball' : 'balls'} · ${Math.round(vector.magnitude * 100)}% gravity · ${vector.x.toFixed(2)}g X · ${vector.y.toFixed(2)}g Y`}
    >
      <div className="flex w-full items-center justify-center gap-8 max-sm:flex-col max-sm:gap-6">
        <RotatingHexagon
          ballCount={ballCount}
          gravity={{ x: vector.x, y: vector.y }}
        />
        <div className="flex shrink-0 flex-col items-center gap-3">
          <Plane
            aria-label="Gravity vector"
            className={EXAMPLE_PLANE_CLASS_NAME}
          >
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 size-full"
              viewBox="0 0 100 100"
            >
              <circle
                cx="50"
                cy="50"
                fill="none"
                r="24"
                stroke="rgb(255 255 255 / 0.08)"
              />
              <circle
                cx="50"
                cy="50"
                fill="none"
                r="48"
                stroke="rgb(255 255 255 / 0.08)"
              />
              <line
                stroke="rgb(165 180 252 / 0.6)"
                strokeLinecap="round"
                strokeWidth="1.2"
                x1="50"
                x2={value.x * 100}
                y1="50"
                y2={(1 - value.y) * 100}
              />
              <circle cx="50" cy="50" fill="rgb(255 255 255 / 0.34)" r="1.5" />
            </svg>
            <PlaneThumb
              className={`${EXAMPLE_THUMB_CLASS_NAME} border-indigo-200`}
              getAriaValueText={formatGravity}
              onValueChange={(nextValue) =>
                setValue(projectToCircle(nextValue))
              }
              value={value}
              xAriaLabel="Gravity X"
              yAriaLabel="Gravity Y"
            >
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-indigo-100"
              />
            </PlaneThumb>
          </Plane>
          <div className="flex w-full items-center justify-between font-mono text-[9px] uppercase tracking-[0.08em] text-white/30">
            <span>Center · 1</span>
            <span>Edge · 8</span>
          </div>
        </div>
      </div>
    </ExampleFrame>
  );
}
