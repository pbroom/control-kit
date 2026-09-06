import { ToggleGroup, ToggleGroupItem } from 'control-kit';

export function ToggleGroupLoopExample() {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 p-8">
      <ToggleGroup
        aria-label="Panel alignment"
        defaultValue="center"
        loop={false}
      >
        <ToggleGroupItem value="left">Left</ToggleGroupItem>
        <ToggleGroupItem value="center">Center</ToggleGroupItem>
        <ToggleGroupItem value="right">Right</ToggleGroupItem>
      </ToggleGroup>
      <p className="text-muted-foreground max-w-64 text-center text-xs">
        Arrow-key focus stops at the first and last item.
      </p>
    </div>
  );
}
