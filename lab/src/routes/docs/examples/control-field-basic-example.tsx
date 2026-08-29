import { useState } from 'react';
import { Field } from '@base-ui/react/field';
import { ControlField } from '@color-kit/control-kit';

export function ControlFieldBasicExample() {
  const [value, setValue] = useState<number | null>(42);

  return (
    <div className="flex min-h-[320px] items-center justify-center p-8">
      <Field.Root className="flex w-48 flex-col gap-2">
        <ControlField.Root
          format={{ maximumFractionDigits: 2 }}
          max={100}
          min={0}
          onValueChange={setValue}
          value={value}
        >
          <ControlField.ScrubArea>
            <ControlField.Label>Opacity</ControlField.Label>
            <ControlField.ScrubAreaCursor />
          </ControlField.ScrubArea>
          <ControlField.Group>
            <ControlField.Decrement aria-label="Decrease opacity" />
            <ControlField.Input />
            <ControlField.Increment aria-label="Increase opacity" />
          </ControlField.Group>
          <ControlField.Description>Percent</ControlField.Description>
        </ControlField.Root>
      </Field.Root>
    </div>
  );
}
