import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import { Plane, PlaneThumb, Slider, type PlaneValue } from 'control-kit';

const EXAMPLE_PLANE_CLASS_NAME =
  'relative size-[240px] touch-none overflow-hidden rounded-2xl border border-white/12 bg-[#111216] max-sm:size-[220px]';
const EXAMPLE_THUMB_CLASS_NAME =
  'z-20 size-6 border-2 border-white bg-[#16171b] shadow-[0_2px_12px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.15)]';
const GRID_SIZE = 21;
const MAX_OUTPUT_GAIN = 0.14;
const LOOP_SECONDS = 2.4;

type SynthParameters = {
  filterFrequency: number;
  harmonicGain: number;
  modulationDepth: number;
  modulationRate: number;
};

type SynthEngine = {
  analyser: AnalyserNode;
  baseSource: AudioBufferSourceNode;
  context: AudioContext;
  filter: BiquadFilterNode;
  harmonicGain: GainNode;
  harmonicSource: AudioBufferSourceNode;
  modulationDepth: GainNode;
  modulationSource: OscillatorNode;
  outputGain: GainNode;
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
    <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 p-6 max-sm:min-h-[400px] max-sm:p-4">
      {children}
      <div className="flex max-w-[320px] flex-col items-center gap-1.5 text-center">
        <output className="font-mono text-[11px] text-white/72">
          {readout}
        </output>
        <p className="m-0 text-xs leading-5 text-white/42">{description}</p>
      </div>
    </div>
  );
}

function CornerLabels({
  bottomLeft,
  bottomRight,
  topLeft,
  topRight,
}: {
  bottomLeft: string;
  bottomRight: string;
  topLeft: string;
  topRight: string;
}) {
  const labelClass =
    'absolute z-10 rounded bg-black/35 px-1.5 py-1 text-[9px] font-medium tracking-wide text-white/58 backdrop-blur-sm';

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <span className={`${labelClass} top-2 left-2`}>{topLeft}</span>
      <span className={`${labelClass} top-2 right-2`}>{topRight}</span>
      <span className={`${labelClass} bottom-2 left-2`}>{bottomLeft}</span>
      <span className={`${labelClass} right-2 bottom-2`}>{bottomRight}</span>
    </div>
  );
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

const initialValue: PlaneValue = { x: 0.62, y: 0.42 };

function formatSynth(value: PlaneValue) {
  return `${formatPercent(value.x)} brightness, ${formatPercent(value.y)} modulation`;
}

function getSynthParameters(value: PlaneValue): SynthParameters {
  return {
    filterFrequency: 280 + value.x * value.x * 7_200,
    harmonicGain: 0.025 + value.x * 0.24,
    modulationDepth: 12 + value.y * value.y * 1_350,
    modulationRate: 0.18 + value.y * 4.6,
  };
}

function getDotColor(value: PlaneValue) {
  const hue = 258 + value.x * 92 - value.y * 34;
  const saturation = 62 + value.y * 28;
  const lightness = 58 + value.x * 16 - value.y * 5;
  return { hue, lightness, saturation };
}

function createLoopBuffer(
  context: AudioContext,
  harmonic: boolean,
): AudioBuffer {
  const frameCount = Math.round(context.sampleRate * LOOP_SECONDS);
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const data = buffer.getChannelData(0);
  const notes = [220, 277.18, 329.63, 415.3, 329.63, 277.18, 246.94, 277.18];
  const noteLength = LOOP_SECONDS / notes.length;

  for (let index = 0; index < frameCount; index += 1) {
    const time = index / context.sampleRate;
    const noteIndex = Math.min(notes.length - 1, Math.floor(time / noteLength));
    const noteTime = time - noteIndex * noteLength;
    const progress = noteTime / noteLength;
    const envelope = Math.sin(Math.PI * progress) ** 2;
    const frequency = notes[noteIndex];
    const phase = Math.PI * 2 * frequency * noteTime;

    data[index] = harmonic
      ? envelope * (Math.sin(phase * 2) * 0.66 + Math.sin(phase * 3) * 0.34)
      : envelope * (Math.sin(phase) * 0.88 + Math.sin(phase * 0.5) * 0.12);
  }

  return buffer;
}

function rampParameter(parameter: AudioParam, value: number, now: number) {
  parameter.cancelScheduledValues(now);
  parameter.setTargetAtTime(value, now, 0.025);
}

