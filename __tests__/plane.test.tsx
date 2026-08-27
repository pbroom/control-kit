// @vitest-environment jsdom

import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Plane,
  PlaneThumb,
  clampPlaneValue,
  getPlaneValueFromPoint,
  usePlaneThumbContext,
  type PlaneProps,
  type PlaneThumbProps,
  type PlaneValue,
} from '../src/plane.js';
import './helpers/dom-polyfills.js';

const mountedRoots: Root[] = [];

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type MountPlaneProps = Partial<
  PlaneProps &
    Pick<
      PlaneThumbProps,
      'defaultValue' | 'value' | 'onValueChange' | 'onValueCommit'
    >
>;

function mountPlane(
  props: MountPlaneProps = {},
  thumbProps: Partial<PlaneThumbProps> = {},
) {
  const { children: thumbChildren = 'Target', ...resolvedThumbProps } =
    thumbProps;
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push(root);

  function render(nextProps: MountPlaneProps = props) {
    const {
      defaultValue = { x: 0.25, y: 0.75 },
      value,
      onValueChange,
      onValueCommit,
      ...planeProps
    } = nextProps;

    act(() => {
      root.render(
        <Plane {...planeProps}>
          <span data-testid="guide">Guide</span>
          <PlaneThumb
            data-testid="thumb"
            defaultValue={defaultValue}
            value={value}
            onValueChange={onValueChange}
            onValueCommit={onValueCommit}
            {...resolvedThumbProps}
          >
            {thumbChildren}
          </PlaneThumb>
        </Plane>,
      );
    });
  }

  render();

  const plane = container.querySelector('[data-slot="plane"]') as HTMLElement;
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

  return { container, plane, render };
}

type MultiThumbConfig = {
  id: string;
  value?: PlaneValue;
  defaultValue?: PlaneValue;
  disabled?: boolean;
  readOnly?: boolean;
  onValueChange?: PlaneThumbProps['onValueChange'];
  onValueCommit?: PlaneThumbProps['onValueCommit'];
};

function mountMultiPlane(
  thumbs: MultiThumbConfig[],
  planeProps: Partial<PlaneProps> = {},
) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push(root);

  function render(
    nextThumbs: MultiThumbConfig[] = thumbs,
    nextPlaneProps: Partial<PlaneProps> = planeProps,
  ) {
    act(() => {
      root.render(
        <Plane {...nextPlaneProps}>
          {nextThumbs.map((thumb) => (
            <PlaneThumb
              key={thumb.id}
              data-testid={`thumb-${thumb.id}`}
              thumbId={thumb.id}
              aria-label={thumb.id}
              value={thumb.value}
              defaultValue={thumb.defaultValue}
              disabled={thumb.disabled}
              readOnly={thumb.readOnly}
              onValueChange={thumb.onValueChange}
              onValueCommit={thumb.onValueCommit}
            />
          ))}
        </Plane>,
      );
    });
  }

  render();

  const plane = container.querySelector('[data-slot="plane"]') as HTMLElement;
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

  const getThumb = (id: string) =>
    container.querySelector(`[data-testid="thumb-${id}"]`) as HTMLElement;

  return { container, getThumb, plane, render };
}

