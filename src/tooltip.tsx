import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import { cn } from './utils.js';

const DEFAULT_TOOLTIP_DELAY = 450;
const DEFAULT_TOOLTIP_TIMEOUT = 300;

export type TooltipProviderProps = TooltipPrimitive.Provider.Props;

export function TooltipProvider({
  delay = DEFAULT_TOOLTIP_DELAY,
  timeout = DEFAULT_TOOLTIP_TIMEOUT,
  ...props
}: TooltipProviderProps) {
  return (
    <TooltipPrimitive.Provider delay={delay} timeout={timeout} {...props} />
  );
}

export type TooltipProps<Payload = unknown> =
  TooltipPrimitive.Root.Props<Payload>;

export function Tooltip<Payload = unknown>(props: TooltipProps<Payload>) {
  return <TooltipPrimitive.Root {...props} />;
}

export type TooltipTriggerProps<Payload = unknown> =
  TooltipPrimitive.Trigger.Props<Payload>;

export function TooltipTrigger<Payload = unknown>({
  ...props
}: TooltipTriggerProps<Payload>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

type TooltipPositionerProps = Pick<
  TooltipPrimitive.Positioner.Props,
  | 'align'
  | 'alignOffset'
  | 'anchor'
  | 'arrowPadding'
  | 'collisionAvoidance'
  | 'collisionBoundary'
  | 'collisionPadding'
  | 'disableAnchorTracking'
  | 'positionMethod'
  | 'side'
  | 'sideOffset'
  | 'sticky'
>;

export type TooltipContentProps = TooltipPrimitive.Popup.Props &
  TooltipPositionerProps & {
    highContrast?: boolean;
    keepMounted?: boolean;
    positionerClassName?: string;
    showPointer?: boolean;
  };

export function TooltipContent({
  align = 'center',
  alignOffset = 0,
  anchor,
  arrowPadding,
  children,
  className,
  collisionAvoidance,
  collisionBoundary,
  collisionPadding,
  disableAnchorTracking,
  highContrast = true,
  keepMounted,
  positionerClassName,
  positionMethod,
  showPointer = true,
  side = 'top',
  sideOffset = 4,
  sticky,
  ...popupProps
}: TooltipContentProps) {
  return (
    <TooltipPrimitive.Portal keepMounted={keepMounted}>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        arrowPadding={arrowPadding}
        className={cn('isolate z-50', positionerClassName)}
        collisionAvoidance={collisionAvoidance}
        collisionBoundary={collisionBoundary}
        collisionPadding={collisionPadding}
        disableAnchorTracking={disableAnchorTracking}
        positionMethod={positionMethod}
        side={side}
        sideOffset={sideOffset}
        sticky={sticky}
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={(state) =>
            cn(
              'z-50 w-fit origin-(--transform-origin) rounded-md px-3 py-1.5 text-xs text-balance transition-[transform,opacity] duration-100 ease-out data-ending-style:opacity-0 data-ending-style:[transform:scale(0.95)] data-instant:transition-none data-starting-style:opacity-0 data-starting-style:[transform:scale(0.95)]',
              highContrast
                ? 'bg-[var(--ck-foreground,#ffffff)] text-[color:var(--ck-surface-content,#1f1f1f)]'
                : 'bg-[var(--ck-surface-content,#1f1f1f)] text-[color:var(--ck-foreground,#ffffff)] [filter:drop-shadow(0_0_1px_var(--ck-border,#4c4c4c))_drop-shadow(0_4px_6px_rgb(0_0_0/0.1))]',
              typeof className === 'function' ? className(state) : className,
            )
          }
          {...popupProps}
        >
          {children}
          {showPointer ? (
            <TooltipPrimitive.Arrow
              className={(state) =>
                cn(
                  'block overflow-visible',
                  state.side === 'top' && '-bottom-1.5',
                  state.side === 'bottom' && '-top-1.5 rotate-180',
                  state.side === 'left' && '-right-[9px] -rotate-90',
                  state.side === 'right' && '-left-[9px] rotate-90',
                  state.side === 'inline-start' &&
                    '-end-[9px] ltr:-rotate-90 rtl:rotate-90',
                  state.side === 'inline-end' &&
                    '-start-[9px] ltr:rotate-90 rtl:-rotate-90',
                )
              }
              render={
                <svg
                  aria-hidden="true"
                  focusable="false"
                  preserveAspectRatio="xMidYMid meet"
                  viewBox="0 0 12 6"
                  width="12"
                  height="6"
                />
              }
            >
              <path
                className={
                  highContrast
                    ? 'fill-[var(--ck-foreground,#ffffff)]'
                    : 'fill-[var(--ck-surface-content,#1f1f1f)]'
                }
                d="M0 0 L4.5 5 Q6 7 7.5 5 L12 0 Z"
              />
              {highContrast ? null : (
                <path
                  className="stroke-[color:var(--ck-border,#4c4c4c)] stroke-[1.25px]"
                  d="M0 0 L4.5 5 Q6 7 7.5 5 L12 0"
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </TooltipPrimitive.Arrow>
          ) : null}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}