function applySynthParameters(
  engine: SynthEngine,
  value: PlaneValue,
  volume: number,
) {
  const parameters = getSynthParameters(value);
  const now = engine.context.currentTime;
  rampParameter(engine.filter.frequency, parameters.filterFrequency, now);
  rampParameter(engine.harmonicGain.gain, parameters.harmonicGain, now);
  rampParameter(
    engine.modulationSource.frequency,
    parameters.modulationRate,
    now,
  );
  rampParameter(engine.modulationDepth.gain, parameters.modulationDepth, now);
  rampParameter(engine.outputGain.gain, (volume / 100) * MAX_OUTPUT_GAIN, now);
}

function createSynthEngine(
  value: PlaneValue,
  volume: number,
  onStateChange: (state: AudioContextState) => void,
): SynthEngine | null {
  const AudioContextConstructor =
    window.AudioContext ??
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;
  if (!AudioContextConstructor) return null;

  const context = new AudioContextConstructor();
  const baseSource = context.createBufferSource();
  const harmonicSource = context.createBufferSource();
  const baseGain = context.createGain();
  const harmonicGain = context.createGain();
  const filter = context.createBiquadFilter();
  const analyser = context.createAnalyser();
  const outputGain = context.createGain();
  const modulationSource = context.createOscillator();
  const modulationDepth = context.createGain();

  baseSource.buffer = createLoopBuffer(context, false);
  baseSource.loop = true;
  harmonicSource.buffer = createLoopBuffer(context, true);
  harmonicSource.loop = true;
  baseGain.gain.value = 0.22;
  harmonicGain.gain.value = 0;
  filter.type = 'lowpass';
  filter.Q.value = 1.2;
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.72;
  outputGain.gain.value = 0;
  modulationSource.type = 'sine';

  baseSource.connect(baseGain).connect(filter);
  harmonicSource.connect(harmonicGain).connect(filter);
  modulationSource.connect(modulationDepth).connect(filter.frequency);
  filter.connect(analyser).connect(outputGain).connect(context.destination);

  const engine: SynthEngine = {
    analyser,
    baseSource,
    context,
    filter,
    harmonicGain,
    harmonicSource,
    modulationDepth,
    modulationSource,
    outputGain,
  };
  applySynthParameters(engine, value, volume);
  context.onstatechange = () => onStateChange(context.state);
  const startAt = context.currentTime + 0.01;
  baseSource.start(startAt);
  harmonicSource.start(startAt);
  modulationSource.start(startAt);
  return engine;
}

function stopSynthEngine(engine: SynthEngine) {
  engine.outputGain.gain.setValueAtTime(0, engine.context.currentTime);
  engine.context.onstatechange = null;
  engine.baseSource.stop();
  engine.harmonicSource.stop();
  engine.modulationSource.stop();
  engine.baseSource.disconnect();
  engine.harmonicSource.disconnect();
  engine.harmonicGain.disconnect();
  engine.filter.disconnect();
  engine.analyser.disconnect();
  engine.modulationSource.disconnect();
  engine.modulationDepth.disconnect();
  engine.outputGain.disconnect();
  void engine.context.close();
}

function syntheticWave(position: number, time: number, value: PlaneValue) {
  const baseCycles = 1.65 + value.x * 2.7;
  const speed = 0.55 + value.y * 2.2;
  const modulation =
    Math.sin(time * (0.8 + value.y * 2.6) + position * Math.PI * 2) *
    value.y *
    0.7;
  const phase = position * Math.PI * 2 * baseCycles + time * speed + modulation;
  const fundamental = Math.sin(phase);
  const harmonics = Math.sin(phase * 2.03 + value.y * 1.2) * value.x * 0.42;
  return (fundamental + harmonics) / (1 + value.x * 0.42);
}

