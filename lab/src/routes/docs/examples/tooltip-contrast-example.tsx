import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from 'control-kit';

const triggerClassName =
  'rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80';

export function TooltipContrastExample() {
  return (
    <div className="flex min-h-[240px] items-center justify-center gap-4 p-8">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className={triggerClassName}>
            High contrast
          </TooltipTrigger>
          <TooltipContent>High contrast tooltip</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger className={triggerClassName}>Surfaced</TooltipTrigger>
          <TooltipContent highContrast={false}>Surfaced tooltip</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
