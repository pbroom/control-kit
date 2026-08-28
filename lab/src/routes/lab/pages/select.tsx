import { useState } from 'react';
import {
  PanelSection,
  PlacementGridField,
  SelectPlaygroundStage,
  ToggleField,
  type PlacementAlign,
  type PlacementSide,
} from '../shared.js';
import { createActiveLabPage } from '../create-active-lab-page.js';
import type { LabPageDescriptor } from '../types.js';

function useSelectLabPageController() {
  const [disabled, setDisabled] = useState(false);
  const [side, setSide] = useState<PlacementSide>('bottom');
  const [align, setAlign] = useState<PlacementAlign>('start');

  return {
    align,
    disabled,
    setAlign,
    setDisabled,
    setSide,
    side,
  };
}

type SelectLabPageController = ReturnType<typeof useSelectLabPageController>;

function renderSelectPreview(controller: SelectLabPageController) {
  return (
    <SelectPlaygroundStage
      align={controller.align}
      disabled={controller.disabled}
      side={controller.side}
    />
  );
}

function renderSelectProperties(controller: SelectLabPageController) {
  return (
    <PanelSection
      title="Menu Select"
      description="Choose one value from a long, scrollable list."
    >
      <div className="space-y-3">
        <PlacementGridField
          label="Placement"
          side={controller.side}
          align={controller.align}
          onChange={(placement) => {
            controller.setSide(placement.side);
            controller.setAlign(placement.align);
          }}
        />
        <ToggleField
          label="Disabled trigger"
          checked={controller.disabled}
          onChange={controller.setDisabled}
        />
      </div>
    </PanelSection>
  );
}

export const selectLabPage: LabPageDescriptor<
  'select',
  SelectLabPageController
> = {
  key: 'select',
  label: 'Select',
  useController: useSelectLabPageController,
  renderPreview: renderSelectPreview,
  renderProperties: renderSelectProperties,
};

export type { SelectLabPageController };

export const SelectLabActivePage = createActiveLabPage(selectLabPage);
