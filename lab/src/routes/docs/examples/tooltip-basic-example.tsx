import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@color-kit/control-kit';

export function TooltipExample() {
  return (
    <div className="flex min-h-[320px] items-center justify-center p-8">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80"
                type="button"
              />
            }
          >
            Settings
          </TooltipTrigger>
          <TooltipContent>Settings</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
