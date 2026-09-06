import { useState } from 'react';
import { ControlField } from 'control-kit';

export function ControlFieldExpressionExample() {
  const [value, setValue] = useState<number | null>(12);

  return (
    <div className="flex min-h-[320px] items-center justify-center p-8">
      <ControlField.Root
        className="w-32"
        onValueChange={setValue}
        value={value}
      >
        <ControlField.Group>
          <ControlField.ScrubArea>
            <span aria-hidden="true">V</span>
          </ControlField.ScrubArea>
          <ControlField.Input aria-label="Spacing" />
        </ControlField.Group>
      </ControlField.Root>
    </div>
  );
}
