import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  Plane,
  PlaneThumb,
  clampPlaneValue,
  type PlaneValue,
  type PlaneValueChangeDetails,
} from 'control-kit';

const EXAMPLE_PLANE_CLASS_NAME =
  'relative size-[240px] touch-none overflow-visible [background-origin:border-box] max-sm:size-[220px]';
const EXAMPLE_THUMB_CLASS_NAME =
  'size-6 border-2 border-white shadow-[0_2px_12px_rgba(0,0,0,0.5)] transition-[box-shadow,transform] data-[dragging]:scale-110 data-[dragging]:shadow-[0_3px_18px_rgba(0,0,0,0.65)]';

const PLANE_SIZE = 240;
const CORNER_RADIUS = 18;
const PUCK_RADIUS = 0.05;
const MAX_PULL = 92;
const MAX_BEND = 42;
const MIN_LAUNCH_PULL = 12;
const LAUNCH_SPEED = 4.4;
const MAX_SPEED = 1.85;
const DRAG = 1.05;
const BOUNCE = 0.84;
const REST_SPEED = 0.045;
const FIXED_STEP = 1 / 120;

type Edge = 'top' | 'right' | 'bottom' | 'left';
type DemoState = 'rest' | 'dragging' | 'armed' | 'flying';

type Pull = {
  anchor: number;
  bend: number;
  distance: number;
  dx: number;
  dy: number;
  edge: Edge;
};

type Motion = {
  accumulator: number;
  bounces: number;
  lastTime: number;
  position: PlaneValue;
  velocity: PlaneValue;
};

function ExampleFrame({
  children,
  description,
  readout,
}: {
  children: ReactNode;
  description: string;
  readout: ReactNode;
}) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-5 overflow-hidden p-8 max-sm:min-h-[380px] max-sm:p-6">
      {children}
      <div className="flex max-w-[340px] flex-col items-center gap-1.5 text-center">
        <output className="font-mono text-[11px] text-white/72">
          {readout}
        </output>
        <p className="m-0 text-xs leading-5 text-white/42">{description}</p>
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getPull(
  event: ReactPointerEvent<HTMLDivElement>,
  bounds: DOMRect,
): Pull | null {
  const right = bounds.left + bounds.width;
  const bottom = bounds.top + bounds.height;
  const dx = event.clientX - clamp(event.clientX, bounds.left, right);
  const dy = event.clientY - clamp(event.clientY, bounds.top, bottom);
  const distance = Math.hypot(dx, dy);
  if (distance < 1) return null;

  const horizontal = Math.abs(dx) >= Math.abs(dy);
  const edge: Edge = horizontal
    ? dx >= 0
      ? 'right'
      : 'left'
    : dy >= 0
      ? 'bottom'
      : 'top';
  const edgeLength = horizontal ? bounds.height : bounds.width;
  const pointerAlongEdge = horizontal
    ? event.clientY - bounds.top
    : event.clientX - bounds.left;

  return {
    anchor: clamp((pointerAlongEdge / edgeLength) * PLANE_SIZE, 54, 186),
    bend: (clamp(distance, 0, MAX_PULL) / MAX_PULL) * MAX_BEND,
    distance,
    dx,
    dy,
    edge,
  };
}

