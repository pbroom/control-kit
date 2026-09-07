import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from 'control-kit';

const EXAMPLE_PLANE_CLASS_NAME =
  'relative size-[240px] touch-none overflow-hidden rounded-2xl border border-white/12 [background-origin:border-box] bg-[#171718] max-sm:size-[220px]';
const EXAMPLE_THUMB_CLASS_NAME =
  'size-6 border-2 border-white bg-[#171718] shadow-[0_2px_10px_rgba(0,0,0,0.45)]';
const EMISSION_RATE = 24;
const MAX_PARTICLES = 40;
const STATIC_PARTICLE_COUNT = 11;
const initialValue: PlaneValue = { x: 0.76, y: 0.72 };

type EmitterVector = {
  angle: number;
  magnitude: number;
  spread: number;
  x: number;
  y: number;
};

type Particle = {
  active: boolean;
  age: number;
  id: number;
  lifetime: number;
  radius: number;
  velocityX: number;
  velocityY: number;
  x: number;
  y: number;
};

type ParticleSimulation = {
  emissionAccumulator: number;
  frameCount: number;
  nextParticleId: number;
  particles: Particle[];
  random: () => number;
  spawnCount: number;
  travelDistance: number;
};

function ExampleFrame({
  children,
  readout,
}: {
  children: ReactNode;
  readout: ReactNode;
}) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 p-6 max-sm:min-h-[340px] max-sm:p-4">
      {children}
      <div className="flex max-w-[300px] flex-col items-center gap-1.5 text-center">
        <output className="font-mono text-[11px] text-white/72">
          {readout}
        </output>
      </div>
    </div>
  );
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function toEmitterVector(value: PlaneValue): EmitterVector {
  const x = value.x * 2 - 1;
  const y = value.y * 2 - 1;
  const magnitude = Math.min(1, Math.hypot(x, y));
  return {
    angle: (Math.atan2(y, x) * 180) / Math.PI,
    magnitude,
    spread: 8 + magnitude * 30,
    x,
    y,
  };
}

function projectToCircle(value: PlaneValue): PlaneValue {
  const { x, y } = toEmitterVector(value);
  const length = Math.hypot(x, y);
  if (length <= 1) return value;

  return { x: 0.5 + x / length / 2, y: 0.5 + y / length / 2 };
}

function formatEmitter(value: PlaneValue) {
  const emitter = toEmitterVector(value);
  return `${Math.round(emitter.angle)} degree emission, ${formatPercent(emitter.magnitude)} spread`;
}

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

function inactiveParticle(): Particle {
  return {
    active: false,
    age: 0,
    id: 0,
    lifetime: 0,
    radius: 0,
    velocityX: 0,
    velocityY: 0,
    x: 0,
    y: 0,
  };
}

function spawnParticle(
  simulation: ParticleSimulation,
  emitter: EmitterVector,
  initialAge = 0,
) {
  let particle = simulation.particles.find((candidate) => !candidate.active);
  if (!particle) {
    particle = simulation.particles.reduce((oldest, candidate) =>
      candidate.age > oldest.age ? candidate : oldest,
    );
  }

  const spreadOffset = (simulation.random() - 0.5) * emitter.spread;
  const direction = ((emitter.angle + spreadOffset) * Math.PI) / 180;
  const speed = 0.64 + simulation.random() * 0.22;
  particle.active = true;
  particle.age = initialAge;
  particle.id = simulation.nextParticleId;
  particle.lifetime = 1 + simulation.random() * 0.38;
  particle.radius = 1.1 + simulation.random() * 1.05;
  particle.velocityX = Math.cos(direction) * speed;
  particle.velocityY = Math.sin(direction) * speed;
  particle.x = particle.velocityX * initialAge;
  particle.y = particle.velocityY * initialAge;
  simulation.nextParticleId += 1;
  simulation.spawnCount += 1;
}

