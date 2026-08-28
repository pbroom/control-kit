import { useState } from 'react';
import {
  MenuPlaygroundStage,
  PanelSection,
  PlacementGridField,
  SegmentedField,
  ToggleField,
  type PlacementAlign,
  type PlacementSide,
  type SelectTriggerBehavior,
  type SelectTriggerContent,
  type SelectTriggerIconTextPlacement,
} from '../shared.js';
import { createActiveLabPage } from '../create-active-lab-page.js';
import type { LabPageDescriptor } from '../types.js';

function useMenuLabPageController() {
  const [disabled, setDisabled] = useState(false);
  const [side, setSide] = useState<PlacementSide>('bottom');
  const [align, setAlign] = useState<PlacementAlign>('start');
  const [triggerContent, setTriggerContent] =
    useState<SelectTriggerContent>('iconText');
  const [triggerIconTextPlacement, setTriggerIconTextPlacement] =
    useState<SelectTriggerIconTextPlacement>('trailing');
  const [triggerBehavior, setTriggerBehavior] =
    useState<SelectTriggerBehavior>('press');
  const [showShortcuts, setShowShortcuts] = useState(true);
  const [showSubmenus, setShowSubmenus] = useState(true);
  const [showDividers, setShowDividers] = useState(true);
  const [showLeadingIcons, setShowLeadingIcons] = useState(true);

  return {
    align,
    disabled,
    setAlign,
    setDisabled,
    setShowDividers,
    setShowLeadingIcons,
    setShowShortcuts,
    setShowSubmenus,
    setSide,
    setTriggerBehavior,
    setTriggerContent,
    setTriggerIconTextPlacement,
    showDividers,
    showLeadingIcons,
    showShortcuts,
    showSubmenus,
    side,
    triggerBehavior,
    triggerContent,
    triggerIconTextPlacement,
  };
}

type MenuLabPageController = ReturnType<typeof useMenuLabPageController>;

function renderMenuPreview(controller: MenuLabPageController) {
  return (
    <MenuPlaygroundStage
      align={controller.align}
      disabled={controller.disabled}
      side={controller.side}
      triggerContent={controller.triggerContent}
      triggerIconTextPlacement={controller.triggerIconTextPlacement}
      triggerBehavior={controller.triggerBehavior}
      showShortcuts={controller.showShortcuts}
      showSubmenus={controller.showSubmenus}
      showDividers={controller.showDividers}
      showLeadingIcons={controller.showLeadingIcons}
      showTrailingHints
    />
  );
}

function renderMenuProperties(controller: MenuLabPageController) {
  return (
    <PanelSection
      title="Menu"
      description="Configure the command menu trigger, content, and interaction."
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
        <SegmentedField
          label="Trigger content"
          value={controller.triggerContent}
          onChange={controller.setTriggerContent}
          options={[
            { value: 'icon', label: 'Icon' },
            { value: 'iconText', label: 'Icon + text' },
            { value: 'text', label: 'Text' },
          ]}
        />
        {controller.triggerContent === 'iconText' ? (
          <SegmentedField
            label="Icon position"
            value={controller.triggerIconTextPlacement}
            onChange={controller.setTriggerIconTextPlacement}
            options={[
              { value: 'leading', label: 'Leading' },
              { value: 'trailing', label: 'Trailing' },
              { value: 'both', label: 'Both' },
            ]}
          />
        ) : null}
        <SegmentedField
          label="Trigger behavior"
          value={controller.triggerBehavior}
          onChange={controller.setTriggerBehavior}
          options={[
            { value: 'press', label: 'Press' },
            { value: 'release', label: 'Release' },
          ]}
        />
        <ToggleField
          label="Disabled trigger"
          checked={controller.disabled}
          onChange={controller.setDisabled}
        />
        <ToggleField
          label="Show leading icons"
          checked={controller.showLeadingIcons}
          onChange={controller.setShowLeadingIcons}
        />
        <ToggleField
          label="Show shortcuts"
          checked={controller.showShortcuts}
          onChange={controller.setShowShortcuts}
        />
        <ToggleField
          label="Show submenus"
          checked={controller.showSubmenus}
          onChange={controller.setShowSubmenus}
        />
        <ToggleField
          label="Show dividers"
          checked={controller.showDividers}
          onChange={controller.setShowDividers}
        />
      </div>
    </PanelSection>
  );
}

export const menuLabPage: LabPageDescriptor<'menu', MenuLabPageController> = {
  key: 'menu',
  label: 'Menu',
  useController: useMenuLabPageController,
  renderPreview: renderMenuPreview,
  renderProperties: renderMenuProperties,
};

export type { MenuLabPageController };

export const MenuLabActivePage = createActiveLabPage(menuLabPage);
