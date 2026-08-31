import * as React from 'react';
import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area';
import { cn } from '@/lib/utils';

function resolveClassName<State>(
  baseClassName: string,
  className: string | ((state: State) => string | undefined) | undefined,
) {
  return typeof className === 'function'
    ? (state: State) => cn(baseClassName, className(state))
    : cn(baseClassName, className);
}

function ScrollArea({
  className,
  children,
  preventWheelPropagationWhenFit = false,
  viewportProps,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
  preventWheelPropagationWhenFit?: boolean;
  viewportProps?: React.ComponentProps<typeof ScrollAreaPrimitive.Viewport>;
}) {
  const {
    className: viewportClassName,
    ref: viewportRef,
    ...resolvedViewportProps
  } = viewportProps ?? {};
  const internalViewportRef = React.useRef<HTMLDivElement | null>(null);

  const setViewportRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      internalViewportRef.current = node;

      if (typeof viewportRef === 'function') {
        viewportRef(node);
      } else if (viewportRef) {
        viewportRef.current = node;
      }
    },
    [viewportRef],
  );

  React.useEffect(() => {
    const viewport = internalViewportRef.current;

    if (!preventWheelPropagationWhenFit || !viewport) {
      return;
    }

    // A zero-range overflow viewport is not a scroll-chain boundary in Chrome,
    // so a non-passive listener is required for opt-in static fitted regions.
    const preventFitWheelPropagation = (event: WheelEvent) => {
      if (viewport.scrollHeight <= viewport.clientHeight) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    viewport.addEventListener('wheel', preventFitWheelPropagation, {
      passive: false,
    });

    return () => {
      viewport.removeEventListener('wheel', preventFitWheelPropagation);
    };
  }, [preventWheelPropagationWhenFit]);

  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={resolveClassName(
        'relative overflow-hidden rounded-[inherit]',
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        {...resolvedViewportProps}
        data-slot="scroll-area-viewport"
        className={resolveClassName(
          'size-full rounded-[inherit]',
          viewportClassName,
        )}
        ref={setViewportRef}
      >
        <ScrollAreaPrimitive.Content
          data-slot="scroll-area-content"
          style={{ display: 'table', minWidth: '100%' }}
        >
          {children}
        </ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Scrollbar>) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={resolveClassName(
        cn(
          'box-border flex touch-none select-none p-px transition-colors',
          'pointer-events-none opacity-0 data-hovering:pointer-events-auto data-hovering:opacity-100 data-scrolling:pointer-events-auto data-scrolling:opacity-100',
          orientation === 'vertical' &&
            'h-full w-2.5 border-l border-l-transparent py-4',
          orientation === 'horizontal' &&
            'h-2.5 flex-col border-t border-t-transparent px-4',
        ),
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-border" />
    </ScrollAreaPrimitive.Scrollbar>
  );
}

export { ScrollArea, ScrollBar };
