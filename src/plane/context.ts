import * as React from 'react';
import type {
  InternalPlaneContextValue,
  PlaneContextValue,
  PlaneThumbContextValue,
} from './types.js';

export const PlaneContext =
  React.createContext<InternalPlaneContextValue | null>(null);
export const PlaneThumbContext =
  React.createContext<PlaneThumbContextValue | null>(null);

// Nested thumbs render outside their parent's element so their percentage
// positions resolve against the plane. Each parent owns a `display: contents`
// container placed directly after its own element, so descendants keep the
// logical (JSX) order in the DOM and therefore in sequential focus order.
export type NestedThumbSlotContextValue = {
  container: HTMLDivElement | null;
  register: () => () => void;
};
export const NestedThumbSlotContext =
  React.createContext<NestedThumbSlotContextValue | null>(null);

export function assignRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') {
    ref(value);
    return;
  }

  if (ref) ref.current = value;
}

export function useInternalPlaneContext() {
  const context = React.useContext(PlaneContext);

  if (!context) {
    throw new Error('usePlaneContext must be used inside a Plane.');
  }

  return context;
}

export function usePlaneContext(): PlaneContextValue {
  return useInternalPlaneContext();
}

export function usePlaneThumbContext(): PlaneThumbContextValue {
  const context = React.useContext(PlaneThumbContext);

  if (!context) {
    throw new Error('usePlaneThumbContext must be used inside a PlaneThumb.');
  }

  return context;
}
