import { useState } from 'react';
import { MenuCommandTrigger, type SelectOptionId } from '../../lab/shared.js';

export function MenuBasicExample() {
  const [value, setValue] = useState<SelectOptionId>('copy');

  return (
    <div className="flex min-h-[320px] items-center justify-center p-8">
      <MenuCommandTrigger
        align="start"
        disabled={false}
        onValueChange={setValue}
        showDividers
        showLeadingIcons
        showShortcuts
        showSubmenus
        showTrailingHints
        side="bottom"
        triggerBehavior="press"
        triggerContent="iconText"
        triggerIconTextPlacement="trailing"
        value={value}
      />
    </div>
  );
}
