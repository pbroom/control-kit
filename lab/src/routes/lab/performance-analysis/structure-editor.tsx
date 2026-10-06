import type { ReactNode } from 'react';
import {
  ControlField,
  Plane,
  PlaneThumb,
  ToggleGroup,
  ToggleGroupItem,
  type PlaneValue,
} from '@pbroom/control-kit';
import type { StructureOverrideNode } from './structure-overrides.js';
import {
  STRUCTURE_OFFSET_LIMIT,
  STRUCTURE_PAN_LIMIT,
  STRUCTURE_ZOOM_MAX,
  STRUCTURE_ZOOM_MIN,
  type StructureDemoOverride,
  type StructureFramingOverride,
  type StructureLayerOverride,
  type StructureOverrideMode,
} from './structure-overrides-schema.js';

/*
 * Dev-only editor for `lab/structure-overrides.json`, built from the
 * library's own primitives: a Plane for pan / layer position, ControlFields
 * for exact numbers, ToggleGroups for auto/manual.
 */

export type StructureEditorSaveState = 'idle' | 'saving' | 'saved' | 'error';

const SEGMENTED_GROUP_CLASS =
  'box-border flex h-6 w-full min-w-0 gap-0 overflow-hidden rounded-[5px] bg-[#383838] p-0';
const SEGMENTED_ITEM_CLASS =
  'h-full min-w-0 flex-1 rounded-[5px] border border-transparent px-2 text-[11px] font-medium text-white/50 hover:text-white/70 focus-visible:ring-2 focus-visible:ring-[#0d99ff]/80 data-[pressed]:border-[#4C4C4C] data-[pressed]:bg-[#171717] data-[pressed]:text-white/90';
const FIELD_LABEL_CLASS =
  'font-mono text-[10px] uppercase tracking-[0.08em] text-white/40';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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
  label,
  max,
  min,
  onChange,
  precision = 0,
  step,
  testId,
  value,
}: {
  label: string;
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
      max={max}
      min={min}
      onValueChange={(next) => {
        if (next !== null && Number.isFinite(next)) onChange(next);
      }}
      format={{ maximumFractionDigits: precision }}
      step={step}
      value={value}
    >
      <ControlField.Group>
        <ControlField.ScrubArea>
          <span aria-hidden="true">{label}</span>
        </ControlField.ScrubArea>
        <ControlField.Input aria-label={label} />
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
      className="size-[112px] shrink-0 overflow-hidden rounded-md border border-white/10 bg-[#151516] bg-[linear-gradient(to_right,transparent_calc(50%-0.5px),rgba(255,255,255,0.08)_calc(50%-0.5px),rgba(255,255,255,0.08)_calc(50%+0.5px),transparent_calc(50%+0.5px)),linear-gradient(to_bottom,transparent_calc(50%-0.5px),rgba(255,255,255,0.08)_calc(50%-0.5px),rgba(255,255,255,0.08)_calc(50%+0.5px),transparent_calc(50%+0.5px))]"
      data-testid={testId}
    >
      <PlaneThumb
        className="size-3.5 border-white/30 bg-white shadow-none"
        largeStep={0.1}
        onValueChange={onChange}
        step={0.01}
        value={value}
        xAriaLabel={`${label} horizontal`}
        yAriaLabel={`${label} vertical`}
      />
    </Plane>
  );
}

function Section({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="space-y-2">
      <h3 className={FIELD_LABEL_CLASS}>{title}</h3>
      {children}
    </section>
  );
}

