import { useEffect, useRef, useState } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from 'control-kit';

const PARTICLE_COUNT = 42;
const MAX_SPEED = 84;
const initialValue: PlaneValue = { x: 0.78, y: 0.68 };

type MotionVector = {
  angle: number;
  magnitude: number;
  speed: number;
  x: number;
  y: number;
};

type Particle = {
  alpha: number;
  radius: number;
  x: number;
  y: number;
};

type ParticleSimulation = {
  particles: Particle[];
  renderCount: number;
  travelX: number;
  travelY: number;
};

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function createSimulation(): ParticleSimulation {
  const random = seededRandom(0xc0ffee);
  return {
    particles: Array.from({ length: PARTICLE_COUNT }, () => ({
      alpha: 0.34 + random() * 0.5,
      radius: 0.7 + random() * 1.15,
      x: random(),
      y: random(),
    })),
    renderCount: 0,
    travelX: 0,
    travelY: 0,
  };
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function toMotionVector(value: PlaneValue): MotionVector {
  const x = value.x * 2 - 1;
  const y = value.y * 2 - 1;
  const magnitude = Math.min(1, Math.hypot(x, y));
  return {
    angle: (Math.atan2(y, x) * 180) / Math.PI,
    magnitude,
    speed: magnitude * MAX_SPEED,
    x,
    y,
  };
}

function projectToCircle(value: PlaneValue): PlaneValue {
  const { x, y } = toMotionVector(value);
  const length = Math.hypot(x, y);
  if (length <= 1) return value;

  return { x: 0.5 + x / length / 2, y: 0.5 + y / length / 2 };
}

function formatMotion(value: PlaneValue) {
  const vector = toMotionVector(value);
  if (vector.magnitude === 0) return 'Stopped, 0% intensity';
  return `${Math.round(vector.angle)} degree direction, ${formatPercent(vector.magnitude)} intensity`;
}

function wrap(value: number) {
  return ((value % 1) + 1) % 1;
}

function updateSimulation(
  simulation: ParticleSimulation,
  motion: MotionVector,
  deltaSeconds: number,
  width: number,
  height: number,
) {
  if (motion.magnitude === 0 || width === 0 || height === 0) return;

  const unitX = motion.x / motion.magnitude;
  const unitY = motion.y / motion.magnitude;
  const distance = motion.speed * deltaSeconds;
  const deltaX = (unitX * distance) / width;
  const deltaY = (unitY * distance) / height;

  for (const particle of simulation.particles) {
    particle.x = wrap(particle.x + deltaX);
    particle.y = wrap(particle.y + deltaY);
  }

  simulation.travelX += unitX * distance;
  simulation.travelY += unitY * distance;
}

function drawParticleField(
  canvas: HTMLCanvasElement,
  simulation: ParticleSimulation,
  motion: MotionVector,
  reducedMotion: boolean,
) {
  const bounds = canvas.getBoundingClientRect();
  if (bounds.width === 0 || bounds.height === 0) return;

  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.round(bounds.width);
  const height = Math.round(bounds.height);
  const backingWidth = Math.round(width * pixelRatio);
  const backingHeight = Math.round(height * pixelRatio);
  if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
    canvas.width = backingWidth;
    canvas.height = backingHeight;
  }

  const context = canvas.getContext('2d');
  if (!context) return;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#12171a';
  context.fillRect(0, 0, width, height);

  const glow = context.createRadialGradient(
    width * 0.5,
    height * 0.45,
    0,
    width * 0.5,
    height * 0.45,
    width * 0.68,
  );
  glow.addColorStop(0, 'rgb(34 211 238 / 0.055)');
  glow.addColorStop(1, 'rgb(34 211 238 / 0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  const hasDirection = motion.magnitude > 0;
  const unitX = hasDirection ? motion.x / motion.magnitude : 0;
  const unitY = hasDirection ? -motion.y / motion.magnitude : 0;
  const trailLength = reducedMotion
    ? 8 + motion.magnitude * 13
    : 5 + motion.magnitude * 18;

  for (const particle of simulation.particles) {
    const particleX = particle.x * width;
    const particleY = (1 - particle.y) * height;

    for (const offsetX of [-width, 0, width]) {
      for (const offsetY of [-height, 0, height]) {
        const headX = particleX + offsetX;
        const headY = particleY + offsetY;
        if (
          headX < -trailLength ||
          headX > width + trailLength ||
          headY < -trailLength ||
          headY > height + trailLength
        ) {
          continue;
        }

        if (hasDirection) {
          const tailX = headX - unitX * trailLength;
          const tailY = headY - unitY * trailLength;
          const trail = context.createLinearGradient(
            tailX,
            tailY,
            headX,
            headY,
          );
          trail.addColorStop(0, 'rgb(103 232 249 / 0)');
          trail.addColorStop(1, `rgb(103 232 249 / ${particle.alpha * 0.56})`);
          context.beginPath();
          context.moveTo(tailX, tailY);
          context.lineTo(headX, headY);
          context.strokeStyle = trail;
          context.lineWidth = Math.max(0.7, particle.radius * 0.82);
          context.stroke();
        }

        context.beginPath();
        context.arc(headX, headY, particle.radius, 0, Math.PI * 2);
        context.fillStyle = `rgb(207 250 254 / ${particle.alpha})`;
        context.fill();
      }
    }
  }

  const firstParticle = simulation.particles[0];
  simulation.renderCount += 1;
  canvas.dataset.motionAngle = motion.angle.toFixed(3);
  canvas.dataset.motionIntensity = motion.magnitude.toFixed(3);
  canvas.dataset.motionSampleX = firstParticle.x.toFixed(6);
  canvas.dataset.motionSampleY = firstParticle.y.toFixed(6);
  canvas.dataset.motionRenderCount = simulation.renderCount.toString();
  canvas.dataset.motionSpeed = motion.speed.toFixed(3);
  canvas.dataset.motionState = reducedMotion
    ? 'static'
    : motion.magnitude === 0
      ? 'stopped'
      : 'moving';
  canvas.dataset.motionTravelX = simulation.travelX.toFixed(4);
  canvas.dataset.motionTravelY = simulation.travelY.toFixed(4);
}

function MotionField({ motion }: { motion: MotionVector }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulationRef = useRef<ParticleSimulation | null>(null);
  const motionRef = useRef(motion);
  const syncAnimationRef = useRef<() => void>(() => undefined);
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  motionRef.current = motion;
  if (simulationRef.current === null)
    simulationRef.current = createSimulation();

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReducedMotion(media.matches);
    updatePreference();
    media.addEventListener('change', updatePreference);
    return () => media.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const simulation = simulationRef.current;
    if (!canvas || !simulation) return;

    let animationFrame: number | null = null;
    let lastTime: number | null = null;
    let isIntersecting = true;

    const draw = () => {
      drawParticleField(canvas, simulation, motionRef.current, reducedMotion);
    };

    const stop = () => {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      lastTime = null;
    };

    const tick = (now: number) => {
      animationFrame = null;
      if (document.hidden || !isIntersecting || reducedMotion) {
        lastTime = null;
        draw();
        return;
      }

      const currentMotion = motionRef.current;
      if (currentMotion.magnitude === 0) {
        lastTime = null;
        draw();
        return;
      }

      const bounds = canvas.getBoundingClientRect();
      const deltaSeconds =
        lastTime === null ? 0 : Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      updateSimulation(
        simulation,
        currentMotion,
        deltaSeconds,
        bounds.width,
        bounds.height,
      );
      draw();
      animationFrame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (
        animationFrame === null &&
        !document.hidden &&
        isIntersecting &&
        !reducedMotion
      ) {
        animationFrame = requestAnimationFrame(tick);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) stop();
      else start();
    };

    const syncAnimation = () => {
      if (motionRef.current.magnitude === 0) stop();
      else start();
    };
    syncAnimationRef.current = syncAnimation;

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isIntersecting = entry?.isIntersecting ?? false;
      if (isIntersecting) start();
      else stop();
    });
    const resizeObserver = new ResizeObserver(draw);

    intersectionObserver.observe(canvas);
    resizeObserver.observe(canvas);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    draw();
    start();

    return () => {
      stop();
      if (syncAnimationRef.current === syncAnimation) {
        syncAnimationRef.current = () => undefined;
      }
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const simulation = simulationRef.current;
    if (canvas && simulation) {
      drawParticleField(canvas, simulation, motion, reducedMotion);
      syncAnimationRef.current();
    }
  }, [
    motion.angle,
    motion.magnitude,
    motion.speed,
    motion.x,
    motion.y,
    reducedMotion,
  ]);

  const roundedAngle = Math.round(motion.angle);
  const stateLabel = reducedMotion
    ? `Static direction preview, ${roundedAngle} degrees at ${formatPercent(motion.magnitude)} intensity. Reduced motion is enabled.`
    : motion.magnitude === 0
      ? 'Particle field stopped at 0% intensity.'
      : `Particle field moving ${roundedAngle} degrees at ${formatPercent(motion.magnitude)} intensity.`;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#12171a]"
      data-motion-field-shell
    >
      <canvas
        aria-label={stateLabel}
        className="block aspect-[4/3] w-full min-w-0"
        data-motion-field
        data-motion-reduced={reducedMotion ? 'true' : 'false'}
        ref={canvasRef}
        role="img"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 font-mono text-[9px] tracking-[0.08em] text-white/38 uppercase"
      >
        <span>Particle drift</span>
        <span>
          {reducedMotion
            ? 'Static preview'
            : `${Math.round(motion.speed)} px/s`}
        </span>
      </div>
    </div>
  );
}