function getOutlinePath(pull: Pull | null) {
  const span = 42;
  const topAnchor = pull?.edge === 'top' ? pull.anchor : PLANE_SIZE / 2;
  const rightAnchor = pull?.edge === 'right' ? pull.anchor : PLANE_SIZE / 2;
  const bottomAnchor = pull?.edge === 'bottom' ? pull.anchor : PLANE_SIZE / 2;
  const leftAnchor = pull?.edge === 'left' ? pull.anchor : PLANE_SIZE / 2;
  const topBend = pull?.edge === 'top' ? pull.bend : 0;
  const rightBend = pull?.edge === 'right' ? pull.bend : 0;
  const bottomBend = pull?.edge === 'bottom' ? pull.bend : 0;
  const leftBend = pull?.edge === 'left' ? pull.bend : 0;

  return [
    `M ${CORNER_RADIUS} 0`,
    `H ${topAnchor - span}`,
    `Q ${topAnchor} ${-topBend} ${topAnchor + span} 0`,
    `H ${PLANE_SIZE - CORNER_RADIUS}`,
    `Q ${PLANE_SIZE} 0 ${PLANE_SIZE} ${CORNER_RADIUS}`,
    `V ${rightAnchor - span}`,
    `Q ${PLANE_SIZE + rightBend} ${rightAnchor} ${PLANE_SIZE} ${rightAnchor + span}`,
    `V ${PLANE_SIZE - CORNER_RADIUS}`,
    `Q ${PLANE_SIZE} ${PLANE_SIZE} ${PLANE_SIZE - CORNER_RADIUS} ${PLANE_SIZE}`,
    `H ${bottomAnchor + span}`,
    `Q ${bottomAnchor} ${PLANE_SIZE + bottomBend} ${bottomAnchor - span} ${PLANE_SIZE}`,
    `H ${CORNER_RADIUS}`,
    `Q 0 ${PLANE_SIZE} 0 ${PLANE_SIZE - CORNER_RADIUS}`,
    `V ${leftAnchor + span}`,
    `Q ${-leftBend} ${leftAnchor} 0 ${leftAnchor - span}`,
    `V ${CORNER_RADIUS}`,
    `Q 0 0 ${CORNER_RADIUS} 0 Z`,
  ].join(' ');
}

function hsvToHex(saturation: number, value: number) {
  const hue = 218 / 60;
  const chroma = value * saturation;
  const secondary = chroma * (1 - Math.abs((hue % 2) - 1));
  const offset = value - chroma;
  const [red, green, blue] =
    hue < 4 ? [0, secondary, chroma] : [secondary, 0, chroma];
  return `#${[red, green, blue]
    .map((channel) =>
      Math.round((channel + offset) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`.toUpperCase();
}

function formatColor(value: PlaneValue) {
  return `${hsvToHex(value.x, value.y)}, ${Math.round(value.x * 100)}% saturation, ${Math.round(value.y * 100)}% brightness`;
}

const initialValue: PlaneValue = { x: 0.72, y: 0.78 };

