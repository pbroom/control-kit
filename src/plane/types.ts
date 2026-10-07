import type * as React from 'react';

export type PlaneValue = {
  x: number;
  y: number;
};

export type PlaneInteraction = 'pointer' | 'keyboard';

export type PlaneValueChangeReason =
  | 'thumb-drag'
  | 'plane-press'
  | 'keyboard'
  | 'input-change';

export type PlaneSnapAxis = 'x' | 'y';

/**
 * A snap target, expressed in the thumb's own value space: [0, 1] for root
 * thumbs, [-1, 1] parent-relative offsets for nested thumbs.
 */
export type PlaneSnapTarget =
  /** Quantizes each given axis to `origin + k * size`. An omitted axis stays free. */
  | { type: 'grid'; x?: number; y?: number; origin?: PlaneValue }
  /** Magnetic guide line. `axis: 'x'` is a vertical line at `x = at`. */
  | { type: 'line'; axis: PlaneSnapAxis; at: number }
  /** Magnetic point. */
  | { type: 'point'; x: number; y: number; id?: string }
  /** Consulted first, in declaration order. Return null to defer. */
  | { type: 'custom'; resolve: (value: PlaneValue) => PlaneValue | null };

/** One target that contributed to a snap. */
export type PlaneSnapHitPart = {
  target: PlaneSnapTarget;
  /** The target's index in the resolved `snap` array. */
  index: number;
  /** The axes this target fixed. */
  axes: PlaneSnapAxis[];
};

export type PlaneSnapHit = PlaneSnapHitPart & {
  /**
   * Present when more than one target applied, for example a vertical and a
   * horizontal line, or a line plus a grid on the other axis. Lists every
   * applied target in priority order; the hit's own `target`/`index` is the
   * first of them and its `axes` is the union of all parts' axes.
   */
  parts?: PlaneSnapHitPart[];
};

/**
 * `'x'`/`'y'` restrict pointer movement to that axis. With
 * `'dominant-with-shift'`, holding Shift during a drag restricts movement to
 * the axis with the greater travel since the drag started.
 */
export type PlaneAxisLock = PlaneSnapAxis | 'dominant-with-shift';

/** Modifier that disables snapping while held during a pointer drag. */
export type PlaneSnapBypass = 'alt' | 'meta' | false;

/**
 * Why the presented position is moving:
 * - `'drag'`: a pointer drag sample that did not change the snap state.
 * - `'snap'`: a pointer sample that entered, left, or moved between snap
 *   positions (including grid steps).
 * - `'keyboard'`: a keyboard or native input change.
 * - `'programmatic'`: any other value change, such as a controlled update.
 */
export type PlaneMotionReason = 'drag' | 'snap' | 'keyboard' | 'programmatic';

/**
 * Presentation-only motion. Moves the rendered thumb from its current
 * presented position toward the logical value; the logical value (and every
 * callback) never lags. Free drag samples (`'drag'`) follow the pointer
 * instantly unless `smoothDrag` is true.
 */
export type PlaneMotion = {
  step(
    current: PlaneValue,
    target: PlaneValue,
    dtMs: number,
    info: { reason: PlaneMotionReason },
  ): { value: PlaneValue; done: boolean };
  /** Also animate free drag samples. @default false */
  smoothDrag?: boolean;
};

export type PlaneValueChangeDetails = {
  interaction: PlaneInteraction;
  reason: PlaneValueChangeReason;
  thumbId?: string;
  originalEvent?: Event;
  /** The snap that produced this value. Omitted when nothing snapped. */
  snap?: PlaneSnapHit;
};

export type PlanePoint = {
  clientX: number;
  clientY: number;
};

export type PlaneBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type PlanePressBehavior = 'auto' | 'none' | 'nearest';
export type PlaneDragBehavior = 'absolute' | 'relative';
export type PlaneThumbPressBehavior = 'inherit' | 'none';

export type PlaneHoverValueChangeDetails = {
  pointerType: string;
  originalEvent: PointerEvent;
};

/** Snapping and motion props shared by Plane (as defaults) and PlaneThumb. */
export type PlaneSnapProps = {
  /**
   * Snap targets. Grids always quantize; lines and points are magnetic within
   * `snapRadius`. Priority: custom > point > line > grid; lines apply per
   * axis, so perpendicular lines combine. A thumb's own
   * `snap` replaces the Plane default. Nested thumbs do not inherit the Plane
   * `snap` targets, because they use a different (parent-relative) space.
   */
  snap?: readonly PlaneSnapTarget[];
  /** Magnetic radius in CSS pixels. @default 8 */
  snapRadius?: number;
  /** Restricts pointer movement to one axis. */
  axisLock?: PlaneAxisLock;
  /** Modifier that disables snapping during a pointer drag. @default 'alt' */
  snapBypass?: PlaneSnapBypass;
  /**
   * Presentation motion toward the logical value for snap transitions,
   * keyboard, and programmatic changes; free drags follow the pointer unless
   * `motion.smoothDrag`. Hoist or memoize it (for example a module-level
   * `springMotion()`). @default instant
   */
  motion?: PlaneMotion;
};

export type PlaneProps = Omit<
  React.ComponentProps<'div'>,
  'defaultValue' | 'onChange'
