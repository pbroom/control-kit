import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Plane, PlaneThumb, type PlaneValue } from '@color-kit/control-kit';

type Tone = {
  label: 'Highlights' | 'Midtones' | 'Shadows';
  luminance: number;
  saturation: number;
  value: PlaneValue;
};

function toCenteredVector(value: PlaneValue) {
  const x = value.x * 2 - 1;
  const y = value.y * 2 - 1;
  const magnitude = Math.min(1, Math.hypot(x, y));
  const angle = (Math.atan2(y, x) * 180) / Math.PI;

  return { angle, magnitude, x, y };
}

function projectToCircle(value: PlaneValue): PlaneValue {
  const vector = toCenteredVector(value);
  if (Math.hypot(vector.x, vector.y) <= 1) return value;

  const length = Math.hypot(vector.x, vector.y);
  return {
    x: 0.5 + vector.x / length / 2,
    y: 0.5 + vector.y / length / 2,
  };
}

const initialTones: Tone[] = [
  {
    label: 'Highlights',
    luminance: 72,
    saturation: 64,
    value: { x: 0.54, y: 0.48 },
  },
  {
    label: 'Midtones',
    luminance: 56,
    saturation: 52,
    value: { x: 0.5, y: 0.5 },
  },
  {
    label: 'Shadows',
    luminance: 42,
    saturation: 58,
    value: { x: 0.46, y: 0.52 },
  },
];

const TONE_SHADER_SEED = {
  Highlights: 17,
  Midtones: 43,
  Shadows: 79,
} as const;

const TONE_WHEEL_VERTEX_SHADER = `
  attribute vec2 a_position;
  varying vec2 v_uv;

  void main() {
    v_uv = (a_position + 1.0) * 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const TONE_WHEEL_FRAGMENT_SHADER = `
  precision highp float;
  varying vec2 v_uv;
  uniform float u_seed;

  const float PI = 3.14159265359;

  vec3 wheelColor(float angle) {
    vec3 orange = vec3(227.0, 92.0, 40.0) / 255.0;
    vec3 pink = vec3(214.0, 75.0, 131.0) / 255.0;
    vec3 purple = vec3(116.0, 77.0, 179.0) / 255.0;
    vec3 blue = vec3(40.0, 120.0, 212.0) / 255.0;
    vec3 cyan = vec3(24.0, 182.0, 197.0) / 255.0;
    vec3 green = vec3(29.0, 187.0, 141.0) / 255.0;
    vec3 lime = vec3(124.0, 168.0, 61.0) / 255.0;
    vec3 yellow = vec3(227.0, 166.0, 46.0) / 255.0;

    if (angle < 55.0) return mix(orange, pink, angle / 55.0);
    if (angle < 95.0) return mix(pink, purple, (angle - 55.0) / 40.0);
    if (angle < 140.0) return mix(purple, blue, (angle - 95.0) / 45.0);
    if (angle < 190.0) return mix(blue, cyan, (angle - 140.0) / 50.0);
    if (angle < 230.0) return mix(cyan, green, (angle - 190.0) / 40.0);
    if (angle < 285.0) return mix(green, lime, (angle - 230.0) / 55.0);
    if (angle < 325.0) return mix(lime, yellow, (angle - 285.0) / 40.0);
    return mix(yellow, orange, (angle - 325.0) / 35.0);
  }

  float gradientNoise(vec2 position, float seed) {
    vec2 offset = vec2(seed * 19.19, seed * 47.77);
    float first = fract(52.9829189 * fract(dot(position + offset, vec2(0.06711056, 0.00583715))));
    float second = fract(52.9829189 * fract(dot(position.yx + offset + 31.0, vec2(0.06711056, 0.00583715))));
    return first + second - 1.0;
  }

  void main() {
    vec2 centered = v_uv - 0.5;
    float angle = mod(degrees(atan(centered.x, centered.y)) + 380.0, 360.0);
    vec3 color = wheelColor(angle);
    float radius = length(centered) * 2.0;

    vec3 radialColor;
    float radialAlpha;
    if (radius < 0.53) {
      float progress = radius / 0.53;
      radialColor = mix(vec3(57.0), vec3(43.0), progress) / 255.0;
      radialAlpha = mix(1.0, 0.72, progress);
    } else {
      radialColor = vec3(43.0 / 255.0);
      radialAlpha = 0.72 * (1.0 - smoothstep(0.53, 1.0, radius));
    }

    color = mix(color, radialColor, radialAlpha);

    // Dither in the shader before the browser quantizes the drawing buffer.
    float dither = gradientNoise(gl_FragCoord.xy, u_seed) / 255.0;
    color = clamp(color + vec3(dither), 0.0, 1.0);
    gl_FragColor = vec4(color, 1.0);
  }
