import { useState } from 'react';
import {
  PanelSection,
  SegmentedField,
  TabsPlaygroundStage,
  TextConfigField,
  ToggleField,
  type TabsContentMode,
} from '../shared.js';
import { createActiveLabPage } from '../create-active-lab-page.js';
import type { LabPageDescriptor } from '../types.js';

function useTabsLabPageController() {
  const [value, setValue] = useState('layers');
  const [disabled, setDisabled] = useState(false);
  const [contentMode, setContentMode] = useState<TabsContentMode>('label');
  const [label, setLabel] = useState('Layers');
  const [leadingIcon, setLeadingIcon] = useState(true);
  const [trailingIcon, setTrailingIcon] = useState(false);

  return {
    contentMode,
    disabled,
    label,
    leadingIcon,
    setContentMode,
    setDisabled,
    setLabel,
    setLeadingIcon,
    setTrailingIcon,
    setValue,
    trailingIcon,
    value,
  };
}

type TabsLabPageController = ReturnType<typeof useTabsLabPageController>;

function renderTabsPreview(controller: TabsLabPageController) {
  return (
    <TabsPlaygroundStage
      value={controller.value}
      onValueChange={controller.setValue}
      contentMode={controller.contentMode}
      label={controller.label}
      disabled={controller.disabled}
      leadingIcon={controller.leadingIcon}
      trailingIcon={controller.trailingIcon}
    />
  );
}

function renderTabsProperties(controller: TabsLabPageController) {
  return (
    <PanelSection
      title="Tabs"
      description="Preview the UI3 tab group and selected tab content."
    >
      <div className="space-y-3">
        <ToggleField
          label="Disabled"
          checked={controller.disabled}
          onChange={controller.setDisabled}
        />
        <SegmentedField
          label="Content"
          value={controller.contentMode}
          onChange={controller.setContentMode}
          options={[
            { value: 'label', label: 'Label' },
            { value: 'icon', label: 'Icon' },
          ]}
        />
        {controller.contentMode === 'label' ? (
          <>
            <TextConfigField
              label="Tab label"
              value={controller.label}
              onChange={controller.setLabel}
              maxLength={24}
            />
            <ToggleField
              label="Leading icon"
              checked={controller.leadingIcon}
              onChange={controller.setLeadingIcon}
            />
            <ToggleField
              label="Trailing icon"
              checked={controller.trailingIcon}
              onChange={controller.setTrailingIcon}
            />
          </>
        ) : null}
      </div>
    </PanelSection>
  );
}

export const tabsLabPage: LabPageDescriptor<'tabs', TabsLabPageController> = {
  key: 'tabs',
  label: 'Tabs',
  useController: useTabsLabPageController,
  renderPreview: renderTabsPreview,
  renderProperties: renderTabsProperties,
};

export type { TabsLabPageController };

export const TabsLabActivePage = createActiveLabPage(tabsLabPage);
