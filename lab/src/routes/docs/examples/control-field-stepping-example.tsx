import { ControlField } from 'control-kit';

export function ControlFieldSteppingExample() {
  return (
    <div className="flex min-h-[320px] flex-wrap items-center justify-center gap-8 p-8">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-white">Fine stepping</span>
        <ControlField.Root
          className="w-32"
          defaultValue={1}
          largeStep={1}
          pageStep={10}
          smallStep={0.01}
          step={0.1}
        >
          <ControlField.Group>
            <ControlField.ScrubArea>
              <span aria-hidden="true">V</span>
            </ControlField.ScrubArea>
            <ControlField.Input aria-label="Fine-stepped value" />
          </ControlField.Group>
        </ControlField.Root>
        <span className="max-w-40 text-xs text-white/55">
          Alt steps by 0.01, Shift by 1, and Page Up or Down by 10.
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-white">Wrapping angle</span>
        <ControlField.Root
          boundaryBehavior="wrap"
          className="w-32"
          defaultValue={350}
          max={360}
          min={0}
          pageStep={90}
          step={10}
        >
          <ControlField.Group>
            <ControlField.ScrubArea>
              <span aria-hidden="true">V</span>
            </ControlField.ScrubArea>
            <ControlField.Input aria-label="Angle" />
            <ControlField.Affix aria-hidden="true">°</ControlField.Affix>
          </ControlField.Group>
        </ControlField.Root>
        <span className="max-w-40 text-xs text-white/55">
          Stepping past either bound continues from the opposite edge.
        </span>
      </div>
    </div>
  );
}
