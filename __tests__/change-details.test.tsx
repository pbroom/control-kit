// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getControlFieldInteraction,
  getControlInteraction,
  Plane,
  PlaneThumb,
  Slider,
  type PlaneValueChangeDetails,
} from '../src/index.js';
import './helpers/dom-polyfills.js';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const roots: Root[] = [];

function render(ui: ReactNode) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  act(() => root.render(ui));
  return container;
}

beforeEach(() => {
  Object.defineProperties(HTMLElement.prototype, {
    setPointerCapture: { configurable: true, value: vi.fn() },
    hasPointerCapture: { configurable: true, value: vi.fn(() => true) },
    releasePointerCapture: { configurable: true, value: vi.fn() },
  });
});

afterEach(() => {
  act(() => roots.splice(0).forEach((root) => root.unmount()));
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('getControlInteraction', () => {
  it.each([
    ['input-change', 'text-input'],
    ['input-clear', 'text-input'],
    ['input-blur', 'text-input'],
    ['input-commit', 'text-input'],
    ['input-paste', 'text-input'],
    ['expression', 'text-input'],
    ['keyboard', 'keyboard'],
    ['page-step', 'keyboard'],
    ['boundary-key', 'keyboard'],
    ['scrub', 'pointer'],
    ['increment-press', 'pointer'],
    ['decrement-press', 'pointer'],
    ['wheel', 'pointer'],
    ['drag', 'pointer'],
    ['track-press', 'pointer'],
    ['thumb-drag', 'pointer'],
    ['plane-press', 'pointer'],
  ])('reads the reason %s as %s', (reason, interaction) => {
    expect(getControlInteraction({ reason })).toBe(interaction);
  });

  it('prefers the interaction a control already set', () => {
    expect(
      getControlInteraction({
        reason: 'external-value-change',
        interaction: 'programmatic',
        event: new KeyboardEvent('keydown'),
      }),
    ).toBe('programmatic');
  });

  it('falls back to the native event for a reason it does not know', () => {
    const read = (event: Event) =>
      getControlInteraction({ reason: 'none', event });
    expect(read(new KeyboardEvent('keydown'))).toBe('keyboard');
    expect(read(new PointerEvent('pointerdown'))).toBe('pointer');
    expect(read(new MouseEvent('click', { detail: 1 }))).toBe('pointer');
    expect(read(new MouseEvent('click', { detail: 0 }))).toBe('keyboard');
    expect(read(new Event('input'))).toBe('text-input');
    expect(read(new Event('focusout'))).toBe('programmatic');
  });

  it('reads a change with no reason it knows and no event as programmatic', () => {
    expect(getControlInteraction({ reason: 'none' })).toBe('programmatic');
  });

  it('agrees with getControlFieldInteraction for every ControlField reason', () => {
    for (const reason of [
      'input-change',
      'input-clear',
      'input-blur',
      'input-commit',
      'input-paste',
      'expression',
      'keyboard',
      'page-step',
      'boundary-key',
      'scrub',
      'increment-press',
      'decrement-press',
      'wheel',
    ]) {
      expect(getControlInteraction({ reason })).toBe(
        getControlFieldInteraction({ reason }),
      );
    }
    expect(getControlFieldInteraction({ reason: 'none' })).toBe('text-input');
  });
});

describe('shared change details across controls', () => {
  it('reports a Plane press and key with `event`, read as pointer and keyboard', () => {
    const onValueChange = vi.fn();
    const onValueCommitted = vi.fn();
    const container = render(
      <Plane aria-label="Position">
        <PlaneThumb
          defaultValue={{ x: 0.5, y: 0.5 }}
          onValueChange={onValueChange}
          onValueCommitted={onValueCommitted}
        />
      </Plane>,
    );
    const plane = container.querySelector<HTMLElement>('[data-slot="plane"]')!;
    vi.spyOn(plane, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 100,
      height: 100,
      right: 100,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    const pointer = (type: string) =>
      act(() => {
        plane.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerId: 1,
            pointerType: 'mouse',
            button: 0,
            buttons: type === 'pointerup' ? 0 : 1,
            isPrimary: true,
            clientX: 25,
            clientY: 25,
          }),
        );
      });
    pointer('pointerdown');
    pointer('pointerup');

    for (const callback of [onValueChange, onValueCommitted]) {
      const details: PlaneValueChangeDetails = callback.mock.lastCall![1];
      expect(details.event).toBeInstanceOf(PointerEvent);
      expect(details.event).toBe(details.originalEvent);
      expect(getControlInteraction(details)).toBe('pointer');
    }

    const axis = container.querySelector<HTMLInputElement>(
      '[data-plane-axis="x"]',
    )!;
    act(() => {
      axis.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowRight',
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    const keyed: PlaneValueChangeDetails = onValueChange.mock.lastCall![1];
    expect(keyed.event).toBeInstanceOf(KeyboardEvent);
    expect(keyed.event).toBe(keyed.originalEvent);
    expect(getControlInteraction(keyed)).toBe('keyboard');
  });

  it('reads a Slider key step as keyboard', () => {
    const onValueChange = vi.fn();
    const container = render(
      <Slider
        aria-label="Flow"
        defaultValue={25}
        onValueChange={onValueChange}
      />,
    );
    act(() => {
      container.querySelector('input')!.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowRight',
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    expect(onValueChange).toHaveBeenCalled();
    expect(getControlInteraction(onValueChange.mock.lastCall![1])).toBe(
      'keyboard',
    );
  });
});