function createSimulation(emitter: EmitterVector): ParticleSimulation {
  const simulation: ParticleSimulation = {
    emissionAccumulator: 0,
    frameCount: 0,
    nextParticleId: 1,
    particles: Array.from({ length: MAX_PARTICLES }, inactiveParticle),
    random: seededRandom(0x51eed),
    spawnCount: 0,
    travelDistance: 0,
  };

  for (let index = 0; index < 16; index += 1) {
    spawnParticle(simulation, emitter, (index + 1) / EMISSION_RATE);
  }
  return simulation;
}

function updateSimulation(
  simulation: ParticleSimulation,
  emitter: EmitterVector,
  deltaSeconds: number,
) {
  simulation.emissionAccumulator += deltaSeconds * EMISSION_RATE;
  const emissions = Math.floor(simulation.emissionAccumulator);
  simulation.emissionAccumulator -= emissions;

  for (let index = 0; index < emissions; index += 1) {
    const initialAge =
      emissions === 0
        ? 0
        : (deltaSeconds * (emissions - index - 1)) / emissions;
    spawnParticle(simulation, emitter, initialAge);
  }

  for (const particle of simulation.particles) {
    if (!particle.active) continue;
    particle.age += deltaSeconds;
    particle.x += particle.velocityX * deltaSeconds;
    particle.y += particle.velocityY * deltaSeconds;
    simulation.travelDistance +=
      Math.hypot(particle.velocityX, particle.velocityY) * deltaSeconds;
    const distance = Math.hypot(particle.x, particle.y);
    if (particle.age >= particle.lifetime || distance >= 0.98) {
      particle.active = false;
    }
  }
}

function resizeCanvas(canvas: HTMLCanvasElement) {
  const bounds = canvas.getBoundingClientRect();
  const width = Math.round(bounds.width);
  const height = Math.round(bounds.height);
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const backingWidth = Math.round(width * pixelRatio);
  const backingHeight = Math.round(height * pixelRatio);
  if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
    canvas.width = backingWidth;
    canvas.height = backingHeight;
  }
  return { height, pixelRatio, width };
}

function drawParticle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  opacity: number,
) {
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.shadowBlur = radius * 5;
  context.shadowColor = `rgb(232 121 249 / ${opacity * 0.72})`;
  context.fillStyle = `rgb(240 171 252 / ${opacity})`;
  context.fill();
}

function drawBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#100d18';
  context.fillRect(0, 0, width, height);
  const glow = context.createRadialGradient(
    width / 2,
    height / 2,
    0,
    width / 2,
    height / 2,
    Math.min(width, height) * 0.52,
  );
  glow.addColorStop(0, 'rgb(217 70 239 / 0.075)');
  glow.addColorStop(1, 'rgb(217 70 239 / 0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);
}

function updateCanvasDiagnostics(
  canvas: HTMLCanvasElement,
  simulation: ParticleSimulation,
  emitter: EmitterVector,
  state: 'disposed' | 'offscreen' | 'running' | 'static' | 'hidden',
) {
  const activeParticles = simulation.particles.filter(
    (particle) => particle.active,
  );
  const sample = activeParticles.reduce<Particle | null>(
    (selected, particle) =>
      selected === null || particle.id < selected.id ? particle : selected,
    null,
  );
  const newest = activeParticles.reduce<Particle | null>(
    (selected, particle) =>
      selected === null || particle.id > selected.id ? particle : selected,
    null,
  );
  const outOfBounds = activeParticles.filter(
    (particle) => Math.hypot(particle.x, particle.y) > 1,
  ).length;
  canvas.dataset.emitterAngle = emitter.angle.toFixed(3);
  canvas.dataset.emitterFrameCount = simulation.frameCount.toString();
  canvas.dataset.emitterMaxParticles = MAX_PARTICLES.toString();
  canvas.dataset.emitterOutOfBounds = outOfBounds.toString();
  canvas.dataset.emitterParticleCount = activeParticles.length.toString();
  canvas.dataset.emitterRenderedParticleCount = (
    state === 'static' ? STATIC_PARTICLE_COUNT : activeParticles.length
  ).toString();
  canvas.dataset.emitterNewestVelocityX = newest?.velocityX.toFixed(5) ?? '';
  canvas.dataset.emitterNewestVelocityY = newest?.velocityY.toFixed(5) ?? '';
  canvas.dataset.emitterSampleAge = sample?.age.toFixed(4) ?? '';
  canvas.dataset.emitterSampleId = sample?.id.toString() ?? '';
  canvas.dataset.emitterSampleX = sample?.x.toFixed(5) ?? '';
  canvas.dataset.emitterSampleY = sample?.y.toFixed(5) ?? '';
  canvas.dataset.emitterSpawnCount = simulation.spawnCount.toString();
  canvas.dataset.emitterSpread = emitter.spread.toFixed(3);
  canvas.dataset.emitterState = state;
  canvas.dataset.emitterTravelDistance = simulation.travelDistance.toFixed(5);
}

