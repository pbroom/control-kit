import * as React from 'react';
import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  useFloating,
  useMergeRefs,
  type Placement,
} from '@floating-ui/react';
import type { Popover } from '@base-ui/react/popover';
import { usePlaneThumbContext } from './plane.js';
import { cn } from './utils.js';

type AttachmentPositioningProps = Pick<
  Popover.Positioner.Props,
  | 'side'
  | 'align'
  | 'sideOffset'
  | 'alignOffset'
  | 'collisionBoundary'
  | 'collisionPadding'
  | 'collisionAvoidance'
  | 'positionMethod'
>;

export type PlaneAttachmentProps = React.ComponentProps<'div'> &
  AttachmentPositioningProps & {
    /** Render outside the plane so the attachment can escape clipping. */
    portal?: boolean;
    container?: Popover.Portal.Props['container'];
    /** Hover attachments also remain visible while their controls have focus. */
    visibility?: 'always' | 'hover' | 'focus-within';
  };

/** Optional floating UI attached to the nearest PlaneThumb. */
export function PlaneAttachment({
  side = 'right',
  align = 'center',
  sideOffset = 8,
  alignOffset = 0,
  collisionBoundary,
  collisionPadding = 8,
  collisionAvoidance = { side: 'flip', align: 'shift' },
  positionMethod = 'absolute',
  portal = true,
  container,
  visibility = 'always',
  className,
  children,
  style,
  ref,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  ...props
}: PlaneAttachmentProps) {
  const thumb = usePlaneThumbContext();
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [hoverOpen, setHoverOpen] = React.useState(false);
  const blurTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFocus = thumb.focusedWithin || focused;
  const hasHover = thumb.hovered || hovered;

  React.useEffect(() => {
    return () => {
      if (blurTimer.current !== null) clearTimeout(blurTimer.current);
    };
  }, []);

  React.useEffect(() => {
    if (visibility !== 'hover') return;
    if (hasHover || hasFocus) {
      setHoverOpen(true);
      return;
    }
    // Leave enough time to cross the gap between the handle and its controls.
    const timer = window.setTimeout(() => setHoverOpen(false), 150);
    return () => window.clearTimeout(timer);
  }, [hasHover, hasFocus, visibility]);

  const visible =
    visibility === 'always' ||
    (visibility === 'focus-within'
      ? hasFocus
      : hasHover || hasFocus || hoverOpen);
  const element = thumb.element;
  const rtl =
    element && (side === 'inline-start' || side === 'inline-end')
      ? getComputedStyle(element).direction === 'rtl'
      : false;
  const physicalSide =
    side === 'inline-start'
      ? rtl
        ? 'right'
        : 'left'
      : side === 'inline-end'
        ? rtl
          ? 'left'
          : 'right'
        : side;
  const placement =
    `${physicalSide}${align === 'center' ? '' : `-${align}`}` as Placement;
  const rectBoundary =
    collisionBoundary &&
    typeof collisionBoundary === 'object' &&
    'width' in collisionBoundary &&
    !('nodeType' in collisionBoundary)
      ? collisionBoundary
      : undefined;
  const overflowOptions = {
    boundary:
      !collisionBoundary ||
      collisionBoundary === 'clipping-ancestors' ||
      rectBoundary
        ? ('clippingAncestors' as const)
        : (collisionBoundary as Element | Element[]),
    rootBoundary: rectBoundary,
    padding: collisionPadding,
  };
  const {
    refs,
    floatingStyles,
    context,
    update,
    placement: resolvedPlacement,
  } = useFloating({
    open: visible && element !== null,
    placement,
    strategy: positionMethod,
    elements: { reference: element },
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(({ rects, placement: currentPlacement }) => {
        const [currentSide, currentAlign = 'center'] =
          currentPlacement.split('-');
        const data = {
          side: currentSide as typeof physicalSide,
          align: currentAlign as typeof align,
          anchor: rects.reference,
          positioner: rects.floating,
        };
        return {
          mainAxis:
            typeof sideOffset === 'function' ? sideOffset(data) : sideOffset,
          crossAxis:
            typeof alignOffset === 'function' ? alignOffset(data) : alignOffset,
        };
      }),
      collisionAvoidance.side === 'flip' || collisionAvoidance.align === 'flip'
        ? flip({
            ...overflowOptions,
            mainAxis: collisionAvoidance.side === 'flip',
            crossAxis: collisionAvoidance.align === 'flip',
            fallbackAxisSideDirection:
              collisionAvoidance.fallbackAxisSide ?? 'none',
          })
        : null,
      shift({
        ...overflowOptions,
        mainAxis: collisionAvoidance.align === 'shift',
        crossAxis: collisionAvoidance.side === 'shift',
      }),
    ],
  });
  React.useLayoutEffect(() => {
    if (visible) update();
  }, [visible, thumb.worldValue.x, thumb.worldValue.y, update]);
  const setFloating = useMergeRefs([refs.setFloating, ref]);

  if (!visible || element === null) return null;
  const [resolvedSide, resolvedAlign = 'center'] = resolvedPlacement.split('-');
  const content = (
    <FloatingFocusManager
      context={context}
      modal={false}
      initialFocus={-1}
      returnFocus={false}
    >
      <div
        {...props}
        ref={setFloating}
        data-slot="plane-attachment"
        data-plane-attachment=""
        data-side={resolvedSide}
        data-align={resolvedAlign}
        className={cn('z-50', className)}
        style={{ ...floatingStyles, ...style }}
        onPointerEnter={(event) => {
          setHovered(true);
          onPointerEnter?.(event);
        }}
        onPointerLeave={(event) => {
          setHovered(false);
          onPointerLeave?.(event);
        }}
        onFocus={(event) => {
          if (blurTimer.current !== null) clearTimeout(blurTimer.current);
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          // Native blur precedes focus, even across nested portals. Wait until
          // that sequence finishes before removing the next focus target.
          if (blurTimer.current !== null) clearTimeout(blurTimer.current);
          blurTimer.current = setTimeout(() => setFocused(false), 0);
          onBlur?.(event);
        }}
      >
        {children}
      </div>
    </FloatingFocusManager>
  );
  return portal ? (
    <FloatingPortal root={container}>{content}</FloatingPortal>
  ) : (
    content
  );
}