function drawDotWaveform(
  canvas: HTMLCanvasElement,
  value: PlaneValue,
  time: number,
  analyser: AnalyserNode | null,
  analyserDataRef: MutableRefObject<Float32Array<ArrayBuffer> | null>,
  reducedMotion: boolean,
) {
  const bounds = canvas.getBoundingClientRect();
  if (bounds.width === 0 || bounds.height === 0) return;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.round(bounds.width * pixelRatio);
  const height = Math.round(bounds.height * pixelRatio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const context = canvas.getContext('2d');
  if (!context) return;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, bounds.width, bounds.height);

  if (
    analyser &&
    analyserDataRef.current?.length !== analyser.frequencyBinCount
  ) {
    analyserDataRef.current = new Float32Array(analyser.frequencyBinCount);
  }
  const analyserData = analyser ? analyserDataRef.current : null;
  analyser?.getFloatTimeDomainData(analyserData!);
  const color = getDotColor(value);
  const representativeTime = reducedMotion ? 1.35 : time;
  let activeRadius = 0;
  let centerWave = 0;

  for (let column = 0; column < GRID_SIZE; column += 1) {
    const columnPosition = column / (GRID_SIZE - 1);
    const analyserIndex = analyserData
      ? Math.min(
          analyserData.length - 1,
          Math.round(columnPosition * (analyserData.length - 1)),
        )
      : 0;
    const wave = analyserData
      ? Math.max(-1, Math.min(1, analyserData[analyserIndex] * 2.8))
      : syntheticWave(columnPosition, representativeTime, value);
    const wavePosition = 0.5 - wave * (0.2 + value.y * 0.1);
    if (column === Math.floor(GRID_SIZE / 2)) centerWave = wave;

    for (let row = 0; row < GRID_SIZE; row += 1) {
      const rowPosition = row / (GRID_SIZE - 1);
      const distance = Math.abs(rowPosition - wavePosition);
      const activation = Math.max(0, 1 - distance / 0.082) ** 2;
      const radius = 0.52 + activation * (2.15 + Math.abs(wave) * 0.72);
      activeRadius = Math.max(activeRadius, radius);
      const x = 7 + columnPosition * (bounds.width - 14);
      const y = 7 + rowPosition * (bounds.height - 14);
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fillStyle = `hsl(${color.hue.toFixed(1)} ${color.saturation.toFixed(1)}% ${color.lightness.toFixed(1)}% / ${(0.18 + activation * 0.8).toFixed(3)})`;
      context.fill();
    }
  }

  const renderCount = Number(canvas.dataset.synthRenderCount ?? 0) + 1;
  canvas.dataset.synthActiveRadius = activeRadius.toFixed(3);
  canvas.dataset.synthBrightness = value.x.toFixed(3);
  canvas.dataset.synthColor = `${color.hue.toFixed(1)},${color.saturation.toFixed(1)},${color.lightness.toFixed(1)}`;
  canvas.dataset.synthDotCount = String(GRID_SIZE * GRID_SIZE);
  canvas.dataset.synthIdleRadius = '0.520';
  canvas.dataset.synthMode = reducedMotion
    ? 'static'
    : analyser
      ? 'analyser'
      : 'preview';
  canvas.dataset.synthModulation = value.y.toFixed(3);
  canvas.dataset.synthRenderCount = String(renderCount);
  canvas.dataset.synthWaveSample = centerWave.toFixed(5);
}

function DotWaveform({
  engineRef,
  value,
}: {
  engineRef: MutableRefObject<SynthEngine | null>;
  value: PlaneValue;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserDataRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const valueRef = useRef(value);
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  valueRef.current = value;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReducedMotion(media.matches);
    updatePreference();
    media.addEventListener('change', updatePreference);
    return () => media.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let animationFrame: number | null = null;
    let isIntersecting = true;

    const draw = (now = 0) => {
      drawDotWaveform(
        canvas,
        valueRef.current,
        now / 1_000,
        engineRef.current?.analyser ?? null,
        analyserDataRef,
        reducedMotion,
      );
    };
    const stop = () => {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
    };
    const tick = (now: number) => {
      animationFrame = null;
      if (document.hidden || !isIntersecting || reducedMotion) {
        draw(now);
        return;
      }
      draw(now);
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
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isIntersecting = entry?.isIntersecting ?? false;
      if (isIntersecting) start();
      else stop();
    });
    const resizeObserver = new ResizeObserver(() => draw(performance.now()));

    intersectionObserver.observe(canvas);
    resizeObserver.observe(canvas);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    draw(reducedMotion ? 1_350 : performance.now());
    start();

    return () => {
      stop();
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      canvas.dataset.synthDisposed = 'true';
    };
  }, [engineRef, reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      drawDotWaveform(
        canvas,
        value,
        reducedMotion ? 1.35 : performance.now() / 1_000,
        engineRef.current?.analyser ?? null,
        analyserDataRef,
        reducedMotion,
      );
    }
  }, [engineRef, reducedMotion, value]);

  const color = getDotColor(value);
  return (
    <canvas
      aria-label={
        reducedMotion
          ? 'Static dot waveform preview. Reduced motion is enabled.'
          : 'Animated dot waveform visualizer.'
      }
      className="pointer-events-none absolute inset-0 size-full"
      data-synth-palette-hue={color.hue.toFixed(1)}
      data-synth-reduced={reducedMotion ? 'true' : 'false'}
      data-synth-visualizer
      ref={canvasRef}
      role="img"
    />
  );
}