export function ForceDirectionMagnitudeExample() {
  const [value, setValueState] = useState(initialValue);
  const [pull, setPullState] = useState<Pull | null>(null);
  const [demoState, setDemoState] = useState<DemoState>('rest');
  const [bounceCount, setBounceCount] = useState(0);
  const planeRef = useRef<HTMLDivElement | null>(null);
  const activePointerRef = useRef<number | null>(null);
  const pointerBoundsRef = useRef<DOMRect | null>(null);
  const pullRef = useRef<Pull | null>(null);
  const valueRef = useRef(value);
  const motionRef = useRef<Motion | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const stepAnimationRef = useRef<(time: number) => void>(() => {});
  const canAnimateRef = useRef(true);

  const setValue = useCallback((nextValue: PlaneValue) => {
    const normalized = clampPlaneValue(nextValue);
    valueRef.current = normalized;
    setValueState(normalized);
  }, []);

  const setPull = useCallback((nextPull: Pull | null) => {
    pullRef.current = nextPull;
    setPullState(nextPull);
  }, []);

  const cancelAnimation = useCallback(() => {
    motionRef.current = null;
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const scheduleAnimation = useCallback(() => {
    if (
      !motionRef.current ||
      !canAnimateRef.current ||
      animationFrameRef.current !== null
    ) {
      return;
    }
    animationFrameRef.current = requestAnimationFrame((time) =>
      stepAnimationRef.current(time),
    );
  }, []);

  stepAnimationRef.current = (time) => {
    animationFrameRef.current = null;
    const motion = motionRef.current;
    if (!motion || !canAnimateRef.current) return;

    if (motion.lastTime === 0) motion.lastTime = time;
    motion.accumulator += Math.min((time - motion.lastTime) / 1000, 0.05);
    motion.lastTime = time;

    while (motion.accumulator >= FIXED_STEP) {
      motion.position.x += motion.velocity.x * FIXED_STEP;
      motion.position.y += motion.velocity.y * FIXED_STEP;

      if (motion.position.x < PUCK_RADIUS) {
        motion.position.x = PUCK_RADIUS;
        if (motion.velocity.x < 0) {
          motion.velocity.x = Math.abs(motion.velocity.x) * BOUNCE;
          motion.bounces += 1;
        }
      } else if (motion.position.x > 1 - PUCK_RADIUS) {
        motion.position.x = 1 - PUCK_RADIUS;
        if (motion.velocity.x > 0) {
          motion.velocity.x = -Math.abs(motion.velocity.x) * BOUNCE;
          motion.bounces += 1;
        }
      }

      if (motion.position.y < PUCK_RADIUS) {
        motion.position.y = PUCK_RADIUS;
        if (motion.velocity.y < 0) {
          motion.velocity.y = Math.abs(motion.velocity.y) * BOUNCE;
          motion.bounces += 1;
        }
      } else if (motion.position.y > 1 - PUCK_RADIUS) {
        motion.position.y = 1 - PUCK_RADIUS;
        if (motion.velocity.y > 0) {
          motion.velocity.y = -Math.abs(motion.velocity.y) * BOUNCE;
          motion.bounces += 1;
        }
      }

      const damping = Math.exp(-DRAG * FIXED_STEP);
      motion.velocity.x *= damping;
      motion.velocity.y *= damping;
      motion.accumulator -= FIXED_STEP;
    }

    setValue({ ...motion.position });
    setBounceCount(motion.bounces);
    if (Math.hypot(motion.velocity.x, motion.velocity.y) <= REST_SPEED) {
      motionRef.current = null;
      setDemoState('rest');
      return;
    }
    scheduleAnimation();
  };

  const launch = useCallback(
    (releasedPull: Pull) => {
      const bounds = pointerBoundsRef.current;
      if (!bounds) return;

      const rawVelocity = {
        x: (-releasedPull.dx / bounds.width) * LAUNCH_SPEED,
        y: (releasedPull.dy / bounds.height) * LAUNCH_SPEED,
      };
      const speed = Math.hypot(rawVelocity.x, rawVelocity.y);
      const speedScale = speed > MAX_SPEED ? MAX_SPEED / speed : 1;
      const velocity = {
        x: rawVelocity.x * speedScale,
        y: rawVelocity.y * speedScale,
      };

      const reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      if (reducedMotion) {
        const velocityLength = Math.max(
          0.001,
          Math.hypot(velocity.x, velocity.y),
        );
        setValue({
          x: clamp(
            valueRef.current.x + (velocity.x / velocityLength) * 0.22,
            PUCK_RADIUS,
            1 - PUCK_RADIUS,
          ),
          y: clamp(
            valueRef.current.y + (velocity.y / velocityLength) * 0.22,
            PUCK_RADIUS,
            1 - PUCK_RADIUS,
          ),
        });
        setDemoState('rest');
        return;
      }

      motionRef.current = {
        accumulator: 0,
        bounces: 0,
        lastTime: 0,
        position: { ...valueRef.current },
        velocity,
      };
      setBounceCount(0);
      setDemoState('flying');
      scheduleAnimation();
    },
    [scheduleAnimation, setValue],
  );

  useEffect(() => {
    const plane = planeRef.current;
    let isIntersecting = true;
    const updateAnimationAvailability = () => {
      canAnimateRef.current =
        document.visibilityState !== 'hidden' && isIntersecting;
      if (motionRef.current) {
        motionRef.current.lastTime = 0;
        scheduleAnimation();
      }
    };
    const observer =
      plane && typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(([entry]) => {
            isIntersecting = entry.isIntersecting;
            canAnimateRef.current =
              document.visibilityState !== 'hidden' && isIntersecting;
            if (!canAnimateRef.current && animationFrameRef.current !== null) {
              cancelAnimationFrame(animationFrameRef.current);
              animationFrameRef.current = null;
            }
            if (motionRef.current) {
              motionRef.current.lastTime = 0;
              scheduleAnimation();
            }
          })
        : null;

    document.addEventListener('visibilitychange', updateAnimationAvailability);
    if (plane) observer?.observe(plane);
    return () => {
      document.removeEventListener(
        'visibilitychange',
        updateAnimationAvailability,
      );
      observer?.disconnect();
      cancelAnimation();
    };
  }, [cancelAnimation, scheduleAnimation]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || activePointerRef.current !== null) return;
    cancelAnimation();
    activePointerRef.current = event.pointerId;
    pointerBoundsRef.current = event.currentTarget.getBoundingClientRect();
    setPull(null);
    setDemoState('dragging');
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== event.pointerId) return;
    const bounds = pointerBoundsRef.current;
    if (!bounds) return;
    const nextPull = getPull(event, bounds);
    setPull(nextPull);
    setDemoState(nextPull ? 'armed' : 'dragging');
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== event.pointerId) return;
    const releasedPull = pullRef.current;
    activePointerRef.current = null;
    setPull(null);
    if (releasedPull && releasedPull.distance >= MIN_LAUNCH_PULL) {
      event.preventDefault();
      launch(releasedPull);
    } else {
      setDemoState('rest');
    }
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== event.pointerId) return;
    activePointerRef.current = null;
    pointerBoundsRef.current = null;
    setPull(null);
    setDemoState('rest');
  };

  const handleValueChange = (
    nextValue: PlaneValue,
    details: PlaneValueChangeDetails,
  ) => {
    if (details.interaction === 'keyboard') {
      cancelAnimation();
      setPull(null);
      setDemoState('rest');
    }
    setValue(nextValue);
  };

  const outlinePath = getOutlinePath(pull);
  const pathStyle = {
    d: `path('${outlinePath}')`,
    transition: pull ? 'none' : 'd 180ms cubic-bezier(0.22, 1, 0.36, 1)',
  } as CSSProperties;
  const selectedColor = hsvToHex(value.x, value.y);

  return (
    <ExampleFrame
      description="Pull past an edge and release. The color puck ricochets to a semi-random choice; press anywhere to catch it."
      readout={
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-2 rounded-full border border-white/30"
            style={{ backgroundColor: selectedColor }}
          />
          {selectedColor} · S {Math.round(value.x * 100)}% · V{' '}
          {Math.round(value.y * 100)}%
        </span>
      }
    >
      <Plane
        aria-label="Slingshot color picker"
        className={EXAMPLE_PLANE_CLASS_NAME}
        data-active-pointer={activePointerRef.current ?? undefined}
        data-bounce-count={bounceCount}
        data-pull-distance={Math.round(pull?.distance ?? 0)}
        data-pull-edge={pull?.edge}
        data-slingshot-state={demoState}
        onLostPointerCapture={handlePointerCancel}
        onPointerCancel={handlePointerCancel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        pressBehavior="nearest"
        ref={planeRef}
      >
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute -inset-[20%] size-[140%] overflow-visible"
          data-bend={pull?.bend.toFixed(1) ?? '0'}
          data-plane-rubber-outline
          viewBox="-48 -48 336 336"
        >
          <defs>
            <linearGradient id="slingshot-white" x1="0" x2="1">
              <stop offset="0" stopColor="white" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="slingshot-black" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="black" stopOpacity="0" />
              <stop offset="1" stopColor="black" />
            </linearGradient>
            <filter
              id="slingshot-shadow"
              height="160%"
              width="160%"
              x="-30%"
              y="-30%"
            >
              <feDropShadow
                dx="0"
                dy="8"
                floodColor="black"
                floodOpacity="0.32"
                stdDeviation="10"
              />
            </filter>
          </defs>
          <path
            d={outlinePath}
            fill="hsl(218 100% 50%)"
            filter="url(#slingshot-shadow)"
            style={pathStyle}
          />
          <path
            d={outlinePath}
            fill="url(#slingshot-white)"
            style={pathStyle}
          />
          <path
            d={outlinePath}
            fill="url(#slingshot-black)"
            style={pathStyle}
          />
          <path
            d={outlinePath}
            fill="none"
            stroke="rgb(255 255 255 / 0.18)"
            strokeWidth="1.5"
            style={pathStyle}
          />
        </svg>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-2 left-3 text-[9px] font-medium tracking-[0.16em] text-white/50 uppercase"
        >
          Saturation
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-3 right-2 origin-top-right -rotate-90 text-[9px] font-medium tracking-[0.16em] text-white/50 uppercase"
        >
          Brightness
        </span>
        <PlaneThumb
          className={EXAMPLE_THUMB_CLASS_NAME}
          getAriaValueText={formatColor}
          onKeyDown={() => {
            cancelAnimation();
            setDemoState('rest');
          }}
          onValueChange={handleValueChange}
          style={{ backgroundColor: selectedColor }}
          value={value}
          xAriaLabel="Color saturation"
          yAriaLabel="Color brightness"
        >
          <span
            aria-hidden="true"
            className="size-2 rounded-full bg-white/85 shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
          />
        </PlaneThumb>
      </Plane>
    </ExampleFrame>
  );
}
