import { useState } from 'react';
import { Checkbox } from '@color-kit/control-kit';

export function CheckboxExample() {
  const [checked, setChecked] = useState(false);

  return (
    <div className="flex min-h-[240px] items-center justify-center p-8">
      <Checkbox checked={checked} onCheckedChange={setChecked}>
        Show grid
      </Checkbox>
    </div>
  );
}
