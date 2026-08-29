import { useState } from 'react';
import { Field } from '@base-ui/react/field';
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
    <Field.Root className="flex w-48 flex-col gap-2">
      <ControlField.Root
        boundaryBehavior={controller.wrap ? 'wrap' : 'clamp'}
        disabled={controller.disabled}
        format={{ maximumFractionDigits: 3 }}
        max={100}
        min={0}
        onValueChange={controller.setValue}
        pageStep={10}
        readOnly={controller.readOnly}
        value={controller.value}
      >
        <ControlField.ScrubArea>
          <ControlField.Label>Value</ControlField.Label>
          <ControlField.ScrubAreaCursor />
        </ControlField.ScrubArea>
        <ControlField.Group>
          <ControlField.Decrement aria-label="Decrease value" />
          <ControlField.Input />
          <ControlField.Increment aria-label="Increase value" />
        </ControlField.Group>
        <ControlField.Description>
          Type <code>* 2</code>, then press Enter.
        </ControlField.Description>
      </ControlField.Root>
    </Field.Root>
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
