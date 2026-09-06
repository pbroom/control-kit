import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from 'control-kit';

type CurvePoint = PlaneValue & { id: string };
type Channel = 'RGB' | 'Red' | 'Green' | 'Blue';
type Curves = Record<Channel, CurvePoint[]>;
const CHANNELS: Channel[] = ['RGB', 'Red', 'Green', 'Blue'];
const PHOTO_URL =
  'https://images.unsplash.com/photo-1771246918298-3795d3bb27a7?auto=format&fit=crop&w=768&h=768&q=85';
const PHOTO_SIZE = 512;
const POINT_GAP = 1 / 1024;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const initialPoints = (): CurvePoint[] => [
  { id: 'black', x: 0, y: 0 },
  { id: 'white', x: 1, y: 1 },
];
const initialCurves = (): Curves => ({
  RGB: initialPoints(),
  Red: initialPoints(),
  Green: initialPoints(),
  Blue: initialPoints(),
});

// Shape-preserving cubic Hermite interpolation keeps each segment between its
// handles. Outside the first and last handles, extend their output values.
export function createToneTable(points: PlaneValue[]): number[] {
  const widths = points.slice(1).map((point, i) => point.x - points[i].x);
  const slopes = widths.map(
    (width, i) => (points[i + 1].y - points[i].y) / width,
  );
  const tangents = points.map((_, i) => {
    if (i === 0) return slopes[0];
    if (i === points.length - 1) return slopes[i - 1];
    if (slopes[i - 1] * slopes[i] <= 0) return 0;
    const a = 2 * widths[i] + widths[i - 1];
    const b = widths[i] + 2 * widths[i - 1];
    return (a + b) / (a / slopes[i - 1] + b / slopes[i]);
  });
  return Array.from({ length: 256 }, (_, input) => {
    const x = input / 255;
    if (x <= points[0].x) return points[0].y;
    if (x >= points[points.length - 1].x) return points[points.length - 1].y;
    const i = points.findIndex((point, index) => index > 0 && point.x >= x) - 1;
    const t = (x - points[i].x) / widths[i];
    return clamp(
      (2 * t ** 3 - 3 * t ** 2 + 1) * points[i].y +
        (t ** 3 - 2 * t ** 2 + t) * widths[i] * tangents[i] +
        (-2 * t ** 3 + 3 * t ** 2) * points[i + 1].y +
        (t ** 3 - t ** 2) * widths[i] * tangents[i + 1],
    );
  });
}

export function applyToneTables(
  source: Uint8ClampedArray,
  output: Uint8ClampedArray,
  tables: Record<Channel, number[]>,
) {
  const lookups = CHANNELS.slice(1).map((channel) =>
    tables[channel].map((value) =>
      Math.round(tables.RGB[Math.round(value * 255)] * 255),
    ),
  );
  for (let i = 0; i < source.length; i += 4) {
    output[i] = lookups[0][source[i]];
    output[i + 1] = lookups[1][source[i + 1]];
    output[i + 2] = lookups[2][source[i + 2]];
    output[i + 3] = source[i + 3];
  }
}

export function sourceHistograms(
  pixels: Uint8ClampedArray,
): Record<Channel, number[]> {
  const bins = Object.fromEntries(
    CHANNELS.map((channel) => [channel, Array<number>(256).fill(0)]),
  ) as Record<Channel, number[]>;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] === 0) continue;
    bins.Red[pixels[i]]++;
    bins.Green[pixels[i + 1]]++;
    bins.Blue[pixels[i + 2]]++;
    // RGB shows the combined distribution of the three source channels.
    bins.RGB[pixels[i]]++;
    bins.RGB[pixels[i + 1]]++;
    bins.RGB[pixels[i + 2]]++;
  }
  return bins;
}

function curvePath(table: number[]) {
  return table
    .map((y, x) => `${x ? 'L' : 'M'}${(x / 255) * 100},${(1 - y) * 100}`)
    .join(' ');
}

function closestCurvePoint(
  table: number[],
  x: number,
  y: number,
  size: number,
) {
  let closest: PlaneValue | null = null;
  let distance = 10;
  for (let i = 0; i < 255; i++) {
    const ax = i / 255;
    const ay = table[i];
    const dx = 1 / 255;
    const dy = table[i + 1] - ay;
    const t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy));
    const point = { x: ax + t * dx, y: ay + t * dy };
    const nextDistance = Math.hypot(x - point.x, y - point.y) * size;
    if (nextDistance < distance) {
      closest = point;
      distance = nextDistance;
    }
  }
  return closest;
}

