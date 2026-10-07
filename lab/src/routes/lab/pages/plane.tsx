import { useEffect, useMemo, useRef, useState } from 'react';
import {
  NumberConfigField,
  PANEL_TWO_COLUMN_GRID_CLASS,
  PanelSection,
  Plane,
  PlaneThumb,
  SegmentedField,
  ToggleField,
  type PlaneValue,
} from '../shared.js';
import {
  springMotion,
  type PlaneAxisLock,
  type PlaneSnapHit,
  type PlaneSnapTarget,
} from '@pbroom/control-kit';
import { createActiveLabPage } from '../create-active-lab-page.js';
import type { LabPageDescriptor } from '../types.js';

const INITIAL_VALUE: PlaneValue = { x: 0.5, y: 0.5 };

type AxisLockOption = 'none' | PlaneAxisLock;
type SnapTransitionOption = 'none' | 'css' | 'spring';

// Faint magnetic guides shown when "Snap guides" is on.
const GUIDE_TARGETS: readonly PlaneSnapTarget[] = [
  { type: 'point', x: 0.25, y: 0.75, id: 'upper-left' },
  { type: 'point', x: 0.75, y: 0.25, id: 'lower-right' },
  { type: 'line', axis: 'x', at: 0.5 },
  { type: 'line', axis: 'y', at: 0.5 },
];

function formatPosition(value: PlaneValue) {
  return `${Math.round(value.x * 100)}% horizontal, ${Math.round(value.y * 100)}% vertical`;
}

function describeSnap(hit: PlaneSnapHit | null) {
  if (!hit) return 'Free';
  const { target } = hit;
  const axes = hit.axes.join('');
  if (hit.parts) return `${hit.parts.length} targets · ${axes}`;
  if (target.type === 'point')
    return `Point ${target.id ?? hit.index} · ${axes}`;
  if (target.type === 'line')
    return `Line ${target.axis}=${target.at} · ${axes}`;
  return `${target.type[0].toUpperCase()}${target.type.slice(1)} · ${axes}`;
}

function usePlaneLabPageController() {
  const [value, setValue] = useState(INITIAL_VALUE);
  const [disabled, setDisabled] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [gridX, setGridX] = useState(0);
  const [gridY, setGridY] = useState(0);
  const [guides, setGuides] = useState(false);
  const [axisLock, setAxisLock] = useState<AxisLockOption>('none');
  const [relativeDrag, setRelativeDrag] = useState(false);
  const [snapTransition, setSnapTransition] =
    useState<SnapTransitionOption>('none');

  return {
    axisLock,
    disabled,
    gridX,
    gridY,
    guides,
    readOnly,
    relativeDrag,
    setAxisLock,
    setDisabled,
    setGridX,
    setGridY,
    setGuides,
    setReadOnly,
    setRelativeDrag,
    setSnapTransition,
    setValue,
    snapTransition,
    value,
  };
}

type PlaneLabPageController = ReturnType<typeof usePlaneLabPageController>;

