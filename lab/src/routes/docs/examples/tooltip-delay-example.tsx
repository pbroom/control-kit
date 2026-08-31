import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@color-kit/control-kit';

const triggerClassName =
  'rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80';

export function TooltipDelayExample() {
  return (
    <div className="flex min-h-[240px] items-center justify-center gap-2 p-8">
      <TooltipProvider delay={450} timeout={300}>
        <Tooltip>
          <TooltipTrigger className={triggerClassName}>Canvas</TooltipTrigger>
          <TooltipContent>Canvas settings</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger className={triggerClassName}>Export</TooltipTrigger>
          <TooltipContent>Export settings</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger className={triggerClassName}>Share</TooltipTrigger>
          <TooltipContent>Share settings</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
