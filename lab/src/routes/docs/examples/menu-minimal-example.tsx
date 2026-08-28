import { MenuCommandTrigger } from '../../lab/shared.js';

export function MenuMinimalExample() {
  return (
    <div className="flex min-h-[320px] items-center justify-center p-8">
      <MenuCommandTrigger
        align="start"
        disabled={false}
        onAction={() => undefined}
        showDividers={false}
        showLeadingIcons={false}
        showShortcuts={false}
        showSubmenus={false}
        showTrailingHints={false}
        side="bottom"
        triggerBehavior="press"
        triggerContent="text"
        triggerIconTextPlacement="trailing"
      />
    </div>
  );
}
