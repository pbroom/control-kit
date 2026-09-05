import { useState } from 'react';
import { Checkbox } from 'control-kit';

export function CheckboxStylingExample() {
  const [checked, setChecked] = useState(true);

  return (
    <div className="flex min-h-[240px] items-center justify-center p-8">
      <Checkbox
        checked={checked}
        className="w-52 rounded-md border border-white/10 bg-white/5 px-3 py-2"
        indicatorClassName="size-5 rounded-full"
        labelClassName="font-semibold tracking-wide"
        onCheckedChange={setChecked}
      >
        Custom attachment points
      </Checkbox>
    </div>
  );
}