export function ColorCurvesExample() {
  const [curves, setCurves] = useState(initialCurves);
  const [channel, setChannel] = useState<Channel>('RGB');
  const [histograms, setHistograms] = useState<Record<
    Channel,
    number[]
  > | null>(null);
  const [photoState, setPhotoState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [focusId, setFocusId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState('black');
  const [retry, setRetry] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const planeRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<ImageData | null>(null);
  const outputRef = useRef<ImageData | null>(null);
  const nextId = useRef(0);
  const points = curves[channel];
  const tables = useMemo(
    () =>
      Object.fromEntries(
        CHANNELS.map((name) => [name, createToneTable(curves[name])]),
      ) as Record<Channel, number[]>,
    [curves],
  );
  const selected = points.find((point) => point.id === selectedId);
  const bins = histograms?.[channel];
  const histogram = useMemo(() => {
    if (!bins) return '';
    const peak = Math.max(...bins, 1);
    return `M0,100 ${bins.map((count, i) => `L${(i / 255) * 100},${100 - (count / peak) * 85}`).join(' ')} L100,100 Z`;
  }, [bins]);

  useEffect(() => {
    let cancelled = false;
    setPhotoState('loading');
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      if (cancelled) return;
      try {
        const context = canvasRef.current?.getContext('2d', {
          willReadFrequently: true,
        });
        if (!context) throw new Error('Canvas unavailable');
        const crop = Math.min(image.naturalWidth, image.naturalHeight);
        context.drawImage(
          image,
          (image.naturalWidth - crop) / 2,
          (image.naturalHeight - crop) / 2,
          crop,
          crop,
          0,
          0,
          PHOTO_SIZE,
          PHOTO_SIZE,
        );
        sourceRef.current = context.getImageData(0, 0, PHOTO_SIZE, PHOTO_SIZE);
        outputRef.current = context.createImageData(PHOTO_SIZE, PHOTO_SIZE);
        setHistograms(sourceHistograms(sourceRef.current.data));
        setPhotoState('ready');
      } catch {
        setPhotoState('error');
      }
    };
    image.onerror = () => {
      if (!cancelled) setPhotoState('error');
    };
    image.src = PHOTO_URL;
    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
    };
  }, [retry]);

  useEffect(() => {
    if (photoState !== 'ready') return;
    const frame = requestAnimationFrame(() => {
      const source = sourceRef.current;
      const output = outputRef.current;
      if (!source || !output) return;
      applyToneTables(source.data, output.data, tables);
      canvasRef.current?.getContext('2d')?.putImageData(output, 0, 0);
    });
    return () => cancelAnimationFrame(frame);
  }, [tables, photoState]);

  useLayoutEffect(() => {
    if (!focusId) return;
    planeRef.current
      ?.querySelector<HTMLElement>(`[data-thumb-id="${focusId}"] input`)
      ?.focus();
    setFocusId(null);
  }, [focusId]);

  function removePoint(id: string) {
    if (points.length <= 2) return;
    const index = points.findIndex((point) => point.id === id);
    const remaining = points.filter((point) => point.id !== id);
    const neighbor = remaining[Math.min(index, remaining.length - 1)].id;
    setCurves((current) => ({ ...current, [channel]: remaining }));
    setSelectedId(neighbor);
    setFocusId(neighbor);
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6 max-sm:p-4">
      <div className="grid w-full max-w-[600px] grid-cols-2 items-end gap-6 max-sm:max-w-[280px] max-sm:grid-cols-1">
        <div className="relative aspect-square w-full overflow-hidden rounded-[3px] bg-[#303030]">
          <canvas
            ref={canvasRef}
            width={PHOTO_SIZE}
            height={PHOTO_SIZE}
            role="img"
            aria-label="Portrait of an elderly man with the current color curves applied"
            data-photo-state={photoState}
            className="block size-full"
          />
          {photoState !== 'ready' && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#303030] p-4 text-center text-xs text-white/65"
              role="status"
            >
              {photoState === 'loading'
                ? 'Loading portrait…'
                : 'The portrait could not be loaded.'}
              {photoState === 'error' && (
                <button
                  type="button"
                  className="rounded border border-white/20 px-3 py-1.5 text-white"
                  onClick={() => setRetry((value) => value + 1)}
                >
                  Retry
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex w-full min-w-0 flex-col gap-4">
          <div className="flex h-8 items-center justify-between gap-3">
            <select
              aria-label="Curve channel"
              value={channel}
              onChange={(event) => {
                setChannel(event.target.value as Channel);
                setSelectedId('black');
              }}
              className="h-8 w-[138px] rounded-lg border-0 bg-[#454545] px-3 text-sm text-[#ededed] outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              {CHANNELS.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setCurves(initialCurves());
                setSelectedId('black');
              }}
              className="rounded px-1 py-1 text-xs text-white/55 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/70"
            >
              Reset
            </button>
          </div>
          <Plane
            ref={planeRef}
            aria-label="Color curves control"
            pressBehavior="none"
            className="aspect-square w-full rounded-[3px] bg-[#303030]"
            onPointerDown={(event) => {
              if (
                event.button !== 0 ||
                (event.target as Element).closest('[data-plane-thumb-key]')
              )
                return;
              const rect = event.currentTarget.getBoundingClientRect();
              const point = closestCurvePoint(
                tables[channel],
                (event.clientX - rect.left) / rect.width,
                1 - (event.clientY - rect.top) / rect.height,
                rect.width,
              );
              if (
                !point ||
                points.some(
                  (existing) => Math.abs(existing.x - point.x) < POINT_GAP,
                )
              )
                return;
              event.preventDefault();
              const id = `point-${nextId.current++}`;
              setCurves((current) => ({
                ...current,
                [channel]: [...current[channel], { ...point, id }].sort(
                  (a, b) => a.x - b.x,
                ),
              }));
              setSelectedId(id);
              setFocusId(id);
            }}
          >
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 size-full overflow-hidden rounded-[3px]"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <path d={histogram} fill="rgb(255 255 255 / 0.045)" />
              {[25, 50, 75].map((position) => (
                <path
                  key={position}
                  d={`M${position},0 V100 M0,${position} H100`}
                  stroke="rgb(255 255 255 / 0.13)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <path
                d={curvePath(tables[channel])}
                fill="none"
                stroke={
                  {
                    RGB: '#ccc',
                    Red: '#e58b8b',
                    Green: '#9dca9b',
                    Blue: '#98b5e7',
                  }[channel]
                }
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {points.map((point, index) => (
              <PlaneThumb
                key={`${channel}-${point.id}`}
                thumbId={point.id}
                value={point}
                className="size-3 border-0 bg-[#ccc] shadow-none"
                xAriaLabel={`Point ${index + 1} input tone`}
                yAriaLabel={`Point ${index + 1} output tone`}
                getAriaValueText={(value) =>
                  `${Math.round(value.x * 100)}% input, ${Math.round(value.y * 100)}% output`
                }
                onFocusCapture={() => setSelectedId(point.id)}
                onValueChange={(value) =>
                  setCurves((current) => ({
                    ...current,
                    [channel]: current[channel].map((item, i, all) =>
                      item.id === point.id
                        ? {
                            ...item,
                            x: Math.max(
                              i ? all[i - 1].x + POINT_GAP : 0,
                              Math.min(
                                i < all.length - 1
                                  ? all[i + 1].x - POINT_GAP
                                  : 1,
                                value.x,
                              ),
                            ),
                            y: clamp(value.y),
                          }
                        : item,
                    ),
                  }))
                }
                onPointerDown={(event) => {
                  if (event.metaKey || event.ctrlKey) {
                    event.preventDefault();
                    event.stopPropagation();
                    removePoint(point.id);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Delete' && event.key !== 'Backspace')
                    return;
                  event.preventDefault();
                  if (event.currentTarget.hasAttribute('data-focus-visible'))
                    removePoint(point.id);
                }}
              />
            ))}
          </Plane>
        </div>
      </div>
      <div className="flex flex-col items-center gap-1.5 text-center">
        <output className="font-mono text-[11px] text-white/65">
          {selected
            ? `Input ${Math.round(selected.x * 100)}% · Output ${Math.round(selected.y * 100)}%`
            : `${channel} curve`}
        </output>
        <p className="m-0 max-w-[420px] text-xs leading-5 text-white/42">
          Click the curve to add a point. Drag to adjust. ⌘/Ctrl-click to
          remove, or press Delete / Backspace with a handle visibly focused.
        </p>
        <p className="m-0 text-[10px] text-white/35">
          Photo by{' '}
          <a
            className="underline underline-offset-2 hover:text-white/70"
            href="https://unsplash.com/@ucaremre35"
            target="_blank"
            rel="noreferrer"
          >
            Emre Ucar
          </a>{' '}
          on{' '}
          <a
            className="underline underline-offset-2 hover:text-white/70"
            href="https://unsplash.com/photos/an-elderly-man-with-wrinkled-face-and-gray-hair-eZ8CGBq7-W8"
            target="_blank"
            rel="noreferrer"
          >
            Unsplash
          </a>
        </p>
      </div>
    </div>
  );
}