function drawParticleEmitter(
  canvas: HTMLCanvasElement,
  simulation: ParticleSimulation,
  emitter: EmitterVector,
  reducedMotion: boolean,
  state: 'disposed' | 'offscreen' | 'running' | 'static' | 'hidden',
) {
  const { height, pixelRatio, width } = resizeCanvas(canvas);
  if (width === 0 || height === 0) return;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  drawBackground(context, width, height);

  const centerX = width / 2;
  const centerY = height / 2;
  const planeRadius = Math.min(width, height) / 2;
  context.save();
  context.beginPath();
  context.arc(centerX, centerY, planeRadius, 0, Math.PI * 2);
  context.clip();

  if (reducedMotion) {
    for (let index = 0; index < STATIC_PARTICLE_COUNT; index += 1) {
      const progress = (index + 1) / (STATIC_PARTICLE_COUNT + 2);
      const lane = index / (STATIC_PARTICLE_COUNT - 1) - 0.5;
      const angle = ((emitter.angle + lane * emitter.spread) * Math.PI) / 180;
      drawParticle(
        context,
        centerX + Math.cos(angle) * progress * planeRadius,
        centerY - Math.sin(angle) * progress * planeRadius,
        1.4 + (index % 3) * 0.45,
        0.26 + (1 - progress) * 0.62,
      );
    }
  } else {
    for (const particle of simulation.particles) {
      if (!particle.active) continue;
      const lifeProgress = particle.age / particle.lifetime;
      const fadeIn = Math.min(1, particle.age * 12);
      const fadeOut = Math.min(1, Math.max(0, (1 - lifeProgress) / 0.34));
      const opacity = fadeIn * fadeOut * 0.86;
      const particleX = centerX + particle.x * planeRadius;
      const particleY = centerY - particle.y * planeRadius;
      context.beginPath();
      context.moveTo(
        particleX - particle.velocityX * planeRadius * 0.035,
        particleY + particle.velocityY * planeRadius * 0.035,
      );
      context.lineTo(particleX, particleY);
      context.strokeStyle = `rgb(232 121 249 / ${opacity * 0.28})`;
      context.lineWidth = Math.max(0.7, particle.radius * 0.55);
      context.stroke();
      drawParticle(context, particleX, particleY, particle.radius, opacity);
    }
  }
  context.restore();
  context.shadowBlur = 0;

  simulation.frameCount += 1;
  updateCanvasDiagnostics(canvas, simulation, emitter, state);
}

