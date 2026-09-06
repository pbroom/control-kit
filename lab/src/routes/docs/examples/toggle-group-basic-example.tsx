import { ToggleGroup, ToggleGroupItem } from 'control-kit';

export function ToggleGroupExample() {
  return (
    <div className="flex min-h-[240px] items-center justify-center p-8">
      <ToggleGroup aria-label="View" defaultValue="grid">
        <ToggleGroupItem value="list">List</ToggleGroupItem>
        <ToggleGroupItem value="grid">Grid</ToggleGroupItem>
        <ToggleGroupItem value="compact">Compact</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
