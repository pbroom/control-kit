import { useState } from 'react';
import { ToggleGroup, ToggleGroupItem } from 'control-kit';

export function ToggleGroupControlledExample() {
  const [view, setView] = useState<string | undefined>('grid');

  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 p-8">
      <ToggleGroup aria-label="View" value={view} onValueChange={setView}>
        <ToggleGroupItem value="list">List</ToggleGroupItem>
        <ToggleGroupItem value="grid">Grid</ToggleGroupItem>
        <ToggleGroupItem value="compact">Compact</ToggleGroupItem>
      </ToggleGroup>
      <p className="text-muted-foreground text-xs">
        Selected: {view ?? 'None'}
      </p>
    </div>
  );
}