function pointer(target: Element, type: string, init: PointerEventInit = {}) {
  const event = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    pointerId: 7,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

function key(
  target: Element,
  type: 'keydown' | 'keyup',
  value: string,
  shiftKey = false,
  repeat = false,
) {
  const event = new KeyboardEvent(type, {
    bubbles: true,
    cancelable: true,
    key: value,
    shiftKey,
    repeat,
  });
  target.dispatchEvent(event);
  return event;
}

function details(
  expected: Record<string, unknown>,
): ReturnType<typeof expect.objectContaining> {
  return expect.objectContaining(expected);
}

function PlaneThumbStateProbe() {
  const state = usePlaneThumbContext();

  return (
    <output data-testid="thumb-state">
      {JSON.stringify({
        ...state,
        value: `${state.value.x},${state.value.y}`,
      })}
    </output>
  );
}

function readThumbState(container: HTMLElement) {
  return JSON.parse(
    container.querySelector('[data-testid="thumb-state"]')?.textContent ?? '{}',
  ) as Omit<ReturnType<typeof usePlaneThumbContext>, 'value'> & {
    value: string;
  };
}

beforeEach(() => {
  Object.defineProperties(HTMLElement.prototype, {
    setPointerCapture: {
      configurable: true,
      value: vi.fn(),
    },
    hasPointerCapture: {
      configurable: true,
      value: vi.fn(() => true),
    },
    releasePointerCapture: {
      configurable: true,
      value: vi.fn(),
    },
  });
});

afterEach(() => {
  for (const root of mountedRoots.splice(0)) {
    act(() => root.unmount());
  }
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('Plane helpers', () => {
  it('normalizes values and converts DOM points into Cartesian coordinates', () => {
    expect(clampPlaneValue({ x: -2, y: 3 })).toEqual({ x: 0, y: 1 });
    expect(
      getPlaneValueFromPoint(
        { clientX: 60, clientY: 95 },
        { left: 10, top: 20, width: 100, height: 100 },
      ),
    ).toEqual({ x: 0.5, y: 0.25 });
  });
});

describe('Plane', () => {
  it('renders arbitrary children and positions an uncontrolled thumb', () => {
    const { container, plane } = mountPlane();
    const thumb = container.querySelector(
      '[data-slot="plane-thumb"]',
    ) as HTMLElement;

    expect(plane.getAttribute('role')).toBe('group');
    expect(plane.getAttribute('aria-roledescription')).toBe('2D control');
    expect(container.querySelector('[data-testid="guide"]')?.textContent).toBe(
      'Guide',
    );
    expect(thumb.style.left).toBe('25%');
    expect(thumb.style.top).toBe('25%');
  });

  it('drags with pointer capture, clamps at the edges, and commits on release', () => {
    const onValueChange = vi.fn();
    const onValueCommit = vi.fn();
    const { plane } = mountPlane({ onValueChange, onValueCommit });

    act(() => pointer(plane, 'pointerdown', { clientX: 110, clientY: 45 }));
    expect(onValueChange).toHaveBeenLastCalledWith(
      { x: 0.5, y: 0.75 },
      details({ interaction: 'pointer', reason: 'plane-press' }),
    );
    expect(plane.hasAttribute('data-dragging')).toBe(true);
    expect(plane.setPointerCapture).toHaveBeenCalledWith(7);

    act(() => pointer(plane, 'pointermove', { clientX: 300, clientY: 200 }));
    expect(onValueChange).toHaveBeenLastCalledWith(
      { x: 1, y: 0 },
      details({ interaction: 'pointer', reason: 'plane-press' }),
    );

    act(() => pointer(plane, 'pointerup', { clientX: 300, clientY: 200 }));
    expect(onValueCommit).toHaveBeenCalledWith(
      { x: 1, y: 0 },
      details({ interaction: 'pointer', reason: 'plane-press' }),
    );
    expect(plane.hasAttribute('data-dragging')).toBe(false);
    expect(plane.releasePointerCapture).toHaveBeenCalledWith(7);
    expect(plane.getBoundingClientRect).toHaveBeenCalledOnce();
    expect(onValueChange.mock.lastCall?.[1].originalEvent).toBeInstanceOf(
      PointerEvent,
    );
    expect(onValueCommit.mock.lastCall?.[1].originalEvent).toBeInstanceOf(
      PointerEvent,
    );
  });

  it('ignores other pointers during a drag', () => {
    const onValueChange = vi.fn();
    const { plane } = mountPlane({ onValueChange });

    act(() => pointer(plane, 'pointerdown', { clientX: 60, clientY: 70 }));
    act(() =>
      pointer(plane, 'pointermove', {
        clientX: 200,
        clientY: 30,
        pointerId: 9,
      }),
    );

    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it('reports normalized hover values without repeated layout reads', () => {
    const onHoverValueChange = vi.fn();
    const { plane } = mountPlane({ onHoverValueChange });

    act(() =>
      pointer(plane, 'pointerover', {
        clientX: 60,
        clientY: 95,
        pointerType: 'mouse',
      }),
    );
    act(() =>
      pointer(plane, 'pointermove', {
        clientX: 60,
        clientY: 95,
        pointerType: 'mouse',
      }),
    );
    act(() =>
      pointer(plane, 'pointermove', {
        clientX: 160,
        clientY: 95,
        pointerType: 'mouse',
      }),
    );
    act(() =>
      pointer(plane, 'pointerout', {
        clientX: 300,
        clientY: 200,
        pointerType: 'mouse',
      }),
    );

    expect(onHoverValueChange).toHaveBeenNthCalledWith(
      1,
      { x: 0.25, y: 0.25 },
      details({ pointerType: 'mouse' }),
    );
    expect(onHoverValueChange).toHaveBeenNthCalledWith(
      2,
      { x: 0.75, y: 0.25 },
      details({ pointerType: 'mouse' }),
    );
    expect(onHoverValueChange).toHaveBeenNthCalledWith(
      3,
      null,
      details({ pointerType: 'mouse' }),
    );
    expect(onHoverValueChange).toHaveBeenCalledTimes(3);
    expect(plane.getBoundingClientRect).toHaveBeenCalledOnce();
    expect(onHoverValueChange.mock.calls[0][1].originalEvent).toBeInstanceOf(
      PointerEvent,
    );
  });

  it('restores the remaining hover value when overlapping pointers leave', () => {
    const onHoverValueChange = vi.fn();
    const { plane } = mountPlane({ onHoverValueChange });

    act(() =>
      pointer(plane, 'pointerover', {
        clientX: 60,
        clientY: 95,
        pointerId: 1,
        pointerType: 'mouse',
      }),
    );
    act(() =>
      pointer(plane, 'pointerover', {
        clientX: 160,
        clientY: 45,
        pointerId: 2,
        pointerType: 'pen',
      }),
    );
    act(() =>
      pointer(plane, 'pointerout', {
        clientX: 300,
        clientY: 200,
        pointerId: 2,
        pointerType: 'pen',
      }),
    );
    act(() =>
      pointer(plane, 'pointerout', {
        clientX: 300,
        clientY: 200,
        pointerId: 1,
        pointerType: 'mouse',
      }),
    );

    expect(onHoverValueChange.mock.calls.map(([value]) => value)).toEqual([
      { x: 0.25, y: 0.25 },
      { x: 0.75, y: 0.75 },
      { x: 0.25, y: 0.25 },
      null,
    ]);
  });

  it('clears hover values instead of reporting clamped positions outside the plane', () => {
    const onHoverValueChange = vi.fn();
    const onValueChange = vi.fn();
    const { plane } = mountPlane({ onHoverValueChange, onValueChange });

    act(() =>
      pointer(plane, 'pointerover', {
        clientX: 110,
        clientY: 70,
        pointerType: 'mouse',
      }),
    );
    act(() =>
      pointer(plane, 'pointerdown', {
        clientX: 110,
        clientY: 70,
        pointerType: 'mouse',
      }),
    );
    act(() =>
      pointer(plane, 'pointermove', {
        clientX: 300,
        clientY: 200,
        pointerType: 'mouse',
      }),
    );

    expect(onValueChange).toHaveBeenLastCalledWith(
      { x: 1, y: 0 },
      details({ interaction: 'pointer', reason: 'plane-press' }),
    );
    expect(onHoverValueChange.mock.calls.map(([value]) => value)).toEqual([
      { x: 0.5, y: 0.5 },
      null,
    ]);

    act(() =>
      pointer(plane, 'pointermove', {
        clientX: 160,
        clientY: 45,
        pointerType: 'mouse',
      }),
    );
    expect(onHoverValueChange).toHaveBeenLastCalledWith(
      { x: 0.75, y: 0.75 },
      details({ pointerType: 'mouse' }),
    );
  });

  it('ignores touch hover values and avoids geometry work without a callback', () => {
    const onHoverValueChange = vi.fn();
    const { plane } = mountPlane({ onHoverValueChange });

    act(() =>
      pointer(plane, 'pointerover', {
        clientX: 60,
        clientY: 95,
        pointerType: 'touch',
      }),
    );
    act(() =>
      pointer(plane, 'pointermove', {
        clientX: 110,
        clientY: 70,
        pointerType: 'touch',
      }),
    );
    act(() =>
      pointer(plane, 'pointerout', {
        clientX: 110,
        clientY: 70,
        pointerType: 'touch',
      }),
    );

    expect(onHoverValueChange).not.toHaveBeenCalled();
    expect(plane.getBoundingClientRect).not.toHaveBeenCalled();

    const { plane: planeWithoutCallback } = mountPlane();
    act(() =>
      pointer(planeWithoutCallback, 'pointerover', {
        clientX: 60,
        clientY: 95,
        pointerType: 'mouse',
      }),
    );
    act(() =>
      pointer(planeWithoutCallback, 'pointermove', {
        clientX: 110,
        clientY: 70,
        pointerType: 'mouse',
      }),
    );

    expect(planeWithoutCallback.getBoundingClientRect).not.toHaveBeenCalled();
  });

  it('composes and lets native pointer handlers cancel hover reporting', () => {
    const onHoverValueChange = vi.fn();
    const onPointerEnter = vi.fn((event: React.PointerEvent<HTMLDivElement>) =>
      event.preventDefault(),
    );
    const onPointerMove = vi.fn((event: React.PointerEvent<HTMLDivElement>) =>
      event.preventDefault(),
    );
    const { plane } = mountPlane({
      onHoverValueChange,
      onPointerEnter,
      onPointerMove,
    });

    act(() =>
      pointer(plane, 'pointerover', {
        clientX: 60,
        clientY: 95,
        pointerType: 'pen',
      }),
    );
    act(() =>
      pointer(plane, 'pointermove', {
        clientX: 110,
        clientY: 70,
        pointerType: 'pen',
      }),
    );

    expect(onPointerEnter).toHaveBeenCalledOnce();
    expect(onPointerMove).toHaveBeenCalledOnce();
    expect(onHoverValueChange).not.toHaveBeenCalled();
  });

  it('does not let a second pointer take over an active drag', () => {
    const onValueChange = vi.fn();
    const onValueCommit = vi.fn();
    const { plane } = mountPlane({ onValueChange, onValueCommit });

    act(() => pointer(plane, 'pointerdown', { clientX: 60, clientY: 70 }));
    act(() =>
      pointer(plane, 'pointerdown', {
        clientX: 180,
        clientY: 30,
        pointerId: 9,
      }),
    );
    act(() => pointer(plane, 'pointermove', { clientX: 110, clientY: 45 }));
    act(() => pointer(plane, 'pointerup', { clientX: 110, clientY: 45 }));

    expect(onValueChange).toHaveBeenCalledTimes(2);
    expect(onValueChange).toHaveBeenLastCalledWith(
      { x: 0.5, y: 0.75 },
      details({ interaction: 'pointer', reason: 'plane-press' }),
    );
    expect(onValueCommit).toHaveBeenCalledTimes(1);
  });

  it('always tears down a drag when release handling is cancelled', () => {
    const onValueChange = vi.fn();
    const { plane } = mountPlane({
      onValueChange,
      onPointerUp: (event) => event.preventDefault(),
    });

    act(() => pointer(plane, 'pointerdown', { clientX: 60, clientY: 70 }));
    act(() => pointer(plane, 'pointerup', { clientX: 110, clientY: 45 }));
    act(() => pointer(plane, 'pointermove', { clientX: 180, clientY: 30 }));

    expect(plane.hasAttribute('data-dragging')).toBe(false);
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it('tears down and commits after unexpected pointer capture loss', () => {
    const onValueChange = vi.fn();
    const onValueCommit = vi.fn();
    const { plane } = mountPlane({ onValueChange, onValueCommit });

    act(() => pointer(plane, 'pointerdown', { clientX: 60, clientY: 70 }));
    act(() => pointer(plane, 'lostpointercapture'));
    act(() => pointer(plane, 'pointermove', { clientX: 180, clientY: 30 }));

    expect(plane.hasAttribute('data-dragging')).toBe(false);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueCommit).toHaveBeenCalledTimes(1);
  });

  it.each([{ disabled: true }, { readOnly: true }])(
    'cancels an active drag when the plane becomes noninteractive',
    (mode) => {
      const onValueChange = vi.fn();
      const onValueCommit = vi.fn();
      const { plane, render } = mountPlane({
        onValueChange,
        onValueCommit,
      });

      act(() => pointer(plane, 'pointerdown', { clientX: 60, clientY: 70 }));
      render({ ...mode, onValueChange, onValueCommit });
      act(() => pointer(plane, 'pointermove', { clientX: 180, clientY: 30 }));
      act(() => pointer(plane, 'pointerup', { clientX: 180, clientY: 30 }));

      expect(plane.hasAttribute('data-dragging')).toBe(false);
      expect(plane.releasePointerCapture).toHaveBeenCalledWith(7);
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueCommit).not.toHaveBeenCalled();
    },
  );

  it('reports controlled changes without moving until the value prop changes', () => {
    const onValueChange = vi.fn();
    const controlledProps = {
      value: { x: 0.1, y: 0.2 },
      onValueChange,
    };
    const { container, plane, render } = mountPlane(controlledProps);

    act(() => pointer(plane, 'pointerdown', { clientX: 170, clientY: 40 }));
    expect(onValueChange).toHaveBeenCalledWith(
      { x: 0.8, y: 0.8 },
      details({ interaction: 'pointer', reason: 'plane-press' }),
    );
    expect(
      (container.querySelector('[data-slot="plane-thumb"]') as HTMLElement)
        .style.left,
    ).toBe('10%');

    render({ ...controlledProps, value: { x: 0.8, y: 0.8 } });
    expect(
      (container.querySelector('[data-slot="plane-thumb"]') as HTMLElement)
        .style.left,
    ).toBe('80%');
  });

  it('supports per-axis keyboard movement and separate commit events', () => {
    const onValueChange = vi.fn();
    const onValueCommit = vi.fn();
    const { container } = mountPlane({ onValueChange, onValueCommit });
    const xInput = container.querySelector(
      '[data-plane-axis="x"]',
    ) as HTMLInputElement;
    const yInput = container.querySelector(
      '[data-plane-axis="y"]',
    ) as HTMLInputElement;

    expect(xInput.tabIndex).toBe(0);
    expect(yInput.tabIndex).toBe(-1);

    act(() => key(xInput, 'keydown', 'ArrowRight'));
    expect(onValueChange).toHaveBeenLastCalledWith(
      { x: 0.26, y: 0.75 },
      details({ interaction: 'keyboard', reason: 'keyboard' }),
    );
    expect(onValueCommit).not.toHaveBeenCalled();

    act(() => key(xInput, 'keyup', 'ArrowRight'));
    expect(onValueCommit).toHaveBeenLastCalledWith(
      { x: 0.26, y: 0.75 },
      details({ interaction: 'keyboard', reason: 'keyboard' }),
    );
    expect(onValueChange.mock.lastCall?.[1].originalEvent).toBeInstanceOf(
      KeyboardEvent,
    );
    expect(onValueCommit.mock.lastCall?.[1].originalEvent).toBeInstanceOf(
      KeyboardEvent,
    );

    act(() => key(yInput, 'keydown', 'ArrowDown', true));
    expect(onValueChange).toHaveBeenLastCalledWith(
      { x: 0.26, y: 0.65 },
      details({ interaction: 'keyboard', reason: 'keyboard' }),
    );

    act(() => key(yInput, 'keydown', 'Home'));
    expect(onValueChange).toHaveBeenLastCalledWith(
      { x: 0.26, y: 0 },
      details({ interaction: 'keyboard', reason: 'keyboard' }),
    );
  });

  it('moves both axes from the focused thumb control with all four arrows', () => {
    const onValueChange = vi.fn();
    const onValueCommit = vi.fn();
    const { container } = mountPlane({ onValueChange, onValueCommit });
    const thumb = container.querySelector(
      '[data-slot="plane-thumb"]',
    ) as HTMLElement;
    const xInput = container.querySelector(
      '[data-plane-axis="x"]',
    ) as HTMLInputElement;
    const yInput = container.querySelector(
      '[data-plane-axis="y"]',
    ) as HTMLInputElement;

    act(() => xInput.focus());
    expect(thumb.getAttribute('data-focused')).toBe('true');

    const pressFocusedArrow = (arrow: string, shiftKey = false) => {
      act(() => {
        expect(
          key(document.activeElement!, 'keydown', arrow, shiftKey)
            .defaultPrevented,
        ).toBe(true);
        key(document.activeElement!, 'keyup', arrow, shiftKey);
      });
    };

    pressFocusedArrow('ArrowLeft');
    expect(document.activeElement).toBe(xInput);
    pressFocusedArrow('ArrowRight');
    expect(document.activeElement).toBe(xInput);
    pressFocusedArrow('ArrowUp');
    expect(document.activeElement).toBe(yInput);
    expect(xInput.tabIndex).toBe(-1);
    expect(yInput.tabIndex).toBe(0);
    pressFocusedArrow('ArrowDown');
    expect(document.activeElement).toBe(yInput);
    pressFocusedArrow('ArrowLeft');
    expect(document.activeElement).toBe(xInput);
    expect(xInput.tabIndex).toBe(0);
    expect(yInput.tabIndex).toBe(-1);
    pressFocusedArrow('ArrowRight');
    expect(document.activeElement).toBe(xInput);
    pressFocusedArrow('ArrowUp', true);
    expect(document.activeElement).toBe(yInput);

    expect(onValueChange.mock.calls.map(([value]) => value)).toEqual([
      { x: 0.24, y: 0.75 },
      { x: 0.25, y: 0.75 },
      { x: 0.25, y: 0.76 },
      { x: 0.25, y: 0.75 },
      { x: 0.24, y: 0.75 },
      { x: 0.25, y: 0.75 },
      { x: 0.25, y: 0.85 },
    ]);
    expect(onValueCommit).toHaveBeenCalledTimes(7);

    act(() => {
      expect(
        key(document.activeElement!, 'keydown', 'Tab').defaultPrevented,
      ).toBe(false);
    });
  });

  it('moves diagonally while horizontal and vertical arrows are held', () => {
    const onValueChange = vi.fn();
    const onValueCommit = vi.fn();
    const { container } = mountPlane({ onValueChange, onValueCommit });
    const xInput = container.querySelector(
      '[data-plane-axis="x"]',
    ) as HTMLInputElement;

    act(() => xInput.focus());
    act(() => {
      key(document.activeElement!, 'keydown', 'ArrowRight');
    });
    act(() => {
      key(document.activeElement!, 'keydown', 'ArrowUp');
    });
    act(() => {
      key(document.activeElement!, 'keydown', 'ArrowUp');
    });

    expect(onValueChange.mock.calls.map(([value]) => value)).toEqual([
      { x: 0.26, y: 0.75 },
      { x: 0.27, y: 0.76 },
      { x: 0.28, y: 0.77 },
    ]);

    act(() => {
      key(document.activeElement!, 'keyup', 'ArrowUp');
    });
    expect(onValueCommit).not.toHaveBeenCalled();
    act(() => {
      key(document.activeElement!, 'keyup', 'ArrowRight');
    });
    expect(onValueCommit).toHaveBeenCalledOnce();
    expect(onValueCommit).toHaveBeenCalledWith(
      { x: 0.28, y: 0.77 },
      details({ interaction: 'keyboard', reason: 'keyboard' }),
    );
  });

  it('continues a held direction after another arrow is released', () => {
    vi.useFakeTimers();
    try {
      const onValueChange = vi.fn();
      const onValueCommit = vi.fn();
      const { container } = mountPlane({ onValueChange, onValueCommit });
      const xInput = container.querySelector(
        '[data-plane-axis="x"]',
      ) as HTMLInputElement;

      act(() => xInput.focus());
      act(() => {
        key(document.activeElement!, 'keydown', 'ArrowDown');
        key(document.activeElement!, 'keydown', 'ArrowLeft');
        vi.advanceTimersByTime(350);
      });

      const valueWhileBothAreHeld = onValueChange.mock.lastCall?.[0] as
        | PlaneValue
        | undefined;
      expect(valueWhileBothAreHeld).toBeDefined();

      const changeCountBeforeNativeRepeat = onValueChange.mock.calls.length;
      act(() => {
        key(document.activeElement!, 'keydown', 'ArrowLeft', false, true);
      });
      expect(onValueChange).toHaveBeenCalledTimes(
        changeCountBeforeNativeRepeat,
      );

      act(() => {
        key(document.activeElement!, 'keyup', 'ArrowLeft');
        vi.advanceTimersByTime(100);
      });

      const valueAfterLeftIsReleased = onValueChange.mock.lastCall?.[0] as
        | PlaneValue
        | undefined;
      expect(valueAfterLeftIsReleased?.x).toBe(valueWhileBothAreHeld?.x);
      expect(valueAfterLeftIsReleased?.y).toBeLessThan(
        valueWhileBothAreHeld?.y ?? 0,
      );
      expect(onValueCommit).not.toHaveBeenCalled();

      act(() => {
        key(document.activeElement!, 'keyup', 'ArrowDown');
      });
      expect(onValueCommit).toHaveBeenCalledOnce();
      expect(onValueCommit).toHaveBeenCalledWith(
        valueAfterLeftIsReleased,
        details({ interaction: 'keyboard', reason: 'keyboard' }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('lets a thumb key handler cancel internal keyboard movement', () => {
    const onValueChange = vi.fn();
    const onKeyDown = vi.fn((event: React.KeyboardEvent<HTMLDivElement>) =>
      event.preventDefault(),
    );
    const { container } = mountPlane({ onValueChange }, { onKeyDown });
    const xInput = container.querySelector(
      '[data-plane-axis="x"]',
    ) as HTMLInputElement;

    act(() => {
      key(xInput, 'keydown', 'ArrowUp');
    });

    expect(onKeyDown).toHaveBeenCalledOnce();
    expect(onValueChange).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(
      container.querySelector('[data-plane-axis="y"]'),
    );
  });

  it('starts each controlled keyboard session from the controlled value', () => {
    const onValueChange = vi.fn();
    const onValueCommit = vi.fn();
    const { container } = mountPlane({
      value: { x: 0.25, y: 0.75 },
      onValueChange,
      onValueCommit,
    });
    const xInput = container.querySelector(
      '[data-plane-axis="x"]',
    ) as HTMLInputElement;

    act(() => {
      key(xInput, 'keydown', 'ArrowRight');
      key(xInput, 'keyup', 'ArrowRight');
    });
    act(() => {
      key(xInput, 'keydown', 'ArrowRight');
      key(xInput, 'keyup', 'ArrowRight');
    });

    expect(onValueChange).toHaveBeenCalledTimes(2);
    expect(onValueCommit).toHaveBeenCalledTimes(2);
    expect(onValueChange).toHaveBeenNthCalledWith(
      2,
      { x: 0.26, y: 0.75 },
      details({ interaction: 'keyboard', reason: 'keyboard' }),
    );
  });

  it('commits native range changes that do not have a keyboard keyup', () => {
    const onValueChange = vi.fn();
    const onValueCommit = vi.fn();
    const { container } = mountPlane({ onValueChange, onValueCommit });
    const xInput = container.querySelector(
      '[data-plane-axis="x"]',
    ) as HTMLInputElement;

    act(() => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )?.set?.call(xInput, '0.4');
      xInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(onValueChange).toHaveBeenCalledWith(
      { x: 0.4, y: 0.75 },
      details({ interaction: 'keyboard', reason: 'input-change' }),
    );
    expect(onValueCommit).toHaveBeenCalledWith(
      { x: 0.4, y: 0.75 },
      details({ interaction: 'keyboard', reason: 'input-change' }),
    );
    expect(onValueChange.mock.lastCall?.[1].originalEvent).toBeInstanceOf(
      Event,
    );
  });

  it.each([{ disabled: true }, { readOnly: true }])(
    'does not commit a dirty keyboard session after the plane becomes noninteractive',
    (mode) => {
      const onValueChange = vi.fn();
      const onValueCommit = vi.fn();
      const props = {
        value: { x: 0.25, y: 0.75 },
        onValueChange,
        onValueCommit,
      };
      const { container, render } = mountPlane(props);
      const input = container.querySelector(
        '[data-plane-axis="x"]',
      ) as HTMLInputElement;
      const nextTarget = document.createElement('button');
      document.body.append(nextTarget);

      act(() => {
        input.focus();
        key(input, 'keydown', 'ArrowRight');
      });
      expect(onValueChange).toHaveBeenCalledOnce();
      expect(onValueCommit).not.toHaveBeenCalled();

      render({ ...props, ...mode });
      act(() => nextTarget.focus());

      expect(onValueCommit).not.toHaveBeenCalled();
    },
  );

  it.each([
    { step: -1, largeStep: Number.NaN },
    { step: 0, largeStep: Number.POSITIVE_INFINITY },
  ])('falls back from invalid keyboard step values', (thumbProps) => {
    const onValueChange = vi.fn();
    const { container } = mountPlane({ onValueChange }, thumbProps);
    const xInput = container.querySelector(
      '[data-plane-axis="x"]',
    ) as HTMLInputElement;

    expect(xInput.step).toBe('0.01');
    act(() => {
      key(xInput, 'keydown', 'ArrowRight');
      key(xInput, 'keyup', 'ArrowRight');
    });
    act(() => {
      key(xInput, 'keydown', 'ArrowRight', true);
      key(xInput, 'keyup', 'ArrowRight', true);
    });

    expect(onValueChange).toHaveBeenNthCalledWith(
      1,
      { x: 0.26, y: 0.75 },
      details({ interaction: 'keyboard', reason: 'keyboard' }),
    );
    expect(onValueChange).toHaveBeenNthCalledWith(
      2,
      { x: 0.36, y: 0.75 },
      details({ interaction: 'keyboard', reason: 'keyboard' }),
    );
  });

  it('uses largeStep for modified arrows and paging keys', () => {
    const onValueChange = vi.fn();
    const { container } = mountPlane({ onValueChange }, { largeStep: 0.2 });
    const xInput = container.querySelector(
      '[data-plane-axis="x"]',
    ) as HTMLInputElement;

    act(() => {
      key(xInput, 'keydown', 'ArrowRight', true);
      key(xInput, 'keyup', 'ArrowRight', true);
      key(xInput, 'keydown', 'PageUp');
      key(xInput, 'keyup', 'PageUp');
    });

    expect(onValueChange.mock.calls.map(([value]) => value)).toEqual([
      { x: 0.45, y: 0.75 },
      { x: 0.65, y: 0.75 },
    ]);
  });

  it('submits named axes and resets an uncontrolled thumb with its form', () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    mountedRoots.push(root);
    const onValueChange = vi.fn();
    const onValueCommit = vi.fn();

    act(() => {
      root.render(
        <form data-testid="form">
          <Plane>
            <PlaneThumb
              data-testid="form-thumb"
              defaultValue={{ x: 0.2, y: 0.3 }}
              xName="position.x"
              yName="position.y"
              onValueChange={onValueChange}
              onValueCommit={onValueCommit}
            />
          </Plane>
        </form>,
      );
    });

    const form = container.querySelector('form') as HTMLFormElement;
    const thumb = container.querySelector(
      '[data-testid="form-thumb"]',
    ) as HTMLElement;
    const xInput = thumb.querySelector(
      '[data-plane-axis="x"]',
    ) as HTMLInputElement;

    expect(Object.fromEntries(new FormData(form))).toEqual({
      'position.x': '0.2',
      'position.y': '0.3',
    });

    act(() => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )?.set?.call(xInput, '0.8');
      xInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(thumb.style.left).toBe('80%');
    expect(Object.fromEntries(new FormData(form))['position.x']).toBe('0.8');

    act(() => form.reset());

    expect(thumb.style.left).toBe('20%');
    expect(thumb.style.top).toBe('70%');
    expect(Object.fromEntries(new FormData(form))).toEqual({
      'position.x': '0.2',
      'position.y': '0.3',
    });
    expect(onValueChange).toHaveBeenCalledOnce();
    expect(onValueCommit).toHaveBeenCalledOnce();
  });

  it('associates named axes with an external form without resetting controlled state', () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    mountedRoots.push(root);

    act(() => {
      root.render(
        <>
          <form id="position-form" />
          <Plane>
            <PlaneThumb
              data-testid="controlled-form-thumb"
              value={{ x: 0.8, y: 0.9 }}
              defaultValue={{ x: 0.2, y: 0.3 }}
              xName="x"
              yName="y"
              form="position-form"
            />
          </Plane>
        </>,
      );
    });

    const form = container.querySelector('form') as HTMLFormElement;
    const thumb = container.querySelector(
      '[data-testid="controlled-form-thumb"]',
    ) as HTMLElement;

    expect(Object.fromEntries(new FormData(form))).toEqual({
      x: '0.8',
      y: '0.9',
    });
    act(() => form.reset());
    expect(thumb.style.left).toBe('80%');
    expect(Number.parseFloat(thumb.style.top)).toBeCloseTo(10);
  });

  it('exposes thumb state to composed descendants', () => {
    const { container, plane } = mountPlane(
      {},
      { children: <PlaneThumbStateProbe /> },
    );
    const thumb = container.querySelector(
      '[data-slot="plane-thumb"]',
    ) as HTMLElement;

    expect(readThumbState(container)).toEqual({
      value: '0.25,0.75',
      hovered: false,
      dragging: false,
      focused: false,
      focusVisible: false,
      disabled: false,
      readOnly: false,
    });

    act(() => pointer(thumb, 'pointerdown', { clientX: 110, clientY: 70 }));
    expect(readThumbState(container)).toEqual(
      expect.objectContaining({
        value: '0.5,0.5',
        dragging: true,
        focused: true,
        focusVisible: false,
      }),
    );

    act(() => pointer(plane, 'pointerup', { clientX: 110, clientY: 70 }));
    expect(readThumbState(container).dragging).toBe(false);
  });

  it('exposes genuine thumb hover without touch-emulated state', () => {
    const onPointerEnter = vi.fn();
    const onPointerLeave = vi.fn();
    const { container } = mountPlane(
      { disabled: true },
      {
        children: <PlaneThumbStateProbe />,
        onPointerEnter,
        onPointerLeave,
      },
    );
    const thumb = container.querySelector(
      '[data-slot="plane-thumb"]',
    ) as HTMLElement;

    act(() =>
      pointer(thumb, 'pointerover', {
        pointerId: 1,
        pointerType: 'mouse',
      }),
    );
    expect(onPointerEnter).toHaveBeenCalledOnce();
    expect(thumb.getAttribute('data-hovered')).toBe('true');
    expect(readThumbState(container).hovered).toBe(true);

    act(() =>
      pointer(thumb, 'pointerover', {
        pointerId: 2,
        pointerType: 'touch',
      }),
    );
    act(() =>
      pointer(thumb, 'pointerout', {
        pointerId: 2,
        pointerType: 'touch',
      }),
    );
    expect(thumb.getAttribute('data-hovered')).toBe('true');

    act(() =>
      pointer(thumb, 'pointerout', {
        pointerId: 1,
        pointerType: 'mouse',
      }),
    );
    expect(onPointerLeave).toHaveBeenCalledTimes(2);
    expect(thumb.hasAttribute('data-hovered')).toBe(false);
    expect(readThumbState(container).hovered).toBe(false);

    act(() =>
      pointer(thumb, 'pointerover', {
        pointerId: 3,
        pointerType: 'pen',
      }),
    );
    expect(thumb.getAttribute('data-hovered')).toBe('true');
  });

  it('tracks a controlled thumb hover from its rendered bounds during capture', async () => {
    const onValueChange = vi.fn();
    const { container, plane } = mountPlane({
      value: { x: 0.5, y: 0.5 },
      onValueChange,
    });
    const thumb = container.querySelector(
      '[data-slot="plane-thumb"]',
    ) as HTMLElement;
    vi.spyOn(thumb, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 60,
      width: 20,
      height: 20,
      right: 120,
      bottom: 80,
      x: 100,
      y: 60,
      toJSON: () => ({}),
    });

    act(() =>
      pointer(thumb, 'pointerover', {
        clientX: 110,
        clientY: 70,
        pointerType: 'mouse',
      }),
    );
    act(() =>
      pointer(thumb, 'pointerdown', {
        clientX: 110,
        clientY: 70,
        pointerType: 'mouse',
      }),
    );
    act(() =>
      pointer(plane, 'pointermove', {
        clientX: 190,
        clientY: 100,
        pointerType: 'mouse',
      }),
    );
    await act(
      () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );

    expect(onValueChange.mock.lastCall?.[0].x).toBeCloseTo(0.9);
    expect(onValueChange.mock.lastCall?.[0].y).toBeCloseTo(0.2);
    expect(onValueChange.mock.lastCall?.[1]).toEqual(
      details({ interaction: 'pointer', reason: 'thumb-drag' }),
    );
    expect(thumb.hasAttribute('data-hovered')).toBe(false);
  });

  it('does not publish predicted hover for a controlled thumb', async () => {
    const { container, plane } = mountPlane({
      value: { x: 0.5, y: 0.5 },
      onValueChange: vi.fn(),
    });
    const thumb = container.querySelector(
      '[data-slot="plane-thumb"]',
    ) as HTMLElement;
    vi.spyOn(thumb, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 60,
      width: 20,
      height: 20,
      right: 120,
      bottom: 80,
      x: 100,
      y: 60,
      toJSON: () => ({}),
    });

    act(() =>
      pointer(plane, 'pointerdown', {
        clientX: 190,
        clientY: 100,
        pointerType: 'mouse',
      }),
    );

    expect(thumb.hasAttribute('data-hovered')).toBe(false);

    await act(
      () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );

    expect(thumb.hasAttribute('data-hovered')).toBe(false);
  });

  it('keeps responsive controlled thumb hover after its rendered position updates', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    mountedRoots.push(root);

    function ResponsiveControlledPlane() {
      const [value, setValue] = useState({ x: 0.25, y: 0.75 });
      return (
        <Plane>
          <PlaneThumb value={value} onValueChange={setValue} />
        </Plane>
      );
    }

    act(() => root.render(<ResponsiveControlledPlane />));
    const plane = container.querySelector('[data-slot="plane"]') as HTMLElement;
    const thumb = container.querySelector(
      '[data-slot="plane-thumb"]',
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
    vi.spyOn(thumb, 'getBoundingClientRect').mockImplementation(() => {
      const centerX = 10 + (Number.parseFloat(thumb.style.left) / 100) * 200;
      const centerY = 20 + (Number.parseFloat(thumb.style.top) / 100) * 100;
      return {
        left: centerX - 10,
        top: centerY - 10,
        width: 20,
        height: 20,
        right: centerX + 10,
        bottom: centerY + 10,
        x: centerX - 10,
        y: centerY - 10,
        toJSON: () => ({}),
      };
    });

    act(() =>
      pointer(thumb, 'pointerover', {
        clientX: 60,
        clientY: 45,
        pointerType: 'mouse',
      }),
    );
    act(() =>
      pointer(thumb, 'pointerdown', {
        clientX: 60,
        clientY: 45,
        pointerType: 'mouse',
      }),
    );
    act(() =>
      pointer(plane, 'pointermove', {
        clientX: 190,
        clientY: 100,
        pointerType: 'mouse',
      }),
    );
    expect(thumb.getAttribute('data-hovered')).toBe('true');
    act(() =>
      pointer(plane, 'pointerup', {
        clientX: 190,
        clientY: 100,
        pointerType: 'mouse',
      }),
    );

    await act(
      () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );

    expect(thumb.style.left).toBe('90%');
    expect(Number.parseFloat(thumb.style.top)).toBeCloseTo(80);
    expect(thumb.getAttribute('data-hovered')).toBe('true');
  });

  it('lets native hover transitions supersede pending release reconciliation', async () => {
    const { container, plane } = mountPlane({
      value: { x: 0.5, y: 0.5 },
      onValueChange: vi.fn(),
    });
    const thumb = container.querySelector(
      '[data-slot="plane-thumb"]',
    ) as HTMLElement;
    vi.spyOn(thumb, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 60,
      width: 20,
      height: 20,
      right: 120,
      bottom: 80,
      x: 100,
      y: 60,
      toJSON: () => ({}),
    });

    act(() =>
      pointer(thumb, 'pointerover', {
        clientX: 110,
        clientY: 70,
        pointerType: 'mouse',
      }),
    );
    act(() =>
      pointer(thumb, 'pointerdown', {
        clientX: 110,
        clientY: 70,
        pointerType: 'mouse',
      }),
    );
    act(() =>
      pointer(plane, 'pointerup', {
        clientX: 110,
        clientY: 70,
        pointerType: 'mouse',
      }),
    );
    act(() =>
      pointer(thumb, 'pointerout', {
        clientX: 130,
        clientY: 90,
        pointerType: 'mouse',
      }),
    );
    await act(
      () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );

    expect(thumb.hasAttribute('data-hovered')).toBe(false);
  });

  it('clears captured thumb hover when pointer interaction is cancelled', () => {
    const { container, plane } = mountPlane();
    const thumb = container.querySelector(
      '[data-slot="plane-thumb"]',
    ) as HTMLElement;

    act(() =>
      pointer(thumb, 'pointerover', {
        clientX: 60,
        clientY: 45,
        pointerType: 'mouse',
      }),
    );
    act(() =>
      pointer(thumb, 'pointerdown', {
        clientX: 60,
        clientY: 45,
        pointerType: 'mouse',
      }),
    );
    expect(thumb.getAttribute('data-hovered')).toBe('true');

    act(() =>
      pointer(plane, 'pointercancel', {
        clientX: 60,
        clientY: 45,
        pointerType: 'mouse',
      }),
    );

    expect(thumb.hasAttribute('data-hovered')).toBe(false);
    expect(plane.hasAttribute('data-dragging')).toBe(false);
  });

  it('exposes two native slider axes with a shared value description', () => {
    const { container } = mountPlane();
    const inputs = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[type="range"]'),
    );

    expect(inputs).toHaveLength(2);
    expect(inputs.map((input) => input.getAttribute('aria-label'))).toEqual([
      'Horizontal position',
      'Vertical position',
    ]);
    expect(inputs[0].getAttribute('aria-valuetext')).toBe(
      '25% horizontal, 75% vertical',
    );
    expect(inputs[0].min).toBe('0');
    expect(inputs[0].max).toBe('1');
    expect(inputs[0].getAttribute('aria-orientation')).toBe('horizontal');
    expect(inputs[1].getAttribute('aria-orientation')).toBe('vertical');
  });

  it('shows thumb focus only for the thumb axis controls', () => {
    const { container, plane } = mountPlane();
    const thumb = container.querySelector(
      '[data-slot="plane-thumb"]',
    ) as HTMLElement;
    const xInput = container.querySelector(
      '[data-plane-axis="x"]',
    ) as HTMLInputElement;
    const unrelatedButton = document.createElement('button');
    plane.append(unrelatedButton);

    act(() => xInput.focus());
    expect(thumb.hasAttribute('data-focused')).toBe(true);

    act(() => unrelatedButton.focus());
    expect(thumb.hasAttribute('data-focused')).toBe(false);
  });

  it.each([{ disabled: true }, { readOnly: true }])(
    'suppresses pointer and keyboard changes for $disabled$readOnly',
    (mode) => {
      const onValueChange = vi.fn();
      const { container, plane } = mountPlane({ ...mode, onValueChange });
      const input = container.querySelector(
        '[data-plane-axis="x"]',
      ) as HTMLInputElement;

      act(() => pointer(plane, 'pointerdown', { clientX: 110, clientY: 70 }));
      act(() => key(input, 'keydown', 'ArrowRight'));

      expect(onValueChange).not.toHaveBeenCalled();
      expect(
        plane.hasAttribute(`data-${mode.disabled ? 'disabled' : 'readonly'}`),
      ).toBe(true);
    },
  );

  it('composes native props and lets a consumer cancel pointer handling', () => {
    const onValueChange = vi.fn();
    const ref = vi.fn();
    const { plane } = mountPlane({
      id: 'target-plane',
      ref,
      onValueChange,
      onPointerDown: (event) => event.preventDefault(),
    });

    act(() => pointer(plane, 'pointerdown', { clientX: 110, clientY: 70 }));

    expect(plane.id).toBe('target-plane');
    expect(ref).toHaveBeenCalledWith(plane);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('moves only the directly pressed thumb and ignores empty auto presses with multiple thumbs', () => {
    const firstChange = vi.fn();
    const secondChange = vi.fn();
    const secondCommit = vi.fn();
    const { container, getThumb, plane } = mountMultiPlane([
      {
        id: 'first',
        defaultValue: { x: 0.2, y: 0.2 },
        onValueChange: firstChange,
      },
      {
        id: 'second',
        defaultValue: { x: 0.8, y: 0.8 },
        onValueChange: secondChange,
        onValueCommit: secondCommit,
      },
    ]);

    act(() => pointer(plane, 'pointerdown', { clientX: 110, clientY: 70 }));
    expect(firstChange).not.toHaveBeenCalled();
    expect(secondChange).not.toHaveBeenCalled();
    expect(plane.setPointerCapture).not.toHaveBeenCalled();

    const secondThumb = getThumb('second');
    let pointerDownEvent!: PointerEvent;
    act(() => {
      pointerDownEvent = pointer(secondThumb, 'pointerdown', {
        clientX: 150,
        clientY: 45,
      });
    });
    expect(pointerDownEvent.defaultPrevented).toBe(true);

    expect(firstChange).not.toHaveBeenCalled();
    expect(secondChange).toHaveBeenLastCalledWith(
      { x: 0.7, y: 0.75 },
      details({
        interaction: 'pointer',
        reason: 'thumb-drag',
        thumbId: 'second',
      }),
    );
    expect(plane.hasAttribute('data-dragging')).toBe(true);
    expect(getThumb('first').hasAttribute('data-dragging')).toBe(false);
    expect(secondThumb.hasAttribute('data-dragging')).toBe(true);
    expect(document.activeElement).toBe(
      secondThumb.querySelector('[data-plane-axis="x"]'),
    );

    act(() => pointer(plane, 'pointermove', { clientX: 190, clientY: 110 }));
    act(() => pointer(plane, 'pointerup', { clientX: 190, clientY: 110 }));

    expect(secondThumb.style.left).toBe('90%');
    expect(secondThumb.style.top).toBe('90%');
    expect(secondCommit).toHaveBeenCalledOnce();
    expect(secondCommit.mock.calls[0][0].x).toBeCloseTo(0.9);
    expect(secondCommit.mock.calls[0][0].y).toBeCloseTo(0.1);
    expect(secondCommit.mock.calls[0][1]).toEqual(
      details({
        interaction: 'pointer',
        reason: 'thumb-drag',
        thumbId: 'second',
      }),
    );
    expect(container.querySelectorAll('[data-dragging]')).toHaveLength(0);
  });

  it('restores keyboard control to the manipulated thumb after pointer release', () => {
    const firstChange = vi.fn();
    const secondChange = vi.fn();
    const { container, getThumb, plane } = mountMultiPlane([
      {
        id: 'first',
        defaultValue: { x: 0.2, y: 0.2 },
        onValueChange: firstChange,
      },
      {
        id: 'second',
        defaultValue: { x: 0.8, y: 0.8 },
        onValueChange: secondChange,
      },
    ]);
    const outsideButton = document.createElement('button');
    document.body.append(outsideButton);
    const secondThumb = getThumb('second');
    const secondX = secondThumb.querySelector(
      '[data-plane-axis="x"]',
    ) as HTMLInputElement;

    act(() =>
      pointer(secondThumb, 'pointerdown', { clientX: 150, clientY: 45 }),
    );
    act(() => outsideButton.focus());
    expect(document.activeElement).toBe(outsideButton);

    act(() => pointer(plane, 'pointerup', { clientX: 150, clientY: 45 }));
    expect(document.activeElement).toBe(secondX);
    expect(secondThumb.hasAttribute('data-focus-visible')).toBe(false);

    act(() => {
      expect(key(secondX, 'keydown', 'Tab').defaultPrevented).toBe(true);
    });
    expect(document.activeElement).toBe(secondX);
    expect(secondThumb.getAttribute('data-focus-visible')).toBe('true');
    act(() => {
      expect(key(secondX, 'keydown', 'Tab').defaultPrevented).toBe(false);
    });

    act(() => {
      key(document.activeElement!, 'keydown', 'ArrowUp');
      key(document.activeElement!, 'keyup', 'ArrowUp');
    });

    expect(firstChange).not.toHaveBeenCalled();
    expect(secondChange).toHaveBeenLastCalledWith(
      { x: 0.7, y: 0.76 },
      details({
        interaction: 'keyboard',
        reason: 'keyboard',
        thumbId: 'second',
      }),
    );
    expect(document.activeElement).toBe(
      container.querySelector(
        '[data-testid="thumb-second"] [data-plane-axis="y"]',
      ),
    );
  });

  it('selects the visually nearest thumb in rendered pixel space when opted in', () => {
    const firstChange = vi.fn();
    const secondChange = vi.fn();
    const { plane } = mountMultiPlane(
      [
        {
          id: 'first',
          defaultValue: { x: 0, y: 0.5 },
          onValueChange: firstChange,
        },
        {
          id: 'second',
          defaultValue: { x: 0.5, y: 0 },
          onValueChange: secondChange,
        },
      ],
      { pressBehavior: 'nearest' },
    );

    act(() => pointer(plane, 'pointerdown', { clientX: 90, clientY: 70 }));

    expect(firstChange).not.toHaveBeenCalled();
    expect(secondChange).toHaveBeenCalledWith(
      { x: 0.4, y: 0.5 },
      details({
        interaction: 'pointer',
        reason: 'plane-press',
        thumbId: 'second',
      }),
    );
  });

  it('does not retarget direct presses on disabled thumbs and skips them for nearest presses', () => {
    const disabledChange = vi.fn();
    const enabledChange = vi.fn();
    const { getThumb, plane } = mountMultiPlane(
      [
        {
          id: 'locked',
          defaultValue: { x: 0.4, y: 0.5 },
          disabled: true,
          onValueChange: disabledChange,
        },
        {
          id: 'movable',
          defaultValue: { x: 0.8, y: 0.8 },
          onValueChange: enabledChange,
        },
      ],
      { pressBehavior: 'nearest' },
    );

    act(() =>
      pointer(getThumb('locked'), 'pointerdown', {
        clientX: 90,
        clientY: 70,
      }),
    );
    expect(disabledChange).not.toHaveBeenCalled();
    expect(enabledChange).not.toHaveBeenCalled();

    act(() => pointer(plane, 'pointerdown', { clientX: 90, clientY: 70 }));
    expect(disabledChange).not.toHaveBeenCalled();
    expect(enabledChange).toHaveBeenCalledWith(
      { x: 0.4, y: 0.5 },
      details({
        interaction: 'pointer',
        reason: 'plane-press',
        thumbId: 'movable',
      }),
    );
  });

  it('scopes keyboard movement, focus, and accessible axis names to one thumb', () => {
    const firstChange = vi.fn();
    const secondChange = vi.fn();
    const { container, getThumb } = mountMultiPlane([
      {
        id: 'Outgoing handle',
        defaultValue: { x: 0.25, y: 0.25 },
        onValueChange: firstChange,
      },
      {
        id: 'Incoming handle',
        defaultValue: { x: 0.75, y: 0.75 },
        onValueChange: secondChange,
      },
    ]);
    const secondThumb = getThumb('Incoming handle');
    const secondX = secondThumb.querySelector(
      '[data-plane-axis="x"]',
    ) as HTMLInputElement;

    act(() => {
      secondX.focus();
      key(secondX, 'keydown', 'ArrowUp');
      key(document.activeElement!, 'keyup', 'ArrowUp');
    });

    expect(firstChange).not.toHaveBeenCalled();
    expect(secondChange).toHaveBeenCalledWith(
      { x: 0.75, y: 0.76 },
      details({
        interaction: 'keyboard',
        reason: 'keyboard',
        thumbId: 'Incoming handle',
      }),
    );
    expect(document.activeElement).toBe(
      secondThumb.querySelector('[data-plane-axis="y"]'),
    );
    expect(
      Array.from(
        container.querySelectorAll<HTMLInputElement>('[data-plane-axis]'),
      ).map((input) => input.getAttribute('aria-label')),
    ).toEqual([
      'Outgoing handle, horizontal position',
      'Outgoing handle, vertical position',
      'Incoming handle, horizontal position',
      'Incoming handle, vertical position',
    ]);
  });

  it('cancels without committing when the active thumb unmounts', () => {
    const firstCommit = vi.fn();
    const secondChange = vi.fn();
    const first = {
      id: 'first',
      defaultValue: { x: 0.25, y: 0.25 },
      onValueCommit: firstCommit,
    };
    const second = {
      id: 'second',
      defaultValue: { x: 0.75, y: 0.75 },
      onValueChange: secondChange,
    };
    const { getThumb, plane, render } = mountMultiPlane([first, second]);

    act(() =>
      pointer(getThumb('first'), 'pointerdown', {
        clientX: 70,
        clientY: 80,
      }),
    );
    render([second]);
    act(() => pointer(plane, 'pointermove', { clientX: 190, clientY: 30 }));

    expect(plane.hasAttribute('data-dragging')).toBe(false);
    expect(plane.releasePointerCapture).toHaveBeenCalledWith(7);
    expect(firstCommit).not.toHaveBeenCalled();
    expect(secondChange).not.toHaveBeenCalled();
  });

  it('updates only the active thumb across a sustained 16-thumb drag', () => {
    const changes = Array.from({ length: 16 }, () => vi.fn());
    const commits = Array.from({ length: 16 }, () => vi.fn());
    const thumbs = changes.map((onValueChange, index) => ({
      id: `point-${index}`,
      defaultValue: {
        x: (index % 4) / 3,
        y: Math.floor(index / 4) / 3,
      },
      onValueChange,
      onValueCommit: commits[index],
    }));
    const { container, getThumb, plane } = mountMultiPlane(thumbs);
    const inactiveStyle = getThumb('point-8').getAttribute('style');

    act(() => {
      pointer(getThumb('point-7'), 'pointerdown', {
        clientX: 120,
        clientY: 65,
      });
      for (let index = 0; index < 48; index += 1) {
        pointer(plane, 'pointermove', {
          clientX: 40 + index * 3,
          clientY: 30 + index,
        });
      }
      pointer(plane, 'pointerup', { clientX: 181, clientY: 77 });
    });

    expect(changes[7].mock.calls.length).toBeGreaterThanOrEqual(40);
    expect(commits[7]).toHaveBeenCalledOnce();
    expect(
      changes.filter(
        (callback, index) => index !== 7 && callback.mock.calls.length,
      ),
    ).toHaveLength(0);
    expect(getThumb('point-8').getAttribute('style')).toBe(inactiveStyle);
    expect(plane.getBoundingClientRect).toHaveBeenCalledOnce();
    expect(container.querySelectorAll('input[type="range"]')).toHaveLength(32);
  });

  it('keeps callback refs attached across value updates', () => {
    const ref = vi.fn();
    const { plane } = mountPlane({ ref });
    ref.mockClear();

    act(() => pointer(plane, 'pointerdown', { clientX: 110, clientY: 70 }));

    expect(ref).not.toHaveBeenCalled();
  });
});
