import { MenuCommandTrigger } from '../../lab/shared.js';

export function MenuPlacementExample() {
  return (
    <div className="flex min-h-[320px] items-end justify-end p-12">
      <MenuCommandTrigger
        align="end"
        disabled={false}
        onAction={() => undefined}
        showDividers
        showLeadingIcons
        showShortcuts
        showSubmenus
        showTrailingHints
        side="top"
        triggerBehavior="press"
        triggerContent="iconText"
        triggerIconTextPlacement="trailing"
      />
    </div>
  );
}
