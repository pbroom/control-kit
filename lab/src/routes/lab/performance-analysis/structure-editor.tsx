import { useEffect, useRef, type ReactNode } from 'react';
import {
  Checkbox,
  ControlField,
  Plane,
  PlaneThumb,
  ToggleGroup,
  ToggleGroupItem,
  type PlaneValue,
} from '@pbroom/control-kit';
import {
  changeStructureFrame,
  changeStructureFraming,
  changeStructureLayer,
  readStructureEditorParams,
  resetStructureDemo,
  selectStructureLayer,
  useStructureEditorState,
} from './structure-editor-store.js';
import { structureOverrideDemo } from './structure-overrides.js';
import {
  STRUCTURE_OFFSET_LIMIT,
  STRUCTURE_ZOOM_MAX,
  STRUCTURE_ZOOM_MIN,
  type StructureOverrideMode,
} from './structure-overrides-schema.js';

/*
 * Dev-only "Structure" section of the lab's properties panel: edits
 * `lab/structure-overrides.json` for the active demo with the library's own
 * primitives — a Plane for pan / layer position, ControlFields for exact
 * numbers, ToggleGroups for auto/manual. Shares the selected layer with the
 * Structure tab through the editor store.
 */

// Same type scale and segmented-control look as the other property fields.
const FIELD_LABEL_CLASS =
  'block text-[11px] font-medium uppercase tracking-[0.14em] text-white/45';
const SEGMENTED_GROUP_CLASS =
  'box-border flex h-6 min-h-6 w-full min-w-0 max-w-full justify-start gap-0 overflow-hidden rounded-[5px] border-0 bg-[#383838] p-0 shadow-none';
const SEGMENTED_ITEM_CLASS =
  'h-full min-h-0 w-full min-w-0 flex-1 rounded-[5px] border border-transparent px-2 py-0 text-[11px] font-medium leading-4 tracking-[0.005em] text-white/50 transition-[background-color,color] hover:text-white/70 focus-visible:ring-2 focus-visible:ring-[#0d99ff]/80 data-[pressed]:border-[#4C4C4C] data-[pressed]:bg-[var(--ck-lab-segmented-active-bg,#171717)] data-[pressed]:text-white/90';
const CHIP_CLASS =
  'h-6 rounded-[5px] border px-2 text-[11px] font-medium leading-4 transition-colors';

/** Drag and keyboard sensitivity of the pan and layer pads. */
const STRUCTURE_PAD_SENSITIVITY = 0.5;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="w-full min-w-0 max-w-full space-y-2">
      <span className={FIELD_LABEL_CLASS}>{label}</span>
      {children}
    </div>
  );
}

