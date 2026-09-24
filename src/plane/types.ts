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

export type PlaneValueChangeDetails = {
  interaction: PlaneInteraction;
  reason: PlaneValueChangeReason;
  thumbId?: string;
  originalEvent?: Event;
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

export type PlaneProps = Omit<
  React.ComponentProps<'div'>,
  'defaultValue' | 'onChange'
> & {
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
> & {
  thumbId?: string;
  pressBehavior?: PlaneThumbPressBehavior;
  value?: PlaneValue;
  defaultValue?: PlaneValue;
  onValueChange?: (value: PlaneValue, details: PlaneValueChangeDetails) => void;
  onValueCommit?: (value: PlaneValue, details: PlaneValueChangeDetails) => void;
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
  hovered: boolean;
  dragging: boolean;
  focused: boolean;
  focusVisible: boolean;
  disabled: boolean;
  readOnly: boolean;
};

// Internal types shared between Plane and PlaneThumb. Not exported publicly.

export type PlaneValueChangeSource = Pick<
  PlaneValueChangeDetails,
  'interaction' | 'reason' | 'originalEvent'
>;

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
  getValue: () => PlaneValue;
  beginRelativeDrag: () => PlaneValue;
  getHoverSize: () => PlaneThumbSize;
  isControlled: () => boolean;
  isInteractive: () => boolean;
  acceptsPlanePress: () => boolean;
  publishValue: (value: PlaneValue, source: PlaneValueChangeSource) => boolean;
  commitPointerValue: (source: PlaneValueChangeSource) => void;
  focus: () => void;
};

export type InternalPlaneContextValue = PlaneContextValue & {
  activeThumbKey: string | null;
  registerThumb: (registration: PlaneThumbRegistration) => () => void;
  cancelThumbInteraction: (thumbKey: string) => void;
};
