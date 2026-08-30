import { useState } from 'react';
import { ControlField } from '@color-kit/control-kit';

export function ControlFieldBasicExample() {
  const [value, setValue] = useState<number | null>(42);

  return (
    <div className="flex min-h-[320px] items-center justify-center p-8">
      <ControlField.Root
        className="w-32"
        format={{ maximumFractionDigits: 2 }}
        max={100}
        min={0}
        onValueChange={setValue}
        value={value}
      >
        <ControlField.Group>
          <ControlField.ScrubArea>
            <span aria-hidden="true">V</span>
          </ControlField.ScrubArea>
          <ControlField.Input aria-label="Opacity" />
          <ControlField.Affix aria-hidden="true">%</ControlField.Affix>
        </ControlField.Group>
      </ControlField.Root>
    </div>
  );
}