function ParticleEmitter({ emitter }: { emitter: EmitterVector }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const emitterRef = useRef(emitter);
  const simulationRef = useRef<ParticleSimulation | null>(null);
  const syncAnimationRef = useRef<() => void>(() => undefined);
  const lifecycleStateRef = useRef<'active' | 'disposed'>('active');
  const displayStateRef = useRef<
    'disposed' | 'offscreen' | 'running' | 'static' | 'hidden'
  >('running');
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  emitterRef.current = emitter;
  if (simulationRef.current === null) {
    simulationRef.current = createSimulation(emitter);
  }

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
    let disposed = false;
    lifecycleStateRef.current = 'active';

    const draw = (
      state: 'disposed' | 'offscreen' | 'running' | 'static' | 'hidden',
    ) => {
      if (disposed && state !== 'disposed') return;
      displayStateRef.current = state;
      drawParticleEmitter(
        canvas,
        simulation,
        emitterRef.current,
        reducedMotion,
        state,
      );
    };

    const stop = (state: 'disposed' | 'offscreen' | 'static' | 'hidden') => {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      lastTime = null;
      canvas.dataset.emitterState = state;
      draw(state);
    };

    const tick = (now: number) => {
      animationFrame = null;
      if (document.hidden) {
        stop('hidden');
        return;
      }
      if (!isIntersecting) {
        stop('offscreen');
        return;
      }
      if (reducedMotion) {
        stop('static');
        return;
      }

      const deltaSeconds =
        lastTime === null ? 0 : Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      updateSimulation(simulation, emitterRef.current, deltaSeconds);
      draw('running');
      animationFrame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (
        !disposed &&
        animationFrame === null &&
        !document.hidden &&
        isIntersecting &&
        !reducedMotion
      ) {
        animationFrame = requestAnimationFrame(tick);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) stop('hidden');
      else if (isIntersecting) {
        if (reducedMotion) draw('static');
        else start();
      }
    };

    const syncAnimation = () => {
      if (reducedMotion) draw('static');
      else if (document.hidden) stop('hidden');
      else if (!isIntersecting) stop('offscreen');
      else start();
    };
    syncAnimationRef.current = syncAnimation;

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isIntersecting = entry?.isIntersecting ?? false;
      if (isIntersecting) {
        if (reducedMotion) draw('static');
        else start();
      } else stop('offscreen');
    });
    const resizeObserver = new ResizeObserver(() => {
      if (document.hidden) return;
      draw(reducedMotion ? 'static' : isIntersecting ? 'running' : 'offscreen');
    });

    intersectionObserver.observe(canvas);
    resizeObserver.observe(canvas);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    draw(reducedMotion ? 'static' : 'running');
    start();

    return () => {
      disposed = true;
      lifecycleStateRef.current = 'disposed';
      stop('disposed');
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
    if (!canvas || !simulation || lifecycleStateRef.current === 'disposed')
      return;
    drawParticleEmitter(
      canvas,
      simulation,
      emitter,
      reducedMotion,
      reducedMotion ? 'static' : displayStateRef.current,
    );
    syncAnimationRef.current();
  }, [
    emitter.angle,
    emitter.magnitude,
    emitter.spread,
    emitter.x,
    emitter.y,
    reducedMotion,
  ]);

  return (
    <canvas
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full"
      data-emitter-canvas
      data-emitter-reduced={reducedMotion ? 'true' : 'false'}
      ref={canvasRef}
    />
  );
}

export function ParticleEmitterExample() {
  const [value, setValue] = useState(initialValue);
  const emitter = toEmitterVector(value);

  return (
    <ExampleFrame
      readout={`${Math.round(emitter.angle)}° · ${Math.round(emitter.spread)}° spread`}
    >
      <Plane
        aria-label="Particle emitter direction and spread"
        className={`${EXAMPLE_PLANE_CLASS_NAME} rounded-full bg-[#100d18]`}
        data-emitter-plane
      >
        <ParticleEmitter emitter={emitter} />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 z-[1] size-3 -translate-1/2 rounded-full border border-fuchsia-100/80 bg-fuchsia-400 shadow-[0_0_16px_rgb(217_70_239/0.95)]"
          data-emitter-source
        />
        <PlaneThumb
          className={`${EXAMPLE_THUMB_CLASS_NAME} z-10 border-fuchsia-100 bg-fuchsia-500 shadow-[0_0_0_1px_rgb(217_70_239/0.65),0_2px_12px_rgba(0,0,0,0.65)]`}
          getAriaValueText={formatEmitter}
          onValueChange={(nextValue) => setValue(projectToCircle(nextValue))}
          value={value}
          xAriaLabel="Emitter direction X"
          yAriaLabel="Emitter direction Y"
        />
      </Plane>
    </ExampleFrame>
  );
}
