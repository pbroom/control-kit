import { Field } from '@base-ui/react/field';
import { ControlField } from 'control-kit';

export function ControlFieldStatesExample() {
  return (
    <div className="flex min-h-[320px] flex-wrap items-start justify-center gap-8 p-8">
      <Field.Root className="flex w-40 flex-col gap-2">
        <ControlField.Label className="text-sm font-medium text-white">
          Rotation
        </ControlField.Label>
        <ControlField.Root defaultValue={45} max={360} min={0} required>
          <ControlField.Group>
            <ControlField.ScrubArea>
              <span aria-hidden="true">V</span>
            </ControlField.ScrubArea>
            <ControlField.Input />
            <ControlField.Affix aria-hidden="true">°</ControlField.Affix>
          </ControlField.Group>
        </ControlField.Root>
        <ControlField.Description>
          Enter an angle from 0 to 360 degrees.
        </ControlField.Description>
        <ControlField.Error match="valueMissing">
          Enter a rotation.
        </ControlField.Error>
      </Field.Root>

      <div className="flex w-32 flex-col gap-3">
        <ControlField.Root defaultValue={50} disabled>
          <ControlField.Group>
            <ControlField.ScrubArea>
              <span aria-hidden="true">V</span>
            </ControlField.ScrubArea>
            <ControlField.Input aria-label="Disabled value" />
          </ControlField.Group>
        </ControlField.Root>
        <ControlField.Root defaultValue={50} readOnly>
          <ControlField.Group>
            <ControlField.ScrubArea>
              <span aria-hidden="true">V</span>
            </ControlField.ScrubArea>
            <ControlField.Input aria-label="Read-only value" />
          </ControlField.Group>
        </ControlField.Root>
      </div>
    </div>
  );
}