function PlaneGuides({ active: activeSet }: { active: ReadonlySet<number> }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {GUIDE_TARGETS.map((target, index) => {
        const active = activeSet.has(index);
        const tone = active ? 'bg-sky-400/80' : 'bg-white/15';
        if (target.type === 'line') {
          return (
            <span
              key={index}
              data-plane-guide={index}
              data-active={active || undefined}
              className={`absolute ${tone} ${
                target.axis === 'x'
                  ? 'inset-y-0 w-px -translate-x-1/2'
                  : 'inset-x-0 h-px -translate-y-1/2'
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
            data-plane-guide={index}
            data-active={active || undefined}
            className={`absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${tone}`}
            style={{
              left: `${target.x * 100}%`,
              top: `${(1 - target.y) * 100}%`,
            }}
          />
        );
      })}
    </div>
  );
}

function PlanePreview({ controller }: { controller: PlaneLabPageController }) {
  const [value, setValue] = useState(controller.value);
  const [snapHit, setSnapHit] = useState<PlaneSnapHit | null>(null);
  const { gridX, gridY, guides, snapTransition } = controller;

  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    const local = valueRef.current;
    // Edits from the properties panel are not snapped.
    if (local.x !== controller.value.x || local.y !== controller.value.y) {
      setSnapHit(null);
    }
    setValue(controller.value);
  }, [controller.value]);

  const snap = useMemo<PlaneSnapTarget[] | undefined>(() => {
    const targets: PlaneSnapTarget[] = [];
    if (gridX > 0 || gridY > 0) {
      targets.push({
        type: 'grid',
        x: gridX > 0 ? gridX : undefined,
        y: gridY > 0 ? gridY : undefined,
      });
    }
    if (guides) targets.push(...GUIDE_TARGETS);
    return targets.length > 0 ? targets : undefined;
  }, [gridX, gridY, guides]);
  const guideOffset = gridX > 0 || gridY > 0 ? 1 : 0;
  // Perpendicular lines can apply together; highlight every applied guide.
  const activeGuides = new Set(
    snapHit && guides
      ? (snapHit.parts ?? [snapHit])
          .filter((part) => part.target.type !== 'grid')
          .map((part) => part.index - guideOffset)
      : [],
  );
  const motion = useMemo(
    () => (snapTransition === 'spring' ? springMotion() : undefined),
    [snapTransition],
  );
  const snapping = snap !== undefined || controller.axisLock !== 'none';

  return (
    <div className="flex flex-col items-center gap-4 max-[520px]:translate-x-[70px]">
      <Plane
        data-testid="plane-demo"
        aria-label="Normalized position"
        className="size-[300px] overflow-hidden rounded-2xl border border-white/10 bg-[#151516] max-[520px]:size-[220px]"
        disabled={controller.disabled}
        readOnly={controller.readOnly}
        dragBehavior={controller.relativeDrag ? 'relative' : 'absolute'}
      >
        {guides ? <PlaneGuides active={activeGuides} /> : null}
        <PlaneThumb
          data-testid="plane-demo-thumb"
          value={value}
          onValueChange={(next, details) => {
            setValue(next);
            setSnapHit(details.snap ?? null);
          }}
          onValueCommitted={controller.setValue}
          step={0.01}
          largeStep={0.1}
          snap={snap}
          axisLock={
            controller.axisLock === 'none' ? undefined : controller.axisLock
          }
          motion={motion}
          xAriaLabel="Horizontal position"
          yAriaLabel="Vertical position"
          getAriaValueText={formatPosition}
          className={`size-6 border-white/30 bg-white shadow-none data-[snapped]:border-sky-400 ${
            snapTransition === 'css'
              ? 'data-[snap-transition]:transition-[left,top] data-[snap-transition]:duration-[120ms] data-[snap-transition]:ease-out'
              : ''
          }`}
        >
          <span
            aria-hidden="true"
            className="size-3 rounded-full bg-[#171717]"
          />
        </PlaneThumb>
      </Plane>
      <div
        data-testid="plane-demo-readout"
        className="rounded-full border border-white/8 bg-white/[0.035] px-4 py-2 font-mono text-[11px] text-white/55"
      >
        X {value.x.toFixed(2)} · Y {value.y.toFixed(2)}
      </div>
      {snapping ? (
        <div
          data-testid="plane-demo-snap"
          className="font-mono text-[11px] text-white/45"
        >
          {describeSnap(snapHit)}
        </div>
      ) : null}
    </div>
  );
}

function PlaneProperties({
  controller,
}: {
  controller: PlaneLabPageController;
}) {
  return (
    <PanelSection
      title="Plane"
      description="Move a normalized 2D position with pointer or keyboard input."
    >
      <div className="space-y-4">
        <div className={PANEL_TWO_COLUMN_GRID_CLASS}>
          <NumberConfigField
            label="X position"
            value={controller.value.x}
            onChange={(x) => controller.setValue({ ...controller.value, x })}
            min={0}
            max={1}
            step={0.01}
            precision={2}
          />
          <NumberConfigField
            label="Y position"
            value={controller.value.y}
            onChange={(y) => controller.setValue({ ...controller.value, y })}
            min={0}
            max={1}
            step={0.01}
            precision={2}
          />
        </div>
        <div className="space-y-2">
          <ToggleField
            label="Read only"
            checked={controller.readOnly}
            onChange={controller.setReadOnly}
          />
          <ToggleField
            label="Disabled"
            checked={controller.disabled}
            onChange={controller.setDisabled}
          />
        </div>
        <div className="space-y-4 border-t border-white/8 pt-4">
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
              Snapping
            </p>
            <p
              data-testid="plane-demo-bypass-hint"
              className="text-[12px] text-white/45"
            >
              Grid steps quantize; guides are magnetic within 8px. Hold Alt
              while dragging to bypass snapping.
            </p>
          </div>
          <div className={PANEL_TWO_COLUMN_GRID_CLASS}>
            <NumberConfigField
              label="Grid X"
              value={controller.gridX}
              onChange={controller.setGridX}
              min={0}
              max={1}
              step={0.05}
              precision={2}
            />
            <NumberConfigField
              label="Grid Y"
              value={controller.gridY}
              onChange={controller.setGridY}
              min={0}
              max={1}
              step={0.05}
              precision={2}
            />
          </div>
          <SegmentedField<AxisLockOption>
            label="Axis lock"
            value={controller.axisLock}
            onChange={controller.setAxisLock}
            options={[
              { value: 'none', label: 'None' },
              { value: 'x', label: 'X' },
              { value: 'y', label: 'Y' },
              {
                value: 'dominant-with-shift',
                label: 'Shift',
                tooltip: 'Hold Shift while dragging to lock the dominant axis',
              },
            ]}
          />
          <SegmentedField<SnapTransitionOption>
            label="Snap transition"
            value={controller.snapTransition}
            onChange={controller.setSnapTransition}
            options={[
              { value: 'none', label: 'None' },
              { value: 'css', label: 'CSS', tooltip: '120ms on snap changes' },
              { value: 'spring', label: 'Spring' },
            ]}
          />
          <div className="space-y-2">
            <ToggleField
              label="Snap guides"
              checked={controller.guides}
              onChange={controller.setGuides}
            />
            <ToggleField
              label="Relative drag"
              checked={controller.relativeDrag}
              onChange={controller.setRelativeDrag}
            />
          </div>
        </div>
      </div>
    </PanelSection>
  );
}

export const planeLabPage: LabPageDescriptor<'plane', PlaneLabPageController> =
  {
    key: 'plane',
    label: 'Plane',
    useController: usePlaneLabPageController,
    renderPreview: (controller) => <PlanePreview controller={controller} />,
    renderProperties: (controller) => (
      <PlaneProperties controller={controller} />
    ),
  };

export type { PlaneLabPageController };

export const PlaneLabActivePage = createActiveLabPage(planeLabPage);
