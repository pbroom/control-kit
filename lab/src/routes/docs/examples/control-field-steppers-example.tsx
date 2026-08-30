import { ControlField } from '@color-kit/control-kit';

export function ControlFieldSteppersExample() {
  return (
    <div className="flex min-h-[320px] items-center justify-center p-8">
      <ControlField.Root className="w-40" defaultValue={8} max={24} min={0}>
        <ControlField.Group>
          <ControlField.Decrement aria-label="Decrease columns" />
          <ControlField.Input aria-label="Columns" />
          <ControlField.Increment aria-label="Increase columns" />
        </ControlField.Group>
      </ControlField.Root>
    </div>
  );
}
