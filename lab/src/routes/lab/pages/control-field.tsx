import { useState } from 'react';
import { ControlField } from '@color-kit/control-kit';
import { PanelSection, ToggleField } from '../shared.js';
import { createActiveLabPage } from '../create-active-lab-page.js';
import type { LabPageDescriptor } from '../types.js';

function useControlFieldLabPageController() {
  const [value, setValue] = useState<number | null>(42);
  const [wrap, setWrap] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [readOnly, setReadOnly] = useState(false);

  return {
    disabled,
    readOnly,
    setDisabled,
    setReadOnly,
    setValue,
    setWrap,
    value,
    wrap,
  };
}

type ControlFieldLabPageController = ReturnType<
  typeof useControlFieldLabPageController
>;

function renderControlFieldPreview(controller: ControlFieldLabPageController) {
  return (
    <ControlField.Root
      boundaryBehavior={controller.wrap ? 'wrap' : 'clamp'}
      className="w-32"
      disabled={controller.disabled}
      format={{ maximumFractionDigits: 3 }}
      max={100}
      min={0}
      onValueChange={controller.setValue}
      pageStep={10}
      readOnly={controller.readOnly}
      value={controller.value}
    >
      <ControlField.Group>
        <ControlField.ScrubArea>
          <span aria-hidden="true">V</span>
        </ControlField.ScrubArea>
        <ControlField.Input aria-label="Value" />
      </ControlField.Group>
    </ControlField.Root>
  );
}

function renderControlFieldProperties(
  controller: ControlFieldLabPageController,
) {
  return (
    <PanelSection
      title="Control Field"
      description="Compose Base UI number behavior with expression editing and cyclic bounds."
    >
      <div className="space-y-3">
        <ToggleField
          checked={controller.wrap}
          label="Wrap at bounds"
          onChange={controller.setWrap}
        />
        <ToggleField
          checked={controller.disabled}
          label="Disabled"
          onChange={controller.setDisabled}
        />
        <ToggleField
          checked={controller.readOnly}
          label="Read only"
          onChange={controller.setReadOnly}
        />
      </div>
    </PanelSection>
  );
}

export const controlFieldLabPage: LabPageDescriptor<
  'controlField',
  ControlFieldLabPageController
> = {
  key: 'controlField',
  label: 'Control Field',
  useController: useControlFieldLabPageController,
  renderPreview: renderControlFieldPreview,
  renderProperties: renderControlFieldProperties,
};

export const ControlFieldLabActivePage =
  createActiveLabPage(controlFieldLabPage);
