import { useEffect, useRef, useState } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from 'control-kit';

type MeshStop = { x: number; y: number; color: string };

type MeshRenderer = {
  draw(stops: readonly MeshStop[], flow: number, grain: number): void;
  dispose(): void;
};

type LabColor = readonly [number, number, number];
const MAX_STOPS = 6;
const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

function toOklab(hex: string): LabColor {
  const channels = hex.replace('#', '').match(/.{2}/g) ?? ['00', '00', '00'];
  const [r, g, b] = channels.map((channel) => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

const vertexSource = `
attribute vec2 position;
varying vec2 uv;
void main() {
  uv = vec2(position.x * 0.5 + 0.5, 0.5 - position.y * 0.5);
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const fragmentSource = `
precision highp float;
varying vec2 uv;
uniform vec2 points[6];
uniform vec3 colors[6];
uniform int count;
uniform float flow;
uniform float grain;

// Warp one continuous field, rather than compositing transparent color blobs.
vec2 warp(vec2 p) {
  return p + flow * vec2(
    0.42 * sin(5.5 * p.y + 1.7 * sin(3.8 * p.x)),
    0.30 * sin(5.0 * p.x - 1.5 * sin(4.2 * p.y))
  );
}

vec3 fromOklab(vec3 c) {
  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  l = l * l * l; m = m * m * m; s = s * s * s;
  vec3 rgb = max(vec3(0.0), vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  ));
  return mix(12.92 * rgb, 1.055 * pow(rgb, vec3(1.0 / 2.4)) - 0.055,
    step(vec3(0.0031308), rgb));
}

void main() {
  vec2 p = warp(uv);
  vec3 color = vec3(0.0);
  float total = 0.0;
  float distances[6];
  float nearest = 100.0;
  for (int i = 0; i < 6; i++) {
    if (i < count) {
      vec2 d = p - warp(points[i]);
      // Elongated, overlapping influences form ribbons as the domain folds.
      vec2 q = vec2(0.8 * d.x + 0.6 * d.y, -0.6 * d.x + 0.8 * d.y);
      float distance = q.x * q.x * (1.0 + flow * 2.0) + q.y * q.y;
      distances[i] = distance;
      nearest = min(nearest, distance);
    }
  }
  for (int i = 0; i < 6; i++) {
    if (i < count) {
      // Subtracting the minimum keeps a full-strength contributor at every pixel.
      float weight = exp(-(distances[i] - nearest) * (10.0 + flow * 35.0));
      color += colors[i] * weight;
      total += weight;
    }
  }
  vec3 rgb = fromOklab(color / max(total, 0.00001));
  float noise = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  gl_FragColor = vec4(clamp(rgb + noise * grain * 0.055, 0.0, 1.0), 1.0);
}`;

function createCanvasRenderer(canvas: HTMLCanvasElement): MeshRenderer | null {
  const context = canvas.getContext('2d');
  if (!context) return null;
  const buffer = document.createElement('canvas');
  const bufferContext = buffer.getContext('2d');
  if (!bufferContext) return null;
  canvas.dataset.renderer = 'canvas2d';
  let disposed = false;
  return {
    draw(stops, flow, grain) {
      if (disposed || stops.length === 0 || !canvas.width || !canvas.height)
        return;
      flow = clamp(flow);
      grain = clamp(grain);
      // Cap the software work independently of the display's pixel density.
      const scale = Math.min(1, 256 / Math.max(canvas.width, canvas.height));
      buffer.width = Math.max(1, Math.round(canvas.width * scale));
      buffer.height = Math.max(1, Math.round(canvas.height * scale));
      const frame = bufferContext.createImageData(buffer.width, buffer.height);
      const warp = (x: number, y: number) => [
        x + flow * 0.42 * Math.sin(5.5 * y + 1.7 * Math.sin(3.8 * x)),
        y + flow * 0.3 * Math.sin(5 * x - 1.5 * Math.sin(4.2 * y)),
      ];
      const nodes = stops.slice(0, MAX_STOPS).map((stop) => ({
        point: warp(stop.x, stop.y),
        color: toOklab(stop.color),
      }));
      for (let y = 0; y < buffer.height; y++) {
        for (let x = 0; x < buffer.width; x++) {
          const [px, py] = warp(
            (x + 0.5) / buffer.width,
            (y + 0.5) / buffer.height,
          );
          let lightness = 0;
          let a = 0;
          let b = 0;
          let total = 0;
          const distances = nodes.map((node) => {
            const dx = px - node.point[0];
            const dy = py - node.point[1];
            const qx = 0.8 * dx + 0.6 * dy;
            const qy = -0.6 * dx + 0.8 * dy;
            return qx * qx * (1 + flow * 2) + qy * qy;
          });
          const nearest = Math.min(...distances);
          for (let index = 0; index < nodes.length; index++) {
            const node = nodes[index];
            const weight = Math.exp(
              -(distances[index] - nearest) * (10 + flow * 35),
            );
            lightness += node.color[0] * weight;
            a += node.color[1] * weight;
            b += node.color[2] * weight;
            total += weight;
          }
          lightness /= total;
          a /= total;
          b /= total;
          const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
          const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
          const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
          const rgb = [
            4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
            -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
            -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
          ];
          const hash =
            Math.sin((x + 0.5) * 12.9898 + (y + 0.5) * 78.233) * 43758.5453;
          const noise = (hash - Math.floor(hash) - 0.5) * grain * 0.055;
          const offset = (y * buffer.width + x) * 4;
          for (let channel = 0; channel < 3; channel++) {
            const linear = Math.max(0, rgb[channel]);
            const srgb =
              linear <= 0.0031308
                ? 12.92 * linear
                : 1.055 * linear ** (1 / 2.4) - 0.055;
            frame.data[offset + channel] = Math.round(
              clamp(srgb + noise) * 255,
            );
          }
          frame.data[offset + 3] = 255;
        }
      }
      bufferContext.putImageData(frame, 0, 0);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(buffer, 0, 0, canvas.width, canvas.height);
    },
    dispose() {
      disposed = true;
      buffer.width = 0;
      buffer.height = 0;
    },
  };
}

/** A static, continuously blended color field; redraw only when its controls change. */
function createMeshRenderer(
  canvas: HTMLCanvasElement,
  software = false,
  onUnavailable?: () => void,
): MeshRenderer | null {
  if (software) return createCanvasRenderer(canvas);
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
  });
  if (!gl) return createCanvasRenderer(canvas);
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  let latest: {
    stops: readonly MeshStop[];
    flow: number;
    grain: number;
  } | null = null;
  let disposed = false;

  function initialize() {
    if (!gl) return false;
    const shaders: WebGLShader[] = [];
    for (const [type, source] of [
      [gl.VERTEX_SHADER, vertexSource],
      [gl.FRAGMENT_SHADER, fragmentSource],
    ] as const) {
      const shader = gl.createShader(type);
      if (!shader) break;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      shaders.push(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) break;
    }
    if (
      shaders.length === 2 &&
      shaders.every((shader) =>
        gl.getShaderParameter(shader, gl.COMPILE_STATUS),
      )
    ) {
      program = gl.createProgram();
      if (program) {
        shaders.forEach((shader) => gl.attachShader(program!, shader));
        gl.linkProgram(program);
      }
    }
    shaders.forEach((shader) => gl.deleteShader(shader));
    if (!program || !gl.getProgramParameter(program, gl.LINK_STATUS)) {
      if (program) gl.deleteProgram(program);
      program = null;
      return false;
    }
    buffer = gl.createBuffer();
    if (!buffer) {
      gl.deleteProgram(program);
      program = null;
      return false;
    }
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const location = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    canvas.dataset.renderer = 'webgl';
    return true;
  }

  function draw(stops: readonly MeshStop[], flow: number, grain: number) {
    if (disposed) return;
    latest = { stops, flow, grain };
    if (!gl || !program || gl.isContextLost() || !stops.length) return;
    const nodes = stops.slice(0, MAX_STOPS);
    const positions = new Float32Array(MAX_STOPS * 2);
    const colors = new Float32Array(MAX_STOPS * 3);
    nodes.forEach((stop, index) => {
      positions.set([stop.x, stop.y], index * 2);
      colors.set(toOklab(stop.color), index * 3);
    });
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(program);
    gl.uniform2fv(gl.getUniformLocation(program, 'points[0]'), positions);
    gl.uniform3fv(gl.getUniformLocation(program, 'colors[0]'), colors);
    gl.uniform1i(gl.getUniformLocation(program, 'count'), nodes.length);
    gl.uniform1f(gl.getUniformLocation(program, 'flow'), clamp(flow));
    gl.uniform1f(gl.getUniformLocation(program, 'grain'), clamp(grain));
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function onLost(event: Event) {
    event.preventDefault();
    program = null;
    buffer = null;
    canvas.dataset.renderer = 'restoring';
  }
  function onRestored() {
    if (disposed) return;
    if (!initialize()) {
      onUnavailable?.();
      return;
    }
    if (latest) draw(latest.stops, latest.flow, latest.grain);
  }
  if (!initialize()) return null;
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);
  return {
    draw,
    dispose() {
      disposed = true;
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
      latest = null;
    },
  };
}

type MeshPoint = { color: string; value: PlaneValue };

const palettes = [
  {
    name: 'Glacier',
    colors: ['#10246e', '#5035db', '#bab9ff', '#e5f5ff', '#3567ed', '#b276df'],
  },
  {
    name: 'Ember',
    colors: ['#35183e', '#a83e58', '#ff986b', '#fff1bc', '#d75141', '#edbb89'],
  },
  {
    name: 'Orchid',
    colors: ['#31215d', '#7942b4', '#ebb5e7', '#ffe8dc', '#9b80f4', '#d2549e'],
  },
];
const initialPositions: PlaneValue[] = [
  { x: 0.1, y: 0.14 },
  { x: 0.18, y: 0.8 },
  { x: 0.46, y: 0.52 },
  { x: 0.82, y: 0.86 },
  { x: 0.9, y: 0.18 },
  { x: 0.64, y: 0.27 },
];

function pointsForPalette(index: number): MeshPoint[] {
  return palettes[index].colors.map((color, i) => ({
    color,
    value: { ...initialPositions[i] },
  }));
}

function MeshCanvas({
  points,
  flow,
  grain,
}: {
  points: readonly MeshPoint[];
  flow: number;
  grain: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [software, setSoftware] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const drawRef = useRef<(() => void) | null>(null);
  const settingsRef = useRef({ points, flow, grain });
  settingsRef.current = { points, flow, grain };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = createMeshRenderer(canvas, software, () =>
      setSoftware(true),
    );
    if (!renderer) {
      if (!software) setSoftware(true);
      else setUnavailable(true);
      return;
    }
    let frame = 0;
    const draw = () => {
      frame = 0;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(rect.width * ratio));
      const height = Math.max(1, Math.round(rect.height * ratio));
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      const settings = settingsRef.current;
      const stops: MeshStop[] = settings.points.map(({ color, value }) => ({
        x: value.x,
        y: 1 - value.y,
        color,
      }));
      renderer.draw(stops, settings.flow, settings.grain);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    drawRef.current = schedule;
    const observer = new ResizeObserver(schedule);
    observer.observe(canvas);
    window.addEventListener('resize', schedule);
    schedule();
    return () => {
      drawRef.current = null;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      renderer.dispose();
    };
  }, [software]);

  useEffect(() => {
    drawRef.current?.();
  }, [points, flow, grain]);

  if (unavailable) {
    return (
      <span
        role="status"
        className="absolute inset-0 grid place-items-center p-4 text-center text-sm text-white"
      >
        This browser could not render the gradient.
      </span>
    );
  }

  return (
    <canvas
      key={software ? 'software' : 'webgl'}
      ref={canvasRef}
      aria-hidden="true"
      data-mesh-gradient
      className="pointer-events-none absolute inset-0 size-full rounded-[inherit]"
    />
  );
}

export function MeshGradientExample() {
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [points, setPoints] = useState(() => pointsForPalette(0));
  const [activeIndex, setActiveIndex] = useState(2);
  const [flow, setFlow] = useState(0.65);
  const [grain, setGrain] = useState(0.12);
  const [showPoints, setShowPoints] = useState(true);
  const activePoint = points[activeIndex];

  const reset = (index: number) => {
    setPaletteIndex(index);
    setPoints(pointsForPalette(index));
    setActiveIndex(2);
    setFlow(0.65);
    setGrain(0.12);
  };
  const updatePoint = (index: number, patch: Partial<MeshPoint>) => {
    setActiveIndex(index);
    setPoints((current) =>
      current.map((point, i) => (i === index ? { ...point, ...patch } : point)),
    );
  };

  return (
    <div className="flex w-full flex-col items-center gap-5 bg-[#111112] p-6 text-[#ededf0] max-sm:gap-4 max-sm:p-4">
      <div className="flex w-full max-w-[520px] flex-wrap items-center justify-between gap-3">
        <div
          className="flex gap-1 rounded-lg bg-white/5 p-1"
          role="group"
          aria-label="Mesh palettes"
        >
          {palettes.map((palette, index) => (
            <button
              key={palette.name}
              type="button"
              aria-pressed={paletteIndex === index}
              onClick={() => reset(index)}
              className="rounded-md px-3 py-1.5 text-xs text-white/55 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white/80 aria-pressed:bg-white/10 aria-pressed:text-white"
            >
              {palette.name}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowPoints((value) => !value)}
          className="rounded-md px-2 py-2 text-xs text-white/55 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-white/80"
        >
          {showPoints ? 'Hide points' : 'Show points'}
        </button>
      </div>
      <Plane
        aria-label="Mesh gradient control points"
        className="relative aspect-[8/5] w-full max-w-[520px] touch-none rounded-xl bg-[#30306b] [background-origin:border-box]"
        pressBehavior="nearest"
        dragBehavior="relative"
      >
        <MeshCanvas points={points} flow={flow} grain={grain} />
        {showPoints &&
          points.map((point, index) => (
            <PlaneThumb
              aria-label={`Color ${index + 1} mesh point`}
              className="size-5 border-2 border-white/90 shadow-[0_1px_8px_#0006] data-[dragging]:cursor-grabbing"
              getAriaValueText={(value) =>
                `${Math.round(value.x * 100)}% from the left, ${Math.round(value.y * 100)}% from the bottom`
              }
              key={index}
              onValueChange={(value) => updatePoint(index, { value })}
              onPointerDown={() => setActiveIndex(index)}
              onFocusCapture={() => setActiveIndex(index)}
              style={{
                backgroundColor: point.color,
                outline: index === activeIndex ? '1px solid #fff9' : 'none',
                outlineOffset: '3px',
              }}
              thumbId={`mesh-${index + 1}`}
              value={point.value}
              xAriaLabel={`Color ${index + 1} mesh point horizontal position`}
              yAriaLabel={`Color ${index + 1} mesh point vertical position`}
            />
          ))}
      </Plane>
      <div className="flex w-full max-w-[520px] flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="flex items-center gap-1"
            role="group"
            aria-label="Mesh colors"
          >
            {points.map((point, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Select color ${index + 1}`}
                aria-pressed={activeIndex === index}
                onClick={() => setActiveIndex(index)}
                className="flex size-8 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              >
                <span
                  className="size-5 rounded-full border border-white/20"
                  style={{
                    backgroundColor: point.color,
                    outline: activeIndex === index ? '1px solid #fff9' : 'none',
                    outlineOffset: '3px',
                  }}
                />
              </button>
            ))}
          </div>
          <label className="relative flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-white/80 focus-within:ring-2 focus-within:ring-white/80">
            <span
              aria-hidden="true"
              className="size-3 rounded-sm"
              style={{ backgroundColor: activePoint.color }}
            />
            {activePoint.color.toUpperCase()}
            <input
              type="color"
              aria-label="Selected point color"
              value={activePoint.color}
              onChange={(event) =>
                updatePoint(activeIndex, { color: event.target.value })
              }
              className="absolute inset-0 size-full cursor-pointer opacity-0"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-6 max-sm:gap-4">
          <label className="flex min-w-0 flex-col gap-2 text-[11px] text-white/65">
            <span className="flex justify-between">
              Flow{' '}
              <span className="tabular-nums text-white/40">
                {Math.round(flow * 100)}
              </span>
            </span>
            <input
              aria-label="Flow"
              type="range"
              min="0"
              max="100"
              value={Math.round(flow * 100)}
              onChange={(event) => setFlow(Number(event.target.value) / 100)}
              className="h-1 w-full cursor-pointer accent-[#ccc4f5]"
            />
          </label>
          <label className="flex min-w-0 flex-col gap-2 text-[11px] text-white/65">
            <span className="flex justify-between">
              Grain{' '}
              <span className="tabular-nums text-white/40">
                {Math.round(grain * 100)}
              </span>
            </span>
            <input
              aria-label="Grain"
              type="range"
              min="0"
              max="100"
              value={Math.round(grain * 100)}
              onChange={(event) => setGrain(Number(event.target.value) / 100)}
              className="h-1 w-full cursor-pointer accent-[#ccc4f5]"
            />
          </label>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-3">
          <output className="text-[11px] tabular-nums text-white/55">
            Color {activeIndex + 1} · {Math.round(activePoint.value.x * 100)}% /{' '}
            {Math.round(activePoint.value.y * 100)}%
          </output>
          <button
            type="button"
            onClick={() => reset(paletteIndex)}
            className="rounded px-1 py-1 text-[11px] text-white/50 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-white/80"
          >
            Reset mesh
          </button>
        </div>
        <p className="m-0 text-xs leading-5 text-white/45">
          Drag a point to shape the color flow. Select a swatch to edit its
          color.
        </p>
      </div>
    </div>
  );
}
