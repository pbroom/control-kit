import { useState } from 'react';
import { Field } from '@base-ui/react/field';
import { ControlField } from '@color-kit/control-kit';

export function ControlFieldExpressionExample() {
  const [value, setValue] = useState<number | null>(12);

  return (
    <div className="flex min-h-[320px] items-center justify-center p-8">
      <Field.Root className="flex w-56 flex-col gap-2">
        <ControlField.Root onValueChange={setValue} value={value}>
          <ControlField.ScrubArea>
            <ControlField.Label>Spacing</ControlField.Label>
            <ControlField.ScrubAreaCursor />
          </ControlField.ScrubArea>
          <ControlField.Group>
            <ControlField.Input aria-label="Spacing" />
          </ControlField.Group>
          <ControlField.Description>
            Try <code>* 2</code>, <code>(8 + 4) / 2</code>, or{' '}
            <code>current + 10</code>.
          </ControlField.Description>
        </ControlField.Root>
      </Field.Root>
    </div>
  );
}
