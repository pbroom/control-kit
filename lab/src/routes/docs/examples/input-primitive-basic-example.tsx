import { useState } from 'react';
import { ControlInput } from 'control-kit';

export function ControlInputExample() {
  const [value, setValue] = useState<number | null>(42);

  return (
    <div className="flex min-h-[320px] items-center justify-center p-8">
      <ControlInput
        label="Opacity"
        value={value}
        onValueChange={setValue}
        min={0}
        max={100}
        precision={1}
        selectOnFocus
        handle="V"
        unit="%"
        size="sm"
      />
    </div>
  );
}