export function XySynthPadExample() {
  const [value, setValue] = useState(initialValue);
  const [volume, setVolume] = useState(0);
  const [audioState, setAudioState] = useState<
    AudioContextState | 'ready' | 'unavailable'
  >('ready');
  const engineRef = useRef<SynthEngine | null>(null);
  const audioPromiseRef = useRef<Promise<void> | null>(null);
  const interfaceRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const valueRef = useRef(value);
  const volumeRef = useRef(volume);
  valueRef.current = value;
  volumeRef.current = volume;

  const activateAudio = useCallback(() => {
    if (audioPromiseRef.current) return audioPromiseRef.current;
    audioPromiseRef.current = (async () => {
      let engine = engineRef.current;
      if (!engine) {
        engine = createSynthEngine(
          valueRef.current,
          volumeRef.current,
          (state) => {
            if (mountedRef.current) setAudioState(state);
          },
        );
        if (!engine) {
          if (mountedRef.current) setAudioState('unavailable');
          return;
        }
        if (!mountedRef.current) {
          stopSynthEngine(engine);
          return;
        }
        engineRef.current = engine;
      }
      applySynthParameters(engine, valueRef.current, volumeRef.current);
      await engine.context.resume();
      if (mountedRef.current) setAudioState(engine.context.state);
    })()
      .catch(() => {
        if (mountedRef.current) setAudioState('unavailable');
      })
      .finally(() => {
        audioPromiseRef.current = null;
      });
    return audioPromiseRef.current;
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (engine) applySynthParameters(engine, value, volume);
  }, [value, volume]);

  useEffect(() => {
    mountedRef.current = true;
    const root = interfaceRef.current;
    let isIntersecting = true;
    const syncAudioActivity = () => {
      const engine = engineRef.current;
      if (!engine) return;
      if (document.hidden || !isIntersecting) void engine.context.suspend();
      else void engine.context.resume();
    };
    const observer = new IntersectionObserver(([entry]) => {
      isIntersecting = entry?.isIntersecting ?? false;
      syncAudioActivity();
    });
    if (root) observer.observe(root);
    document.addEventListener('visibilitychange', syncAudioActivity);

    return () => {
      mountedRef.current = false;
      observer.disconnect();
      document.removeEventListener('visibilitychange', syncAudioActivity);
      const engine = engineRef.current;
      engineRef.current = null;
      if (engine) stopSynthEngine(engine);
    };
  }, []);

  const parameters = getSynthParameters(value);
  const outputGain = (volume / 100) * MAX_OUTPUT_GAIN;

  return (
    <ExampleFrame
      description="A looping synth plays through the dot waveform. Brightness shapes its harmonics and filter; modulation controls movement."
      readout={`Brightness ${formatPercent(value.x)} · Mod ${formatPercent(value.y)}`}
    >
      <div
        className="flex w-[240px] flex-col gap-4 max-sm:w-[220px]"
        data-synth-audio-state={audioState}
        data-synth-filter-frequency={parameters.filterFrequency.toFixed(2)}
        data-synth-harmonic-gain={parameters.harmonicGain.toFixed(4)}
        data-synth-interface
        data-synth-modulation-depth={parameters.modulationDepth.toFixed(2)}
        data-synth-modulation-rate={parameters.modulationRate.toFixed(3)}
        data-synth-output-gain={outputGain.toFixed(4)}
        onKeyDownCapture={() => void activateAudio()}
        onPointerDownCapture={() => void activateAudio()}
        ref={interfaceRef}
      >
        <Plane
          aria-label="XY synthesizer pad"
          className={EXAMPLE_PLANE_CLASS_NAME}
          data-synth-plane
        >
          <DotWaveform engineRef={engineRef} value={value} />
          <CornerLabels
            bottomLeft="Dark / dry"
            bottomRight="Bright / dry"
            topLeft="Dark / mod"
            topRight="Bright / mod"
          />
          <PlaneThumb
            className={EXAMPLE_THUMB_CLASS_NAME}
            getAriaValueText={formatSynth}
            onValueChange={setValue}
            value={value}
            xAriaLabel="Timbre brightness"
            yAriaLabel="Modulation depth"
          />
        </Plane>
        <label className="flex flex-col gap-1.5 text-[10px] tracking-wide text-white/58 uppercase">
          <span className="flex items-center justify-between">
            Volume
            <output className="font-mono text-white/48">{volume}%</output>
          </span>
          <Slider
            aria-label="Synth volume"
            aria-valuetext={`${volume}%`}
            className="[--ck-accent:hsl(194_78%_65%)]"
            max={100}
            min={0}
            onValueChange={setVolume}
            step={1}
            value={volume}
          />
        </label>
      </div>
    </ExampleFrame>
  );
}