export function StructureEditor({
  demo,
  nodes,
  onChangeFraming,
  onChangeLayer,
  onReset,
  onSelectLayer,
  rootSize,
  saveState,
  selectedLayerId,
}: {
  demo: StructureDemoOverride;
  nodes: readonly StructureOverrideNode[];
  onChangeFraming: (patch: Partial<StructureFramingOverride>) => void;
  onChangeLayer: (id: string, patch: Partial<StructureLayerOverride>) => void;
  onReset: () => void;
  onSelectLayer: (id: string) => void;
  rootSize: { height: number; width: number };
  saveState: StructureEditorSaveState;
  selectedLayerId: string | null;
}) {
  const framing = demo.framing;
  const layerId = selectedLayerId ?? nodes[0]?.id ?? null;
  const layer = layerId ? demo.layers[layerId] : undefined;
  // The layer pad spans ±(the root's larger side), so a part can be pulled
  // clear of the root in any direction.
  const range = Math.max(24, rootSize.width, rootSize.height);
  const layerPadValue = layer
    ? {
        x: clamp(layer.x / (2 * range) + 0.5, 0, 1),
        y: clamp(0.5 - layer.z / (2 * range), 0, 1),
      }
    : { x: 0.5, y: 0.5 };

  return (
    <div
      className="space-y-4 rounded-lg border border-white/8 bg-white/[0.02] p-3"
      data-testid="lab-primitive-structure-editor"
    >
      <div className="flex items-center justify-between gap-2">
        <span className={FIELD_LABEL_CLASS}>
          {saveState === 'saving'
            ? 'Saving…'
            : saveState === 'saved'
              ? 'Saved to lab/structure-overrides.json'
              : saveState === 'error'
                ? 'Save failed'
                : 'Edits save to lab/structure-overrides.json'}
        </span>
        <button
          className="h-6 rounded-[5px] border border-white/10 px-2 text-[11px] text-white/70 hover:bg-white/5"
          data-testid="lab-primitive-structure-editor-reset"
          onClick={onReset}
          type="button"
        >
          Reset demo
        </button>
      </div>

      <Section title="Framing">
        <ModeToggle
          label="Framing mode"
          onChange={(mode) => onChangeFraming({ mode })}
          testId="lab-primitive-structure-framing-mode"
          value={framing.mode}
        />
        <div className="flex gap-3">
          <XYPad
            label="Pan"
            onChange={(value) =>
              onChangeFraming({
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
            <NumberField
              label="Zoom"
              max={STRUCTURE_ZOOM_MAX}
              min={STRUCTURE_ZOOM_MIN}
              onChange={(zoom) => onChangeFraming({ mode: 'manual', zoom })}
              precision={2}
              step={0.05}
              testId="lab-primitive-structure-framing-zoom"
              value={framing.zoom}
            />
            <p className="text-[10px] leading-4 text-white/35">
              Pan {Math.round(framing.panX * 100)}%,{' '}
              {Math.round(framing.panY * 100)}% · ±
              {Math.round(STRUCTURE_PAN_LIMIT * 100)}%
            </p>
          </div>
        </div>
      </Section>

      <Section title="Layer">
        <div
          className="flex flex-wrap gap-1"
          data-testid="lab-primitive-structure-editor-layers"
        >
          {nodes.map((node) => (
            <button
              aria-pressed={node.id === layerId}
              className={[
                'h-6 rounded-[5px] border px-2 text-[11px]',
                node.id === layerId
                  ? 'border-[#4ba3ff]/70 text-white/90'
                  : 'border-white/10 text-white/50 hover:text-white/70',
                demo.layers[node.id]?.mode === 'manual' ? 'italic' : '',
              ].join(' ')}
              data-structure-editor-layer={node.id}
              key={node.id}
              onClick={() => onSelectLayer(node.id)}
              type="button"
            >
              {node.label}
            </button>
          ))}
        </div>
        {layer && layerId ? (
          <>
            <ModeToggle
              label={`${layer.label} placement mode`}
              onChange={(mode) => onChangeLayer(layerId, { mode })}
              testId="lab-primitive-structure-layer-mode"
              value={layer.mode}
            />
            <div className="flex gap-3">
              <XYPad
                label={`${layer.label} position`}
                onChange={(value) =>
                  onChangeLayer(layerId, {
                    mode: 'manual',
                    x: Math.round((value.x - 0.5) * 2 * range),
                    z: Math.round((0.5 - value.y) * 2 * range),
                  })
                }
                testId="lab-primitive-structure-layer-pad"
                value={layerPadValue}
              />
              <div className="min-w-0 flex-1 space-y-2">
                <NumberField
                  label="X"
                  max={STRUCTURE_OFFSET_LIMIT}
                  min={-STRUCTURE_OFFSET_LIMIT}
                  onChange={(x) =>
                    onChangeLayer(layerId, { mode: 'manual', x: Math.round(x) })
                  }
                  step={1}
                  testId="lab-primitive-structure-layer-x"
                  value={layer.x}
                />
                <NumberField
                  label="Z"
                  max={STRUCTURE_OFFSET_LIMIT}
                  min={-STRUCTURE_OFFSET_LIMIT}
                  onChange={(z) =>
                    onChangeLayer(layerId, { mode: 'manual', z: Math.round(z) })
                  }
                  step={1}
                  testId="lab-primitive-structure-layer-z"
                  value={layer.z}
                />
                <p className="text-[10px] leading-4 text-white/35">
                  px from measured · pad ±{Math.round(range)}px
                </p>
              </div>
            </div>
          </>
        ) : null}
      </Section>
    </div>
  );
}
