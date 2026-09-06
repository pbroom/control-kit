import { useEffect, useMemo, useRef, useState } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from 'control-kit';

const SPRING_YELLOW = '#f5d34f';
const CHART_WIDTH = 392;
const CHART_HEIGHT = 220;
const PLOT = { left: 42, right: 346, top: 18, bottom: 182 } as const;
const TRACK_X = 375;
const RESPONSE_MAX = 1.8;
const initialValue: PlaneValue = { x: 0.46, y: 0.58 };

type Spring = {
  damping: number;
  stiffness: number;
};

type SpringRegime = 'underdamped' | 'critical' | 'overdamped';

function toSpring(value: PlaneValue): Spring {
  return {
    damping: Math.round(5 + value.y * 45),
    stiffness: Math.round(50 + value.x * 450),
  };
}

function getSpringRegime({ damping, stiffness }: Spring): SpringRegime {
  const dampingRatio = damping / (2 * Math.sqrt(stiffness));
  if (Math.abs(dampingRatio - 1) < 0.0001) return 'critical';
  return dampingRatio < 1 ? 'underdamped' : 'overdamped';
}

function sampleSpringResponse({ damping, stiffness }: Spring, time: number) {
  const naturalFrequency = Math.sqrt(stiffness);
  const dampingRatio = damping / (2 * naturalFrequency);

  if (Math.abs(dampingRatio - 1) < 0.0001) {
    return (
      1 - Math.exp(-naturalFrequency * time) * (1 + naturalFrequency * time)
    );
  }

  if (dampingRatio < 1) {
    const dampedFrequency = naturalFrequency * Math.sqrt(1 - dampingRatio ** 2);
    const envelope = Math.exp(-dampingRatio * naturalFrequency * time);
    return (
      1 -
      envelope *
        (Math.cos(dampedFrequency * time) +
          (dampingRatio / Math.sqrt(1 - dampingRatio ** 2)) *
            Math.sin(dampedFrequency * time))
    );
  }

  const rootTerm = Math.sqrt(dampingRatio ** 2 - 1);
  const slowRoot = -naturalFrequency * (dampingRatio - rootTerm);
  const fastRoot = -naturalFrequency * (dampingRatio + rootTerm);
  return (
    1 +
    (fastRoot * Math.exp(slowRoot * time) -
      slowRoot * Math.exp(fastRoot * time)) /
      (slowRoot - fastRoot)
  );
}

function getResponseDuration(spring: Spring) {
  const naturalFrequency = Math.sqrt(spring.stiffness);
  const dampingRatio = spring.damping / (2 * naturalFrequency);
  const decayRate =
    dampingRatio > 1
      ? naturalFrequency * (dampingRatio - Math.sqrt(dampingRatio ** 2 - 1))
      : spring.damping / 2;

  return Math.min(4.8, Math.max(0.6, 7 / Math.max(decayRate, 0.001)));
}

function responsePoint(response: number, progress: number) {
  return {
    x: PLOT.left + progress * (PLOT.right - PLOT.left),
    y:
      PLOT.bottom -
      (Math.min(RESPONSE_MAX, Math.max(0, response)) / RESPONSE_MAX) *
        (PLOT.bottom - PLOT.top),
  };
}

