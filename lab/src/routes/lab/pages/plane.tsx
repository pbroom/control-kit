import { useEffect, useState } from 'react';
import {
  NumberConfigField,
  PANEL_TWO_COLUMN_GRID_CLASS,
  PanelSection,
  Plane,
  PlaneThumb,
  ToggleField,
  type PlaneValue,
} from '../shared.js';
import { createActiveLabPage } from '../create-active-lab-page.js';
import type { LabPageDescriptor } from '../types.js';

const INITIAL_VALUE: PlaneValue = { x: 0.5, y: 0.5 };

function formatPosition(value: PlaneValue) {
  return `${Math.round(value.x * 100)}% horizontal, ${Math.round(value.y * 100)}% vertical`;
}

function usePlaneLabPageController() {
  const [value, setValue] = useState(INITIAL_VALUE);
  const [disabled, setDisabled] = useState(false);
  const [readOnly, setReadOnly] = useState(false);

  return {
    disabled,
    readOnly,
    setDisabled,
    setReadOnly,
    setValue,
    value,
  };
}

type PlaneLabPageController = ReturnType<typeof usePlaneLabPageController>;

function PlanePreview({ controller }: { controller: PlaneLabPageController }) {
  const [value, setValue] = useState(controller.value);

  useEffect(() => {
    setValue(controller.value);
  }, [controller.value]);

  return (
    <div className="flex flex-col items-center gap-4 max-[520px]:translate-x-[70px]">
      <Plane
        data-testid="plane-demo"
        aria-label="Normalized position"
        className="size-[300px] overflow-hidden rounded-2xl border border-white/10 bg-[#151516] max-[520px]:size-[220px]"
        disabled={controller.disabled}
        readOnly={controller.readOnly}
      >
        <PlaneThumb
          data-testid="plane-demo-thumb"
          value={value}
          onValueChange={setValue}
          onValueCommit={controller.setValue}
          step={0.01}
          largeStep={0.1}
          xAriaLabel="Horizontal position"
          yAriaLabel="Vertical position"
          getAriaValueText={formatPosition}
          className="size-6 border-white/30 bg-white shadow-none"
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
