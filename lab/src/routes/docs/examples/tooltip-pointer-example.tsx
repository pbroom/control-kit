import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@color-kit/control-kit';

const triggerClassName =
  'rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80';

export function TooltipPointerExample() {
  return (
    <div className="flex min-h-[240px] items-center justify-center gap-4 p-8">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className={triggerClassName}>
            With pointer
          </TooltipTrigger>
          <TooltipContent>Pointer included</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger className={triggerClassName}>
            No pointer
          </TooltipTrigger>
          <TooltipContent showPointer={false}>Pointer removed</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
