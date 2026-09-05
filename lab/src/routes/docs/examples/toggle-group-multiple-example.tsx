import { ToggleGroup, ToggleGroupItem } from 'control-kit';

export function ToggleGroupMultipleExample() {
  return (
    <div className="flex min-h-[240px] items-center justify-center p-8">
      <ToggleGroup
        aria-label="Text formatting"
        defaultValue={['bold']}
        type="multiple"
        variant="outline"
      >
        <ToggleGroupItem aria-label="Bold" value="bold">
          <span className="font-bold">B</span>
        </ToggleGroupItem>
        <ToggleGroupItem aria-label="Italic" value="italic">
          <span className="italic">I</span>
        </ToggleGroupItem>
        <ToggleGroupItem aria-label="Underline" value="underline">
          <span className="underline">U</span>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