function ModeToggle({
  label,
  onChange,
  testId,
  value,
}: {
  label: string;
  onChange: (mode: StructureOverrideMode) => void;
  testId: string;
  value: StructureOverrideMode;
}) {
  return (
    <ToggleGroup
      aria-label={label}
      className={SEGMENTED_GROUP_CLASS}
      data-testid={testId}
      onValueChange={(next) => {
        if (next === 'auto' || next === 'manual') onChange(next);
      }}
      type="single"
      value={value}
    >
      <ToggleGroupItem className={SEGMENTED_ITEM_CLASS} value="auto">
        Auto
      </ToggleGroupItem>
      <ToggleGroupItem className={SEGMENTED_ITEM_CLASS} value="manual">
        Manual
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

function NumberField({
  ariaLabel,
  handle,
  max,
  min,
  onChange,
  precision = 0,
  step,
  testId,
  value,
}: {
  ariaLabel: string;
  handle: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  precision?: number;
  step: number;
  testId: string;
  value: number;
}) {
  return (
    <ControlField.Root
      className="w-full min-w-0"
      data-testid={testId}
      format={{ maximumFractionDigits: precision }}
      max={max}
      min={min}
      onValueChange={(next) => {
        if (next !== null && Number.isFinite(next)) onChange(next);
      }}
      step={step}
      value={value}
    >
      <ControlField.Group>
        <ControlField.ScrubArea>
          <span aria-hidden="true">{handle}</span>
        </ControlField.ScrubArea>
        <ControlField.Input aria-label={ariaLabel} />
      </ControlField.Group>
    </ControlField.Root>
  );
}

function XYPad({
  label,
  onChange,
  testId,
  value,
}: {
  label: string;
  onChange: (value: PlaneValue) => void;
  testId: string;
  value: PlaneValue;
}) {
  return (
    <Plane
      aria-label={label}
      // Half speed: a drag moves the thumb half as far as the pointer, from
      // where it was grabbed, for finer placement.
      dragBehavior="relative"
      dragSensitivity={STRUCTURE_PAD_SENSITIVITY}
      className="size-[104px] shrink-0 overflow-hidden rounded-[5px] border border-white/10 bg-[#151516] bg-[linear-gradient(to_right,transparent_calc(50%-0.5px),rgba(255,255,255,0.08)_calc(50%-0.5px),rgba(255,255,255,0.08)_calc(50%+0.5px),transparent_calc(50%+0.5px)),linear-gradient(to_bottom,transparent_calc(50%-0.5px),rgba(255,255,255,0.08)_calc(50%-0.5px),rgba(255,255,255,0.08)_calc(50%+0.5px),transparent_calc(50%+0.5px))]"
      data-testid={testId}
    >
      <PlaneThumb
        className="size-3 border-white/30 bg-white shadow-none"
        largeStep={0.1 * STRUCTURE_PAD_SENSITIVITY}
        onValueChange={onChange}
        step={0.01 * STRUCTURE_PAD_SENSITIVITY}
        value={value}
        xAriaLabel={`${label} horizontal`}
        yAriaLabel={`${label} vertical`}
      />
    </Plane>
  );
}

export function StructurePropertiesSection({ pageKey }: { pageKey: string }) {
  const { overrides, rootSizes, saveState, selectedLayerId } =
    useStructureEditorState();
  const sectionRef = useRef<HTMLElement | null>(null);
  const demo = overrides.demos[pageKey];
  const nodes = structureOverrideDemo(pageKey)?.nodes ?? [];

  // `?structureEdit=1` brings this section into view.
  useEffect(() => {
    if (readStructureEditorParams().edit) {
      sectionRef.current?.scrollIntoView({ block: 'start' });
    }
  }, []);

  if (!demo) return null;

  const framing = demo.framing;
  const layerId =
    selectedLayerId && demo.layers[selectedLayerId]
      ? selectedLayerId
      : (nodes[0]?.id ?? null);
  const layer = layerId ? demo.layers[layerId] : undefined;
  const rootSize = rootSizes[pageKey] ?? { height: 0, width: 0 };
  // The layer pad spans ±(the root's larger side), so a part can be pulled
  // clear of the root in any direction.
  const range = Math.max(24, rootSize.width, rootSize.height);

  return (
    <section
      className="w-full min-w-0 max-w-full scroll-mt-4 space-y-3 overflow-x-hidden"
      data-testid="lab-primitive-structure-editor"
      ref={sectionRef}
    >
      <div className="typeset typeset-lab w-full min-w-0 max-w-full">
        <h2>Structure</h2>
        <p>
          Framing and layer placement for the Structure tab. Saved to
          lab/structure-overrides.json.
        </p>
      </div>

      <Checkbox
        checked={demo.frame}
        data-testid="lab-primitive-structure-frame-toggle"
        onCheckedChange={(checked) =>
          changeStructureFrame(pageKey, checked === true)
        }
      >
        Render frame
      </Checkbox>

      <Field label="Framing">
        <ModeToggle
          label="Framing mode"
          onChange={(mode) => changeStructureFraming(pageKey, { mode })}
          testId="lab-primitive-structure-framing-mode"
          value={framing.mode}
        />
        <div className="flex gap-2">
          <XYPad
            label="Pan"
            onChange={(value) =>
              changeStructureFraming(pageKey, {
                mode: 'manual',
                panX: Number((value.x - 0.5).toFixed(3)),
                panY: Number((0.5 - value.y).toFixed(3)),
              })
            }
            testId="lab-primitive-structure-framing-pan"
            value={{
              x: clamp(framing.panX + 0.5, 0, 1),
              y: clamp(0.5 - framing.panY, 0, 1),
            }}
          />
          <div className="min-w-0 flex-1 space-y-2">
            <span className={FIELD_LABEL_CLASS}>Zoom</span>
            <NumberField
              ariaLabel="Zoom"
              handle="×"
              max={STRUCTURE_ZOOM_MAX}
              min={STRUCTURE_ZOOM_MIN}
              onChange={(zoom) =>
                changeStructureFraming(pageKey, { mode: 'manual', zoom })
              }
              precision={2}
              step={0.05}
              testId="lab-primitive-structure-framing-zoom"
              value={framing.zoom}
            />
            <p className="text-[11px] leading-4 text-white/35">
              Pan {Math.round(framing.panX * 100)}%,{' '}
              {Math.round(framing.panY * 100)}%
            </p>
          </div>
        </div>
      </Field>

      <Field label="Layer">
        <div
          className="flex flex-wrap gap-1"
          data-testid="lab-primitive-structure-editor-layers"
        >
          {nodes.map((node) => (
            <button
              aria-pressed={node.id === layerId}
              className={[
                CHIP_CLASS,
                node.id === layerId
                  ? 'border-[#4C4C4C] bg-[var(--ck-lab-segmented-active-bg,#171717)] text-white/90'
                  : 'border-transparent bg-[#383838] text-white/50 hover:text-white/70',
              ].join(' ')}
              data-structure-editor-layer={node.id}
              data-structure-editor-layer-mode={demo.layers[node.id]?.mode}
              key={node.id}
              onClick={() => selectStructureLayer(node.id)}
              type="button"
            >
              {node.label}
              {demo.layers[node.id]?.mode === 'manual' ? ' •' : ''}
            </button>
          ))}
        </div>
        {layer && layerId ? (
          <>
            <ModeToggle
              label={`${layer.label} placement mode`}
              onChange={(mode) =>
                changeStructureLayer(pageKey, layerId, { mode })
              }
              testId="lab-primitive-structure-layer-mode"
              value={layer.mode}
            />
            <div className="flex gap-2">
              <XYPad
                label={`${layer.label} position`}
                onChange={(value) =>
                  changeStructureLayer(pageKey, layerId, {
                    mode: 'manual',
                    x: Math.round((value.x - 0.5) * 2 * range),
                    z: Math.round((0.5 - value.y) * 2 * range),
                  })
                }
                testId="lab-primitive-structure-layer-pad"
                value={{
                  x: clamp(layer.x / (2 * range) + 0.5, 0, 1),
                  y: clamp(0.5 - layer.z / (2 * range), 0, 1),
                }}
              />
              <div className="min-w-0 flex-1 space-y-2">
                <NumberField
                  ariaLabel={`${layer.label} x offset`}
                  handle="X"
                  max={STRUCTURE_OFFSET_LIMIT}
                  min={-STRUCTURE_OFFSET_LIMIT}
                  onChange={(x) =>
                    changeStructureLayer(pageKey, layerId, {
                      mode: 'manual',
                      x: Math.round(x),
                    })
                  }
                  step={1}
                  testId="lab-primitive-structure-layer-x"
                  value={layer.x}
                />
                <NumberField
                  ariaLabel={`${layer.label} z offset`}
                  handle="Z"
                  max={STRUCTURE_OFFSET_LIMIT}
                  min={-STRUCTURE_OFFSET_LIMIT}
                  onChange={(z) =>
                    changeStructureLayer(pageKey, layerId, {
                      mode: 'manual',
                      z: Math.round(z),
                    })
                  }
                  step={1}
                  testId="lab-primitive-structure-layer-z"
                  value={layer.z}
                />
                <p className="text-[11px] leading-4 text-white/35">
                  px from measured · pad ±{Math.round(range)}px
                </p>
              </div>
            </div>
          </>
        ) : null}
      </Field>

      <div className="flex items-center justify-between gap-2">
        <span
          className="min-w-0 truncate text-[11px] leading-4 text-white/45"
          data-testid="lab-primitive-structure-editor-status"
        >
          {saveState === 'saving'
            ? 'Saving…'
            : saveState === 'saved'
              ? 'Saved'
              : saveState === 'error'
                ? 'Save failed'
                : 'No unsaved changes'}
        </span>
        <button
          className="h-6 shrink-0 rounded-[5px] border border-white/10 px-2 text-[11px] font-medium text-white/70 hover:bg-white/5"
          data-testid="lab-primitive-structure-editor-reset"
          onClick={() => resetStructureDemo(pageKey)}
          type="button"
        >
          Reset demo
        </button>
      </div>
    </section>
  );
}
