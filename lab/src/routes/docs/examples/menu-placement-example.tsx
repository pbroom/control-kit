import { useState } from 'react';
import { MenuCommandTrigger, type SelectOptionId } from '../../lab/shared.js';

export function MenuPlacementExample() {
  const [value, setValue] = useState<SelectOptionId>('copy');

  return (
    <div className="flex min-h-[320px] items-end justify-end p-12">
      <MenuCommandTrigger
        align="end"
        disabled={false}
        onValueChange={setValue}
        showDividers
        showLeadingIcons
        showShortcuts
        showSubmenus
        showTrailingHints
        side="top"
        triggerBehavior="press"
        triggerContent="iconText"
        triggerIconTextPlacement="trailing"
        value={value}
      />
    </div>
  );
}
