import { useState } from 'react';
import { Checkbox } from '@color-kit/control-kit';

export function CheckboxStatesExample() {
  const [checked, setChecked] = useState(true);
  const [unchecked, setUnchecked] = useState(false);

  return (
    <div className="flex min-h-[240px] items-center justify-center p-8">
      <div className="flex w-48 flex-col gap-3">
        <Checkbox checked={checked} onCheckedChange={setChecked}>
          Snap to grid
        </Checkbox>
        <Checkbox checked={unchecked} onCheckedChange={setUnchecked}>
          Show rulers
        </Checkbox>
        <Checkbox checked={false} disabled>
          Locked option
        </Checkbox>
      </div>
    </div>
  );
}