`;

function compileToneWheelShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
) {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function ToneWheelGradient({ seed }: { seed: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      powerPreference: 'low-power',
      premultipliedAlpha: false,
    });
    if (!gl) {
      canvas.dataset.renderer = 'css-fallback';
      return;
    }

    const vertexShader = compileToneWheelShader(
      gl,
      gl.VERTEX_SHADER,
      TONE_WHEEL_VERTEX_SHADER,
    );
    const fragmentShader = compileToneWheelShader(
      gl,
      gl.FRAGMENT_SHADER,
      TONE_WHEEL_FRAGMENT_SHADER,
    );
    const program = gl.createProgram();
    const buffer = gl.createBuffer();

    if (!vertexShader || !fragmentShader || !program || !buffer) {
      if (vertexShader) gl.deleteShader(vertexShader);
      if (fragmentShader) gl.deleteShader(fragmentShader);
      if (program) gl.deleteProgram(program);
      if (buffer) gl.deleteBuffer(buffer);
      canvas.dataset.renderer = 'css-fallback';
      return;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
      canvas.dataset.renderer = 'css-fallback';
      return;
    }

    const position = gl.getAttribLocation(program, 'a_position');
    const seedUniform = gl.getUniformLocation(program, 'u_seed');
    if (position < 0 || seedUniform === null) {
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
      canvas.dataset.renderer = 'css-fallback';
      return;
    }

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(seedUniform, seed);

    const draw = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      const width = Math.max(1, Math.round(bounds.width * pixelRatio));
      const height = Math.max(1, Math.round(bounds.height * pixelRatio));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      gl.viewport(0, 0, width, height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      canvas.dataset.renderer = 'webgl';
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);

    return () => {
      observer.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [seed]);

  return (
    <canvas
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 size-full rounded-[inherit]"
      data-renderer="pending"
      data-tone-shader=""
      data-tone-shader-seed={seed}
      ref={canvasRef}
    />
  );
}

function formatColorBalance(label: string, value: PlaneValue) {
  const { angle, magnitude } = toCenteredVector(value);
  return `${label}: ${Math.round(angle)} degrees, ${Math.round(magnitude * 100)} percent intensity`;
}

const COLOR_BALANCE_STOPS = [
  { color: [227, 92, 40], position: 0 },
  { color: [214, 75, 131], position: 55 },
  { color: [116, 77, 179], position: 95 },
  { color: [40, 120, 212], position: 140 },
  { color: [24, 182, 197], position: 190 },
  { color: [29, 187, 141], position: 230 },
  { color: [124, 168, 61], position: 285 },
  { color: [227, 166, 46], position: 325 },
  { color: [227, 92, 40], position: 360 },
] as const;

function getColorBalanceBias(value: PlaneValue) {
  const vector = toCenteredVector(value);
  if (vector.magnitude < 0.001) return 'rgb(112 112 112)';

  const wheelPosition = (vector.angle + 110 + 360) % 360;
  const endIndex = COLOR_BALANCE_STOPS.findIndex(
    (stop) => stop.position >= wheelPosition,
  );
  const start = COLOR_BALANCE_STOPS[Math.max(0, endIndex - 1)]!;
  const end = COLOR_BALANCE_STOPS[endIndex]!;
  const progress =
    (wheelPosition - start.position) / (end.position - start.position || 1);
  const color = start.color.map((channel, index) =>
    Math.round(channel + (end.color[index]! - channel) * progress),
  );

  return `rgb(${color.join(' ')})`;
}

function ToneSlider({
  kind,
  label,
  onChange,
  trackBackground,
  value,
}: {
  kind: 'luminance' | 'saturation';
  label: string;
  onChange: (value: number) => void;
  trackBackground: string;
  value: number;
}) {
  return (
    <label className="relative block h-6 w-full">
      <span className="sr-only">{label}</span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full"
        data-tone-slider-track={kind}
        style={{ background: trackBackground }}
      />
      <input
        aria-label={label}
        aria-orientation="horizontal"
        aria-valuetext={`${value}%`}
        className="absolute inset-0 m-0 h-6 w-full cursor-ew-resize appearance-none bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-[#ff535b]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111113] [&::-moz-range-thumb]:size-[14px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-black/20 [&::-moz-range-thumb]:bg-[#d0d0d0] [&::-moz-range-thumb]:shadow-[0_1px_3px_rgb(0_0_0/0.45)] [&::-moz-range-track]:h-6 [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-6 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:mt-[5px] [&::-webkit-slider-thumb]:size-[14px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-black/20 [&::-webkit-slider-thumb]:bg-[#d0d0d0] [&::-webkit-slider-thumb]:shadow-[0_1px_3px_rgb(0_0_0/0.45)]"
        data-tone-slider={kind}
        max={100}
        min={0}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        step={1}
        type="range"
        value={value}
      />
    </label>
  );
}

function ToneWheel({
  onLuminanceChange,
  onSaturationChange,
  onValueChange,
  tone,
}: {
  onLuminanceChange: (value: number) => void;
  onSaturationChange: (value: number) => void;
  onValueChange: (value: PlaneValue) => void;
  tone: Tone;
}) {
  const biasColor = getColorBalanceBias(tone.value);

  return (
    <div
      className="flex min-w-0 flex-col items-center gap-3"
      data-tone-control=""
    >
      <Plane
        aria-label={`${tone.label} color balance`}
        className="relative size-[100px] touch-none overflow-hidden rounded-full border border-white/6 [background-origin:border-box] max-sm:size-[84px]"
        style={{
          backgroundImage:
            'radial-gradient(circle, #393939 0%, rgb(50 50 50 / 0.98) 31%, rgb(43 43 43 / 0.72) 53%, transparent 73%), conic-gradient(from -20deg, #e35c28 0deg, #d64b83 55deg, #744db3 95deg, #2878d4 140deg, #18b6c5 190deg, #1dbb8d 230deg, #7ca83d 285deg, #e3a62e 325deg, #e35c28 360deg)',
        }}
      >
        <ToneWheelGradient seed={TONE_SHADER_SEED[tone.label]} />
        <Plus
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 z-[1] size-8 -translate-x-1/2 -translate-y-1/2 text-[#727272]"
          strokeWidth={0.8}
        />
        <PlaneThumb
          className="z-10 size-[18px] border border-white/45 bg-[#c8c8c8] shadow-[0_1px_3px_rgb(0_0_0/0.5)]"
          getAriaValueText={(value) => formatColorBalance(tone.label, value)}
          onValueChange={(value) => onValueChange(projectToCircle(value))}
          value={tone.value}
          xAriaLabel={`${tone.label} cyan to red balance`}
          yAriaLabel={`${tone.label} blue to yellow balance`}
        />
      </Plane>
      <span
        className="text-[13px] leading-none font-medium tracking-[-0.01em] text-white/80"
        data-tone-label=""
      >
        {tone.label}
      </span>
      <div className="flex w-full max-w-[120px] flex-col gap-2 max-sm:max-w-[96px]">
        <ToneSlider
          kind="saturation"
          label={`${tone.label} saturation`}
          onChange={onSaturationChange}
          trackBackground={`linear-gradient(to right, #4b4b4b, ${biasColor})`}
          value={tone.saturation}
        />
        <ToneSlider
          kind="luminance"
          label={`${tone.label} luminance`}
          onChange={onLuminanceChange}
          trackBackground="linear-gradient(to right, #111111, #f2f2f2)"
          value={tone.luminance}
        />
      </div>
    </div>
  );
}

