// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../../../../__tests__/helpers/dom-polyfills.js';
import {
  GravityVectorExample,
  GRAVITY_BALL_COUNT,
} from './plane-examples/gravity-vector.js';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type AnimationFrameCallback = (time: number) => void;

const mountedRoots: Root[] = [];
let animationFrames = new Map<number, AnimationFrameCallback>();
let nextAnimationFrame = 1;
let now = 0;
let arcCalls: Array<{ x: number; y: number }> = [];

function pointer(target: Element, type: string, clientY: number) {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      button: 0,
      clientX: 110,
      clientY,
      pointerId: 7,
    }),
  );
}

function runFrames(count: number) {
  act(() => {
    for (let frame = 0; frame < count; frame += 1) {
      const callbacks = [...animationFrames.values()];
      animationFrames.clear();
      now += 1000 / 60;
      callbacks.forEach((callback) => callback(now));
    }
  });
}

function meanLatestBallY(ballCount: number) {
  const latest = arcCalls.slice(-ballCount);
  expect(latest).toHaveLength(ballCount);
  return latest.reduce((sum, ball) => sum + ball.y, 0) / latest.length;
}

beforeEach(() => {
  animationFrames = new Map();
  nextAnimationFrame = 1;
  now = 0;
  arcCalls = [];

  Object.defineProperties(HTMLElement.prototype, {
    setPointerCapture: { configurable: true, value: vi.fn() },
    hasPointerCapture: { configurable: true, value: vi.fn(() => true) },
    releasePointerCapture: { configurable: true, value: vi.fn() },
  });
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    configurable: true,
    value: class {
      observe() {}
      disconnect() {}
    },
  });
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    const id = nextAnimationFrame;
    nextAnimationFrame += 1;
    animationFrames.set(id, callback);
    return id;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    animationFrames.delete(id);
  });

  const context = {
    arc: vi.fn((x: number, y: number) => arcCalls.push({ x, y })),
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    clip: vi.fn(),
    closePath: vi.fn(),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    fill: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    setTransform: vi.fn(),
    stroke: vi.fn(),
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(
    HTMLCanvasElement.prototype,
    'getBoundingClientRect',
  ).mockReturnValue({
    left: 0,
    top: 0,
    width: 300,
    height: 300,
    right: 300,
    bottom: 300,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
});

afterEach(() => {
  for (const root of mountedRoots.splice(0)) {
    act(() => root.unmount());
  }
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('GravityVectorExample', () => {
  it('points and settles toward the Plane pointer vertically', () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    mountedRoots.push(root);

    act(() => root.render(<GravityVectorExample />));

    const plane = container.querySelector(
      '[role="group"][aria-label="Gravity vector"]',
    ) as HTMLElement;
    vi.spyOn(plane, 'getBoundingClientRect').mockReturnValue({
      left: 10,
      top: 20,
      width: 200,
      height: 100,
      right: 210,
      bottom: 120,
      x: 10,
      y: 20,
      toJSON: () => ({}),
    });

    act(() => {
      pointer(plane, 'pointerdown', 20);
      pointer(plane, 'pointerup', 20);
    });
    expect(
      Number(plane.querySelector('line')?.getAttribute('y2')),
    ).toBeLessThan(50);
    runFrames(600);
    expect(meanLatestBallY(GRAVITY_BALL_COUNT)).toBeGreaterThan(40);

    act(() => {
      pointer(plane, 'pointerdown', 120);
      pointer(plane, 'pointerup', 120);
    });
    expect(
      Number(plane.querySelector('line')?.getAttribute('y2')),
    ).toBeGreaterThan(50);
    runFrames(1_200);
    expect(meanLatestBallY(GRAVITY_BALL_COUNT)).toBeLessThan(-40);
  });

  it('keeps all sixteen balls at the center, edges, and after keyboard input', () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    mountedRoots.push(root);

    act(() => root.render(<GravityVectorExample />));

    const plane = container.querySelector(
      '[role="group"][aria-label="Gravity vector"]',
    ) as HTMLElement;
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    vi.spyOn(plane, 'getBoundingClientRect').mockReturnValue({
      left: 10,
      top: 20,
      width: 200,
      height: 100,
      right: 210,
      bottom: 120,
      x: 10,
      y: 20,
      toJSON: () => ({}),
    });

    expect(canvas.dataset.ballCount).toBe(String(GRAVITY_BALL_COUNT));
    expect(canvas.getAttribute('aria-label')).toContain('16 balls');

    for (const clientY of [70, 20, 120]) {
      act(() => {
        pointer(plane, 'pointerdown', clientY);
        pointer(plane, 'pointerup', clientY);
      });
      runFrames(2);
      expect(canvas.dataset.ballCount).toBe(String(GRAVITY_BALL_COUNT));
      expect(arcCalls.slice(-GRAVITY_BALL_COUNT)).toHaveLength(
        GRAVITY_BALL_COUNT,
      );
    }

    const gravityY = container.querySelector(
      'input[aria-label="Gravity Y"]',
    ) as HTMLElement;
    act(() => {
      gravityY.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowUp' }),
      );
    });
    runFrames(2);
    expect(canvas.dataset.ballCount).toBe(String(GRAVITY_BALL_COUNT));
    expect(container.textContent).not.toContain('Center · 1');
    expect(container.textContent).not.toContain('Edge · 8');
    expect(container.textContent).not.toContain('one to eight balls');
  });
});
