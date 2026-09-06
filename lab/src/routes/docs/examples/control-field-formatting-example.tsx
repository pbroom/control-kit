import { ControlField } from 'control-kit';

export function ControlFieldFormattingExample() {
  return (
    <div className="flex min-h-[320px] flex-wrap items-center justify-center gap-6 p-8">
      <ControlField.Root
        className="w-36"
        defaultValue={1250}
        format={{ currency: 'USD', style: 'currency' }}
        locale="en-US"
      >
        <ControlField.Group>
          <ControlField.ScrubArea>
            <span aria-hidden="true">V</span>
          </ControlField.ScrubArea>
          <ControlField.Input aria-label="Price" />
        </ControlField.Group>
      </ControlField.Root>

      <ControlField.Root
        className="w-32"
        defaultValue={16}
        format={{ maximumFractionDigits: 2 }}
        min={0}
        step={0.25}
      >
        <ControlField.Group>
          <ControlField.ScrubArea>
            <span aria-hidden="true">V</span>
          </ControlField.ScrubArea>
          <ControlField.Input aria-label="Spacing" />
          <ControlField.Affix aria-hidden="true">px</ControlField.Affix>
        </ControlField.Group>
      </ControlField.Root>
    </div>
  );
}
