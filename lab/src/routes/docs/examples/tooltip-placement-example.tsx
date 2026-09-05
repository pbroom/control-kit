import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from 'control-kit';

export function TooltipPlacementExample() {
  return (
    <div className="flex min-h-[240px] items-center justify-center p-8">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80">
            Hover or focus
          </TooltipTrigger>
          <TooltipContent side="right" align="start" sideOffset={8}>
            Right aligned
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
