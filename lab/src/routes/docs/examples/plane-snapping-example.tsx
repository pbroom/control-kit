import { useMemo, useState } from 'react';
import {
  Checkbox,
  ControlInput,
  Plane,
  PlaneThumb,
  ToggleGroup,
  ToggleGroupItem,
  springMotion,
  type PlaneAxisLock,
  type PlaneSnapHit,
  type PlaneSnapTarget,
  type PlaneValue,
} from '@pbroom/control-kit';

const guides: PlaneSnapTarget[] = [
  { type: 'line', axis: 'x', at: 0.5 },
  { type: 'line', axis: 'y', at: 0.5 },
  { type: 'point', x: 0.25, y: 0.75, id: 'A' },
  { type: 'point', x: 0.75, y: 0.25, id: 'B' },
];

function gridLines(size: number | null) {
  if (!size || size <= 0) return [];
  const lines: number[] = [];
  for (let at = size; at < 1 - 1e-9; at += size) lines.push(at);
  return lines;
}

function describeSnap(hit: PlaneSnapHit | undefined) {
  if (!hit) return 'free';
  return (hit.parts ?? [hit])
    .map(({ target, axes }) => {
      const name =
        target.type === 'point'
          ? `point ${target.id}`
          : target.type === 'line'
            ? `line ${target.axis}=${target.at}`
            : target.type;
      return `${name} (${axes.join('')})`;
    })
    .join(' + ');
}

export function PlaneSnappingExample() {
  // Memoized so every render shares one motion.
  const spring = useMemo(() => springMotion(), []);
  const [value, setValue] = useState<PlaneValue>({ x: 0.4, y: 0.6 });
  const [hit, setHit] = useState<PlaneSnapHit | undefined>();
  const [gridOn, setGridOn] = useState(true);
  const [gridX, setGridX] = useState<number | null>(0.125);
  const [gridY, setGridY] = useState<number | null>(0.125);
  const [axisLock, setAxisLock] = useState<string | null>('none');
  const [transition, setTransition] = useState<string | null>('css');

  const gx = gridOn && gridX && gridX > 0 ? gridX : undefined;
  const gy = gridOn && gridY && gridY > 0 ? gridY : undefined;
  const snap = useMemo<PlaneSnapTarget[]>(
    () => (gx || gy ? [...guides, { type: 'grid', x: gx, y: gy }] : guides),
    [gx, gy],
  );
  const active = new Set(
    (hit ? (hit.parts ?? [hit]) : []).map((part) => part.index),
  );

  return (
    <div className="flex min-h-[520px] flex-col items-center justify-center gap-5 p-8 max-sm:p-5">
      <Plane
        aria-label="Snapping position"
        className="relative size-[300px] rounded-2xl border border-white/10 bg-[#171718] max-sm:size-[240px]"
      >
        {/* Decorations are clipped in an inner layer; the thumb never is. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
        >
          {gridLines(gx ?? null).map((at) => (
            <span
              key={`gx${at}`}
              className="absolute inset-y-0 w-px bg-white/[0.06]"
              style={{ left: `${at * 100}%` }}
            />
          ))}
          {gridLines(gy ?? null).map((at) => (
            <span
              key={`gy${at}`}
              className="absolute inset-x-0 h-px bg-white/[0.06]"
              style={{ top: `${(1 - at) * 100}%` }}
            />
          ))}
          {guides.map((target, index) => {
            const tone = active.has(index) ? 'bg-sky-400' : 'bg-white/25';
            if (target.type === 'line') {
              return (
                <span
                  key={index}
                  data-snap-guide={index}
                  data-active={active.has(index) || undefined}
                  className={`absolute ${tone} ${
                    target.axis === 'x' ? 'inset-y-0 w-px' : 'inset-x-0 h-px'
                  }`}
                  style={
                    target.axis === 'x'
                      ? { left: `${target.at * 100}%` }
                      : { top: `${(1 - target.at) * 100}%` }
                  }
                />
              );
            }
            if (target.type !== 'point') return null;
            return (
              <span
                key={index}
                data-snap-guide={index}
                data-active={active.has(index) || undefined}
                className={`absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${tone}`}
                style={{
                  left: `${target.x * 100}%`,
                  top: `${(1 - target.y) * 100}%`,
                }}
              />
            );
          })}
        </div>
        <PlaneThumb
          aria-label="Snapped point"
          value={value}
          onValueChange={setValue}
          // Fires on every snap change, even when the value is unchanged.
          onSnapChange={setHit}
          snap={snap}
          axisLock={
            axisLock === 'none' || !axisLock
              ? undefined
              : (axisLock as PlaneAxisLock)
          }
          motion={transition === 'spring' ? spring : undefined}
          // Transition only the axes a snap made jump; the axis following
          // the pointer is never eased.
          className={`size-5 border-white/30 bg-white shadow-none data-[snapped]:border-sky-400 ${
            transition === 'css'
              ? 'data-[snap-transition]:duration-[120ms] data-[snap-transition]:ease-out data-[snap-transition=x]:transition-[left] data-[snap-transition=y]:transition-[top] data-[snap-transition=x_y]:transition-[left,top]'
              : ''
          }`}
        />
      </Plane>
      <output
        data-snapping-readout
        className="font-mono text-[11px] text-white/55"
      >
        X {value.x.toFixed(3)} · Y {value.y.toFixed(3)} · {describeSnap(hit)}
      </output>
      <div className="flex w-full max-w-[340px] flex-col gap-3 text-[11px] text-white/55">
        <div className="flex items-center gap-2">
          <Checkbox checked={gridOn} onCheckedChange={setGridOn}>
            Grid
          </Checkbox>
          <ControlInput
            label="Grid X"
            handle="X"
            size="sm"
            min={0}
            max={1}
            step={0.025}
            precision={3}
            value={gridX}
            onValueChange={setGridX}
            disabled={!gridOn}
          />
          <ControlInput
            label="Grid Y"
            handle="Y"
            size="sm"
            min={0}
            max={1}
            step={0.025}
            precision={3}
            value={gridY}
            onValueChange={setGridY}
            disabled={!gridOn}
          />
        </div>
        <ToggleGroup
          aria-label="Axis lock"
          value={axisLock}
          onValueChange={(next) => next && setAxisLock(next)}
        >
          <ToggleGroupItem value="none">Free</ToggleGroupItem>
          <ToggleGroupItem value="x">X only</ToggleGroupItem>
          <ToggleGroupItem value="y">Y only</ToggleGroupItem>
          <ToggleGroupItem value="dominant-with-shift">Shift</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup
          aria-label="Snap transition"
          value={transition}
          onValueChange={(next) => next && setTransition(next)}
        >
          <ToggleGroupItem value="none">Instant</ToggleGroupItem>
          <ToggleGroupItem value="css">CSS</ToggleGroupItem>
          <ToggleGroupItem value="spring">Spring</ToggleGroupItem>
        </ToggleGroup>
        <p>Hold Alt/Option while dragging to bypass snapping.</p>
      </div>
    </div>
  );
}
