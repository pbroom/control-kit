import * as React from 'react';
import { getModifiedStep } from '../number-value.js';
import {
  getNextGridLine,
  quantizeToGrid,
  type PlaneGridAxes,
  type PlaneGridAxis,
} from './snap.js';
import type { PlaneValue } from './types.js';

export type PlaneAxis = 'x' | 'y';
export type PlaneArrowKey =
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'ArrowDown'
  | 'ArrowUp';

export const DEFAULT_SMALL_STEP = 0.001;
export const DEFAULT_STEP = 0.01;
export const DEFAULT_LARGE_STEP = 0.1;

const ARROW_REPEAT_DELAY = 300;
const ARROW_REPEAT_INTERVAL = 50;

export function isPlaneArrowKey(key: string): key is PlaneArrowKey {
  return (
    key === 'ArrowLeft' ||
    key === 'ArrowRight' ||
    key === 'ArrowDown' ||
    key === 'ArrowUp'
  );
}

export function getArrowChordValue(
  value: PlaneValue,
  keys: ReadonlySet<PlaneArrowKey>,
  amount: number,
): PlaneValue {
  // Unclamped; the thumb clamps to its own range when publishing.
  return {
    x:
      value.x +
      (keys.has('ArrowRight') ? amount : 0) -
      (keys.has('ArrowLeft') ? amount : 0),
    y:
      value.y +
      (keys.has('ArrowUp') ? amount : 0) -
      (keys.has('ArrowDown') ? amount : 0),
  };
}

export function getArrowStep(
  smallStep: number,
  step: number,
  largeStep: number,
  altKey: boolean,
  shiftKey: boolean,
) {
  return getModifiedStep(shiftKey, altKey, { smallStep, step, largeStep });
}

export function getAxisKeyValue(
  axis: PlaneAxis,
  key: string,
  value: PlaneValue,
  smallStep: number,
  step: number,
  largeStep: number,
  altKey: boolean,
  shiftKey: boolean,
  minimum: number,
): PlaneValue | null {
  const amount = getArrowStep(smallStep, step, largeStep, altKey, shiftKey);
  const nextValue = { ...value };

  if (key === 'Home') nextValue[axis] = minimum;
  else if (key === 'End') nextValue[axis] = 1;
  else if (key === 'ArrowLeft') nextValue.x -= amount;
  else if (key === 'ArrowRight') nextValue.x += amount;
  else if (key === 'ArrowDown') nextValue.y -= amount;
  else if (key === 'ArrowUp') nextValue.y += amount;
  else if (key === 'PageDown') nextValue[axis] -= largeStep;
  else if (key === 'PageUp') nextValue[axis] += largeStep;
  else return null;

  // Unclamped; the thumb clamps to its own range when publishing.
  return nextValue;
}

export type PlaneKeyboardSteps = {
  smallStep: number;
  step: number;
  largeStep: number;
};

/**
 * Moves one axis on a grid. A plain step goes to the next grid line in
 * `direction`; a large step goes `largeStep` further, rounded to the grid, but
 * always at least one line. Stays put when no line exists in that direction.
 */
export function getGridAxisStep(
  value: number,
  direction: 1 | -1,
  large: boolean,
  grid: Pick<PlaneGridAxis, 'size' | 'origin'>,
  largeStep: number,
  minimum: number,
): number {
  const next = getNextGridLine(value, direction, grid, minimum, 1);
  if (next === null) return value;
  if (!large) return next;
  const rounded = quantizeToGrid(
    value + direction * largeStep,
    grid,
    minimum,
    1,
  );
  if (rounded === null) return next;
  return direction > 0 ? Math.max(rounded, next) : Math.min(rounded, next);
}

/**
 * Arrow-chord stepping with grid snapping. Axes without a grid, and every
 * axis while Alt is held, step by the regular (modified) step amount.
 */
export function getGridArrowChordValue(
  value: PlaneValue,
  keys: ReadonlySet<PlaneArrowKey>,
  steps: PlaneKeyboardSteps,
  modifiers: { alt: boolean; shift: boolean },
  grid: PlaneGridAxes,
  minimum: number,
): PlaneValue {
  const amount = getArrowStep(
    steps.smallStep,
    steps.step,
    steps.largeStep,
    modifiers.alt,
    modifiers.shift,
  );
  const next = { ...value };
  const directions: Record<PlaneAxis, number> = {
    x: (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0),
    y: (keys.has('ArrowUp') ? 1 : 0) - (keys.has('ArrowDown') ? 1 : 0),
  };
  for (const axis of ['x', 'y'] as const) {
    const direction = directions[axis];
    if (direction === 0) continue;
    const gridAxis = grid[axis];
    next[axis] =
      gridAxis && !modifiers.alt
        ? getGridAxisStep(
            value[axis],
            direction > 0 ? 1 : -1,
            modifiers.shift,
            gridAxis,
            steps.largeStep,
            minimum,
          )
        : value[axis] + direction * amount;
  }
  return next;
}

/**
 * Home/End/PageUp/PageDown with a grid on `axis`: Home/End go to the
 * outermost grid line, Page keys take a large grid step. Returns null for
 * other keys or when the axis has no grid.
 */
export function getGridAxisKeyValue(
  axis: PlaneAxis,
  key: string,
  value: PlaneValue,
  largeStep: number,
  grid: PlaneGridAxes,
  minimum: number,
): PlaneValue | null {
  const gridAxis = grid[axis];
  if (!gridAxis) return null;
  const next = { ...value };
  if (key === 'Home' || key === 'End') {
    const bound = key === 'Home' ? minimum : 1;
    next[axis] = quantizeToGrid(bound, gridAxis, minimum, 1) ?? bound;
  } else if (key === 'PageUp' || key === 'PageDown') {
    next[axis] = getGridAxisStep(
      value[axis],
      key === 'PageUp' ? 1 : -1,
      true,
      gridAxis,
      largeStep,
      minimum,
    );
  } else {
    return null;
  }
  return next;
}

export function isOwnThumbEvent(event: React.SyntheticEvent<HTMLElement>) {
  return (
    event.target instanceof Element &&
    event.target.closest('[data-plane-thumb-key]') === event.currentTarget
  );
}

export function getKeyAxis(axis: PlaneAxis, key: string): PlaneAxis | null {
  if (key === 'ArrowLeft' || key === 'ArrowRight') return 'x';
  if (key === 'ArrowDown' || key === 'ArrowUp') return 'y';
  if (
    key === 'Home' ||
    key === 'End' ||
    key === 'PageDown' ||
    key === 'PageUp'
  ) {
    return axis;
  }
  return null;
}

/**
 * Held-arrow auto-repeat: after an initial delay, calls the latest
 * `applyRef.current` on a fixed interval until cancelled or unmounted.
 */
export function useArrowRepeat(applyRef: React.RefObject<() => void>) {
  const timeoutRef = React.useRef<number | null>(null);
  const intervalRef = React.useRef<number | null>(null);

  const cancelArrowRepeat = React.useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startArrowRepeat = React.useCallback(() => {
    if (timeoutRef.current !== null || intervalRef.current !== null) {
      return;
    }
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      applyRef.current();
      intervalRef.current = window.setInterval(() => {
        applyRef.current();
      }, ARROW_REPEAT_INTERVAL);
    }, ARROW_REPEAT_DELAY);
  }, [applyRef]);

  React.useEffect(() => cancelArrowRepeat, [cancelArrowRepeat]);

  return { cancelArrowRepeat, startArrowRepeat };
}