function makeResponsePath(spring: Spring, duration: number) {
  return Array.from({ length: 97 }, (_, index) => {
    const progress = index / 96;
    const point = responsePoint(
      sampleSpringResponse(spring, duration * progress),
      progress,
    );
    return `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  }).join(' ');
}

function formatSpring(value: PlaneValue) {
  const spring = toSpring(value);
  return `Spring stiffness ${spring.stiffness}, damping ${spring.damping}`;
}

function formatDuration(duration: number) {
  if (duration < 1) return `${Math.round(duration * 1000)}ms`;
  return `${duration.toFixed(1)}s`;
}

export function SpringStiffnessDampingExample() {
  const [value, setValue] = useState(initialValue);
  const [progress, setProgress] = useState(1);
  const [copied, setCopied] = useState(false);
  const animationFrame = useRef<number | null>(null);
  const copyResetTimer = useRef<number | null>(null);
  const spring = toSpring(value);
  const regime = getSpringRegime(spring);
  const duration = getResponseDuration(spring);
  const responsePath = useMemo(
    () => makeResponsePath(spring, duration),
    [duration, spring.damping, spring.stiffness],
  );
  const currentResponse = sampleSpringResponse(spring, duration * progress);
  const chartMarker = responsePoint(currentResponse, progress);

  function stopAnimation() {
    if (animationFrame.current !== null) {
      cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    }
  }

  function replay() {
    stopAnimation();

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setProgress(1);
      return;
    }

    const startedAt = performance.now();
    setProgress(0);

    const tick = (now: number) => {
      const nextProgress = Math.min(1, (now - startedAt) / (duration * 1000));
      setProgress(nextProgress);
      if (nextProgress < 1) {
        animationFrame.current = requestAnimationFrame(tick);
      } else {
        animationFrame.current = null;
      }
    };

    animationFrame.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    replay();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleReducedMotionChange = (event: MediaQueryListEvent) => {
      if (!event.matches) return;
      stopAnimation();
      setProgress(1);
    };
    reducedMotion.addEventListener('change', handleReducedMotionChange);

    return () => {
      reducedMotion.removeEventListener('change', handleReducedMotionChange);
      stopAnimation();
      if (copyResetTimer.current !== null) {
        window.clearTimeout(copyResetTimer.current);
        copyResetTimer.current = null;
      }
    };
  }, [duration, spring.damping, spring.stiffness]);

  async function copySpring() {
    try {
      await navigator.clipboard.writeText(
        `{ stiffness: ${spring.stiffness}, damping: ${spring.damping}, mass: 1 }`,
      );
      setCopied(true);
      if (copyResetTimer.current !== null) {
        window.clearTimeout(copyResetTimer.current);
      }
      copyResetTimer.current = window.setTimeout(() => {
        setCopied(false);
        copyResetTimer.current = null;
      }, 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="min-h-[430px] bg-[#101114] px-5 py-6 sm:px-7 sm:py-7">
      <div className="grid gap-7 md:grid-cols-[minmax(0,1fr)_190px] md:items-center">
        <div className="min-w-0" data-spring-chart>
          <svg
            aria-label={`Spring response over ${formatDuration(duration)}`}
            className="block h-auto w-full"
            role="img"
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          >
            {[0, 0.5, 1, 1.5].map((response) => {
              const y = responsePoint(response, 0).y;
              return (
                <g key={response}>
                  <line
                    stroke="rgb(255 255 255 / 0.11)"
                    strokeDasharray="3 4"
                    x1={PLOT.left}
                    x2={PLOT.right}
                    y1={y}
                    y2={y}
                  />
                  <text
                    fill="rgb(255 255 255 / 0.38)"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    fontSize="9"
                    textAnchor="end"
                    x={PLOT.left - 8}
                    y={y + 3}
                  >
                    {Math.round(response * 100)}%
                  </text>
                </g>
              );
            })}
            <line
              stroke="rgb(255 255 255 / 0.28)"
              strokeDasharray="4 4"
              x1={PLOT.left}
              x2={PLOT.right}
              y1={responsePoint(1, 0).y}
              y2={responsePoint(1, 0).y}
            />
            <path
              d={responsePath}
              data-response-regime={regime}
              data-spring-chart-path
              fill="none"
              stroke={SPRING_YELLOW}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
            />
            <circle
              cx={chartMarker.x}
              cy={chartMarker.y}
              data-current-response={currentResponse.toFixed(5)}
              data-spring-chart-marker
              fill={SPRING_YELLOW}
              r="4"
              stroke="#101114"
              strokeWidth="2"
            />
            <g aria-hidden="true" data-spring-track>
              <line
                stroke="rgb(255 255 255 / 0.12)"
                strokeLinecap="round"
                strokeWidth="4"
                x1={TRACK_X}
                x2={TRACK_X}
                y1={PLOT.top}
                y2={PLOT.bottom}
              />
              <line
                data-spring-target
                stroke="rgb(255 255 255 / 0.3)"
                strokeLinecap="round"
                strokeWidth="2"
                x1={TRACK_X - 7}
                x2={TRACK_X + 7}
                y1={responsePoint(1, 0).y}
                y2={responsePoint(1, 0).y}
              />
              <circle
                cx={TRACK_X}
                cy={chartMarker.y}
                data-current-response={currentResponse.toFixed(5)}
                data-spring-ball
                fill={SPRING_YELLOW}
                r="10"
                stroke="#101114"
                strokeWidth="2"
              />
            </g>
            <text
              fill="rgb(255 255 255 / 0.38)"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fontSize="9"
              x={PLOT.left}
              y="207"
            >
              0
            </text>
            <text
              fill="rgb(255 255 255 / 0.38)"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fontSize="9"
              textAnchor="end"
              x={PLOT.right}
              y="207"
            >
              {formatDuration(duration)}
            </text>
          </svg>
          <div className="mt-2 flex items-center justify-between gap-4 pl-[42px]">
            <p className="m-0 text-xs leading-5 text-white/42">
              Drag the plane to balance responsiveness against settling time.
            </p>
            <button
              className="h-9 shrink-0 rounded-full border border-white/14 px-5 text-xs font-medium text-white/84 transition-colors hover:border-white/24 hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5d34f]"
              onClick={replay}
              type="button"
            >
              Replay
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex w-full items-center justify-between">
            <span className="text-xs font-medium text-white/68">Damping</span>
            <output className="font-mono text-[11px] text-white/88">
              {spring.damping}
            </output>
          </div>
          <div className="relative">
            <span className="absolute top-2 bottom-2 -left-4 flex flex-col justify-between font-mono text-[9px] text-white/35">
              <span>50</span>
              <span>5</span>
            </span>
            <Plane
              aria-label="Spring stiffness and damping"
              className="relative size-[174px] touch-none overflow-hidden rounded-2xl border border-white/12 bg-[#16171a] shadow-[inset_0_1px_0_rgb(255_255_255/0.03)]"
              data-spring-plane
            >
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, rgb(255 255 255 / 0.075) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.075) 1px, transparent 1px)',
                  backgroundSize: '25% 25%',
                }}
              />
              <PlaneThumb
                className="size-5 border-2 border-[#101114] bg-[#f7f7f5] shadow-[0_2px_10px_rgb(0_0_0/0.5)] outline-none focus-within:ring-2 focus-within:ring-[#f5d34f] focus-within:ring-offset-2 focus-within:ring-offset-[#16171a]"
                getAriaValueText={formatSpring}
                onValueChange={(nextValue) => {
                  setCopied(false);
                  setValue(nextValue);
                }}
                step={0.01}
                value={value}
                xAriaLabel="Spring stiffness"
                yAriaLabel="Spring damping"
              />
            </Plane>
          </div>
          <div className="flex w-full items-center justify-between font-mono text-[9px] text-white/35">
            <span>50</span>
            <span className="font-sans text-xs font-medium text-white/68">
              Stiffness
            </span>
            <span>500</span>
          </div>
          <output className="font-mono text-[11px] text-white/66">
            {regime === 'underdamped' ? 'under-damped' : regime}
          </output>
          <button
            className="h-9 w-full rounded-full border border-white/14 bg-transparent text-xs font-medium text-white/84 transition-colors hover:border-white/24 hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5d34f]"
            onClick={copySpring}
            type="button"
          >
            <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