export function MotionDirectionIntensityExample() {
  const [value, setValue] = useState(initialValue);
  const motion = toMotionVector(value);
  const stopped = motion.magnitude === 0;

  return (
    <div className="min-h-[440px] bg-[#101114] px-5 py-7 sm:px-7">
      <div className="mx-auto grid w-full max-w-[660px] items-center gap-7 md:grid-cols-[minmax(0,1fr)_220px]">
        <MotionField motion={motion} />
        <div className="flex flex-col items-center gap-4">
          <Plane
            aria-label="Motion direction and intensity"
            className="relative size-[220px] touch-none overflow-hidden rounded-full border border-white/12 [background-origin:border-box] bg-[radial-gradient(circle,transparent_0_31%,rgb(255_255_255/0.06)_32%_32.5%,transparent_33%_64%,rgb(255_255_255/0.08)_65%_65.5%,transparent_66%)] bg-[#171718]"
            data-motion-plane
          >
            <div aria-hidden="true" className="absolute inset-0">
              <span
                className="absolute top-1/2 left-1/2 h-px origin-left bg-cyan-300/70"
                style={{
                  width: `${motion.magnitude * 50}%`,
                  transform: `rotate(${-motion.angle}deg)`,
                }}
              />
              <span className="absolute top-1/2 left-1/2 size-2 -translate-1/2 rounded-full bg-cyan-200" />
            </div>
            <PlaneThumb
              className="size-6 border-2 border-cyan-200 bg-cyan-400 shadow-[0_2px_10px_rgba(0,0,0,0.45)]"
              getAriaValueText={formatMotion}
              onValueChange={(nextValue) =>
                setValue(projectToCircle(nextValue))
              }
              value={value}
              xAriaLabel="Horizontal motion"
              yAriaLabel="Vertical motion"
            />
          </Plane>
          <div className="flex max-w-[280px] flex-col items-center gap-1.5 text-center">
            <output
              className="font-mono text-[11px] text-white/72"
              data-motion-readout
            >
              {stopped
                ? 'Stopped · 0% intensity'
                : `${Math.round(motion.angle)}° · ${formatPercent(motion.magnitude)} intensity`}
            </output>
            <p className="m-0 text-xs leading-5 text-white/42">
              Distance from center sets speed; angle sets direction.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