export function ThreeWayColorAdjusterExample() {
  const [tones, setTones] = useState(initialTones);

  const updateTone = (index: number, update: Partial<Tone>) => {
    setTones((current) =>
      current.map((tone, toneIndex) =>
        toneIndex === index ? { ...tone, ...update } : tone,
      ),
    );
  };

  return (
    <div className="flex min-h-[320px] items-center justify-center px-6 py-8 max-sm:px-3">
      <section
        aria-label="Color balance control"
        className="grid w-full max-w-[520px] grid-cols-3 items-start gap-6 max-sm:gap-2"
        role="region"
      >
        {tones.map((tone, index) => (
          <ToneWheel
            key={tone.label}
            onLuminanceChange={(luminance) => updateTone(index, { luminance })}
            onSaturationChange={(saturation) =>
              updateTone(index, { saturation })
            }
            onValueChange={(value) => updateTone(index, { value })}
            tone={tone}
          />
        ))}

        <output className="sr-only" aria-live="polite">
          {tones
            .map(({ label, luminance, saturation, value }) => {
              const { magnitude } = toCenteredVector(value);
              return `${label} ${Math.round(magnitude * 100)}, saturation ${saturation}, luminance ${luminance}`;
            })
            .join(', ')}
        </output>
      </section>
    </div>
  );
}
