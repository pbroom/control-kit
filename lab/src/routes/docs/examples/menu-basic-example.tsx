import { MenuCommandTrigger } from '../../lab/shared.js';

export function MenuBasicExample() {
  return (
    <div className="flex min-h-[320px] items-center justify-center p-8">
      <MenuCommandTrigger
        align="start"
        disabled={false}
        onAction={() => undefined}
        showDividers
        showLeadingIcons
        showShortcuts
        showSubmenus
        showTrailingHints
        side="bottom"
        triggerBehavior="press"
        triggerContent="iconText"
        triggerIconTextPlacement="trailing"
      />
    </div>
  );
}