> &
  PlaneSnapProps & {
    disabled?: boolean;
    readOnly?: boolean;
    pressBehavior?: PlanePressBehavior;
    dragBehavior?: PlaneDragBehavior;
    dragSensitivity?: number;
    onHoverValueChange?: (
      value: PlaneValue | null,
      details: PlaneHoverValueChangeDetails,
    ) => void;
  };

export type PlaneThumbProps = Omit<
  React.ComponentProps<'div'>,
  'defaultValue' | 'onChange'
> &
  PlaneSnapProps & {
    thumbId?: string;
    pressBehavior?: PlaneThumbPressBehavior;
    /** Root thumbs use [0, 1] plane coordinates; nested thumbs use [-1, 1]
     * offsets from their parent, measured in plane widths and heights. */
    value?: PlaneValue;
    /** Defaults to the plane center, or {x: 0, y: 0} for a nested thumb. */
    defaultValue?: PlaneValue;
    onValueChange?: (
      value: PlaneValue,
      details: PlaneValueChangeDetails,
    ) => void;
    /**
     * Called once when a pointer drag, plane press, or keyboard interaction
     * completes, with the final value.
     */
    onValueCommitted?: (
      value: PlaneValue,
      details: PlaneValueChangeDetails,
    ) => void;
    /**
     * Ignored when `onValueCommitted` is provided.
     * @deprecated Use onValueCommitted.
     */
    onValueCommit?: (
      value: PlaneValue,
      details: PlaneValueChangeDetails,
    ) => void;
    disabled?: boolean;
    readOnly?: boolean;
    step?: number;
    smallStep?: number;
    largeStep?: number;
    xName?: string;
    yName?: string;
    form?: string;
    xAriaLabel?: string;
    yAriaLabel?: string;
    getAriaValueText?: (value: PlaneValue) => string;
  };

export type PlaneContextValue = {
  disabled: boolean;
  readOnly: boolean;
  dragging: boolean;
};

export type PlaneThumbContextValue = {
  value: PlaneValue;
  /** Position in the containing plane, including all parent offsets. */
  worldValue: PlaneValue;
  element: HTMLDivElement | null;
  focusedWithin: boolean;
  hovered: boolean;
  dragging: boolean;
  focused: boolean;
  focusVisible: boolean;
  disabled: boolean;
  readOnly: boolean;
  /** The snap the current value rests on. Omitted when unsnapped. */
  snapped?: PlaneSnapHit;
};

// Internal types shared between Plane and PlaneThumb. Not exported publicly.

export type PlaneValueChangeSource = Pick<
  PlaneValueChangeDetails,
  'interaction' | 'reason' | 'originalEvent'
>;

export type PlanePointerModifiers = {
  altKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
};

/** Everything a thumb needs to resolve one pointer sample. */
export type PlanePointerInput = {
  /** Unclamped world-space pointer value (after relative drag). */
  value: PlaneValue;
  /** World-space thumb value when the drag started. */
  start: PlaneValue;
  bounds: PlaneBounds;
  modifiers: PlanePointerModifiers;
};

export type PlaneResolvedPointerValue = {
  /** Clamped thumb-local value. */
  local: PlaneValue;
  /** Clamped world value the thumb renders at. */
  world: PlaneValue;
  hit: PlaneSnapHit | null;
};

export type PlanePointerReason = Extract<
  PlaneValueChangeReason,
  'thumb-drag' | 'plane-press'
>;

export type PlaneKeyboardReason = Extract<
  PlaneValueChangeReason,
  'keyboard' | 'input-change'
>;

export type PlaneThumbSize = { width: number; height: number };

export type PlaneThumbPointerHover = {
  syncPointerHover: (
    pointerId: number,
    pointerType: string,
    hovered: boolean,
    captured: boolean,
  ) => void;
  capturePointerHover: (pointerId: number, pointerType: string) => void;
  reconcilePointerHover: (
    pointerId: number,
    pointerType: string,
    point: PlanePoint,
    capturedOnly: boolean,
  ) => void;
  releasePointerHover: (pointerId: number, clearHover: boolean) => void;
};

export type PlaneThumbRegistration = PlaneThumbPointerHover & {
  key: string;
  /** Position in plane (world) coordinates, including parent offsets. */
  getValue: () => PlaneValue;
  /** Applies axis lock, snapping, and clamping to a pointer sample. Pure. */
  resolvePointer: (input: PlanePointerInput) => PlaneResolvedPointerValue;
  /** Publishes a resolved pointer value and records its snap hit. */
  publishPointer: (
    resolved: PlaneResolvedPointerValue,
    source: PlaneValueChangeSource,
  ) => boolean;
  /** Called on pointer down, before the first sample. */
  beginPointer: () => void;
  beginRelativeDrag: () => PlaneValue;
  getHoverSize: () => PlaneThumbSize;
  isControlled: () => boolean;
  isInteractive: () => boolean;
  acceptsPlanePress: () => boolean;
  commitPointerValue: (source: PlaneValueChangeSource) => void;
  focus: () => void;
};

export type InternalPlaneContextValue = PlaneContextValue & {
  snapDefaults: PlaneSnapProps;
  activeThumbKey: string | null;
  registerThumb: (registration: PlaneThumbRegistration) => () => void;
  cancelThumbInteraction: (thumbKey: string) => void;
};
