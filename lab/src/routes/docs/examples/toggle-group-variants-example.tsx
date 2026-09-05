import { ToggleGroup, ToggleGroupItem } from 'control-kit';

const sizes = ['sm', 'default', 'lg'] as const;

export function ToggleGroupVariantsExample() {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-5 p-8">
      {sizes.map((size) => (
        <ToggleGroup
          aria-label={`${size} alignment`}
          defaultValue="center"
          key={size}
          size={size}
          variant="outline"
        >
          <ToggleGroupItem size={size} value="left">
            Left
          </ToggleGroupItem>
          <ToggleGroupItem size={size} value="center">
            Center
          </ToggleGroupItem>
          <ToggleGroupItem size={size} value="right">
            Right
          </ToggleGroupItem>
        </ToggleGroup>
      ))}
    </div>
  );
}
