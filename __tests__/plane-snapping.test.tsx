// @vitest-environment jsdom

import { act, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Plane,
  PlaneThumb,
  usePlaneThumbContext,
  type PlaneMotion,
  type PlaneProps,
  type PlaneSnapTarget,
  type PlaneThumbProps,
  type PlaneValue,
} from '../src/plane.js';
import './helpers/dom-polyfills.js';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mountedRoots: Root[] = [];

// Plane box: left 10, top 20, 200 x 100 px.
const at = (x: number, y: number) => ({
  clientX: 10 + x * 200,
  clientY: 20 + (1 - y) * 100,
});

function mockPlaneRect(plane: HTMLElement) {
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
}

function render(ui: ReactNode) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push(root);
  act(() => root.render(ui));
  const plane = container.querySelector('[data-slot="plane"]') as HTMLElement;
  mockPlaneRect(plane);
  return {
    container,
    plane,
    rerender: (next: ReactNode) => act(() => root.render(next)),
  };
}

function mount(
  thumbProps: Partial<PlaneThumbProps> = {},
  planeProps: Partial<PlaneProps> = {},
) {
  const onValueChange = vi.fn();
  const onValueCommitted = vi.fn();
  const ui = (props: Partial<PlaneThumbProps>) => (
    <Plane {...planeProps}>
      <PlaneThumb
        data-testid="thumb"
        defaultValue={{ x: 0.5, y: 0.5 }}
        onValueChange={onValueChange}
        onValueCommitted={onValueCommitted}
        {...props}
      >
        <SnappedProbe />
      </PlaneThumb>
    </Plane>
  );
  const result = render(ui(thumbProps));
  const thumb = result.container.querySelector(
    '[data-testid="thumb"]',
  ) as HTMLElement;
  const axis = (name: 'x' | 'y') =>
    thumb.querySelector(
      `:scope > [data-plane-axis="${name}"]`,
    ) as HTMLInputElement;
  return {
    ...result,
    thumb,
    axis,
    onValueChange,
    onValueCommitted,
    rerenderThumb: (props: Partial<PlaneThumbProps>) =>
      result.rerender(ui({ ...thumbProps, ...props })),
  };
}

function SnappedProbe() {
  const context = usePlaneThumbContext();
  const { snapped } = context;
  return (
    <output data-testid="snapped" data-has-key={'snapped' in context}>
      {snapped ? `${snapped.target.type}:${snapped.axes.join('')}` : 'none'}
    </output>
  );
}

function pointer(target: Element, type: string, init: PointerEventInit = {}) {
  const event = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    pointerId: 3,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

function drag(
  plane: HTMLElement,
  start: Element,
  points: PointerEventInit[],
  release: PointerEventInit = points[points.length - 1],
) {
  act(() => pointer(start, 'pointerdown', points[0]));
  for (const point of points.slice(1)) {
    act(() => pointer(plane, 'pointermove', point));
  }
  act(() => pointer(plane, 'pointerup', release));
}

function key(target: Element, value: string, init: KeyboardEventInit = {}) {
  act(() => {
    target.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: value,
        ...init,
      }),
    );
  });
  act(() => {
    target.dispatchEvent(
      new KeyboardEvent('keyup', {
        bubbles: true,
        cancelable: true,
        key: value,
        ...init,
      }),
    );
  });
}

const lastValue = (fn: ReturnType<typeof vi.fn>) =>
  fn.mock.calls[fn.mock.calls.length - 1]?.[0] as PlaneValue;
const lastDetails = (fn: ReturnType<typeof vi.fn>) =>
  fn.mock.calls[fn.mock.calls.length - 1]?.[1];

beforeEach(() => {
  Object.defineProperties(HTMLElement.prototype, {
    setPointerCapture: { configurable: true, value: vi.fn() },
    hasPointerCapture: { configurable: true, value: vi.fn(() => true) },
    releasePointerCapture: { configurable: true, value: vi.fn() },
  });
});

afterEach(() => {
  for (const root of mountedRoots.splice(0)) act(() => root.unmount());
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('PlaneThumb snapping', () => {
  const grid: PlaneSnapTarget = { type: 'grid', x: 0.25, y: 0.1 };

  it('leaves details, context, and attributes untouched without snapping', () => {
    const { plane, thumb, axis, container, onValueChange, onValueCommitted } =
      mount();
    drag(plane, plane, [at(0.33, 0.46)]);
    expect(lastValue(onValueChange).x).toBeCloseTo(0.33);
    expect(lastValue(onValueChange).y).toBeCloseTo(0.46);
    // Exactly the pre-snapping details: no `snap` key at all.
    for (const fn of [onValueChange, onValueCommitted]) {
      const details = lastDetails(fn);
      expect(details).toEqual({
        interaction: 'pointer',
        reason: 'plane-press',
        originalEvent: expect.any(Event),
      });
      expect(Object.keys(details).sort()).toEqual([
        'interaction',
        'originalEvent',
        'reason',
      ]);
    }
    key(axis('x'), 'ArrowRight');
    expect(Object.keys(lastDetails(onValueChange)).sort()).toEqual([
      'interaction',
      'originalEvent',
      'reason',
    ]);
    expect(
      container
        .querySelector('[data-testid="snapped"]')!
        .getAttribute('data-has-key'),
    ).toBe('false');
    expect(thumb.hasAttribute('data-snapped')).toBe(false);
    expect(thumb.hasAttribute('data-snap-transition')).toBe(false);
    expect(thumb.querySelector('input')!.step).toBe('any');
  });

  it('quantizes pointer values per axis and reports the hit', () => {
    const { plane, thumb, container, onValueChange, onValueCommitted } = mount({
      snap: [grid],
    });
    drag(plane, plane, [at(0.33, 0.46), at(0.61, 0.83)]);
    expect(onValueChange.mock.calls.map(([value]) => value)).toEqual([
      { x: 0.25, y: 0.5 },
      { x: 0.5, y: 0.8 },
    ]);
    expect(lastDetails(onValueChange).snap).toEqual({
      target: grid,
      index: 0,
      axes: ['x', 'y'],
    });
    expect(onValueCommitted).toHaveBeenCalledWith(
      { x: 0.5, y: 0.8 },
      expect.objectContaining({
        snap: { target: grid, index: 0, axes: ['x', 'y'] },
      }),
    );
    expect(thumb.dataset.snapped).toBe('true');
    expect(thumb.dataset.snappedAxis).toBe('both');
    expect(thumb.style.left).toBe('50%');
    expect(
      container.querySelector('[data-testid="snapped"]')!.textContent,
    ).toBe('grid:xy');
  });

  it('snaps to magnetic points using a pixel radius and releases with hysteresis', () => {
    const point: PlaneSnapTarget = { type: 'point', x: 0.5, y: 0.5, id: 'c' };
    const { plane, thumb, onValueChange } = mount(
      { snap: [point], defaultValue: { x: 0.1, y: 0.1 } },
      { pressBehavior: 'auto' },
    );
    act(() => pointer(plane, 'pointerdown', at(0.2, 0.2)));
    // 0.035 * 200 = 7px: inside the 8px radius.
    act(() => pointer(plane, 'pointermove', at(0.535, 0.5)));
    expect(lastValue(onValueChange)).toEqual({ x: 0.5, y: 0.5 });
    expect(thumb.dataset.snappedAxis).toBe('both');
    // 10px: outside the radius but held until 12px.
    act(() => pointer(plane, 'pointermove', at(0.55, 0.5)));
    expect(lastValue(onValueChange)).toEqual({ x: 0.5, y: 0.5 });
    act(() => pointer(plane, 'pointermove', at(0.565, 0.5)));
    expect(lastValue(onValueChange).x).toBeCloseTo(0.565);
    expect(lastDetails(onValueChange).snap).toBeUndefined();
    expect(thumb.hasAttribute('data-snapped')).toBe(false);
    // Moving back to 10px does not re-engage (hysteresis was reset).
    act(() => pointer(plane, 'pointermove', at(0.55, 0.5)));
    expect(lastValue(onValueChange).x).toBeCloseTo(0.55);
    act(() => pointer(plane, 'pointerup', at(0.55, 0.5)));
  });

  it('uses the y pixel size for vertical distance on non-square planes', () => {
    const line: PlaneSnapTarget = { type: 'line', axis: 'y', at: 0.5 };
    const { plane, thumb, onValueChange } = mount({ snap: [line] });
    // 0.07 * 100px = 7px vertically.
    drag(plane, plane, [at(0.2, 0.57)]);
    expect(lastValue(onValueChange)).toEqual({ x: 0.2, y: 0.5 });
    expect(thumb.dataset.snappedAxis).toBe('y');
    // 0.09 * 100px = 9px: outside, although 0.09 * 200 would be farther.
    drag(plane, plane, [at(0.2, 0.41)]);
    expect(lastValue(onValueChange).y).toBeCloseTo(0.41);
  });

  it('honours snapRadius', () => {
    const line: PlaneSnapTarget = { type: 'line', axis: 'x', at: 0.5 };
    const { plane, onValueChange } = mount({ snap: [line], snapRadius: 20 });
    drag(plane, plane, [at(0.59, 0.25)]);
    expect(lastValue(onValueChange)).toEqual({ x: 0.5, y: 0.25 });
  });

  it('bypasses snapping while Alt is held by default', () => {
    const { plane, thumb, onValueChange } = mount({ snap: [grid] });
    drag(plane, plane, [{ ...at(0.33, 0.46), altKey: true }]);
    expect(lastValue(onValueChange).x).toBeCloseTo(0.33);
    expect(lastDetails(onValueChange).snap).toBeUndefined();
    expect(thumb.hasAttribute('data-snapped')).toBe(false);
    // Meta does nothing by default.
    drag(plane, plane, [{ ...at(0.61, 0.46), metaKey: true }]);
    expect(lastValue(onValueChange)).toEqual({ x: 0.5, y: 0.5 });
  });

  it('supports snapBypass="meta" and snapBypass={false}', () => {
    const meta = mount({ snap: [grid], snapBypass: 'meta' });
    drag(meta.plane, meta.plane, [{ ...at(0.33, 0.46), metaKey: true }]);
    expect(lastValue(meta.onValueChange).x).toBeCloseTo(0.33);
    drag(meta.plane, meta.plane, [{ ...at(0.33, 0.46), altKey: true }]);
    expect(lastValue(meta.onValueChange)).toEqual({ x: 0.25, y: 0.5 });

    const never = mount({ snap: [grid], snapBypass: false });
    drag(never.plane, never.plane, [
      { ...at(0.33, 0.46), altKey: true, metaKey: true },
    ]);
    expect(lastValue(never.onValueChange)).toEqual({ x: 0.25, y: 0.5 });
  });

  it('snaps the resulting value of a relative drag, not the pointer delta', () => {
    const { plane, thumb, onValueChange } = mount(
      { snap: [grid], defaultValue: { x: 0.3, y: 0.3 } },
      { dragBehavior: 'relative' },
    );
    // Grab the thumb off-centre; a 0.21 move lands the raw value at 0.51.
    act(() => pointer(thumb, 'pointerdown', at(0.32, 0.3)));
    expect(onValueChange).not.toHaveBeenCalled();
    act(() => pointer(plane, 'pointermove', at(0.53, 0.3)));
    expect(lastValue(onValueChange)).toEqual({ x: 0.5, y: 0.3 });
    act(() => pointer(plane, 'pointerup', at(0.53, 0.3)));
  });

  it('clamps after snapping', () => {
    const { plane, onValueChange } = mount({
      snap: [{ type: 'line', axis: 'y', at: 0.5 }],
    });
    drag(plane, plane, [at(0.2, 0.2), at(1.4, 0.52)]);
    expect(lastValue(onValueChange)).toEqual({ x: 1, y: 0.5 });
  });

  it('locks movement to one axis with axisLock', () => {
    const { plane, onValueChange } = mount({
      axisLock: 'x',
      defaultValue: { x: 0.2, y: 0.2 },
    });
    drag(plane, plane, [at(0.6, 0.9), at(0.7, 0.1)]);
    expect(onValueChange.mock.calls.map(([value]) => value)).toEqual([
      { x: 0.6, y: 0.2 },
      { x: 0.7, y: 0.2 },
    ]);
  });

  it('locks to the dominant axis only while Shift is held', () => {
    const { plane, thumb, onValueChange } = mount({
      axisLock: 'dominant-with-shift',
      defaultValue: { x: 0.2, y: 0.2 },
    });
    act(() => pointer(thumb, 'pointerdown', at(0.2, 0.2)));
    // 60px of x travel vs 10px of y travel: y is held.
    act(() =>
      pointer(plane, 'pointermove', { ...at(0.5, 0.3), shiftKey: true }),
    );
    expect(lastValue(onValueChange)).toEqual({ x: 0.5, y: 0.2 });
    // 20px x vs 60px y: x is held at the start value.
    act(() =>
      pointer(plane, 'pointermove', { ...at(0.3, 0.8), shiftKey: true }),
    );
    expect(lastValue(onValueChange)).toEqual({ x: 0.2, y: 0.8 });
    act(() => pointer(plane, 'pointermove', at(0.3, 0.8)));
    expect(lastValue(onValueChange)).toEqual({ x: 0.3, y: 0.8 });
    act(() => pointer(plane, 'pointerup', at(0.3, 0.8)));
  });

  it('does not snap the locked axis', () => {
    const { plane, onValueChange } = mount({
      axisLock: 'x',
      snap: [{ type: 'grid', x: 0.25, y: 0.25 }],
      defaultValue: { x: 0.2, y: 0.33 },
    });
    drag(plane, plane, [at(0.6, 0.9)]);
    expect(lastValue(onValueChange)).toEqual({ x: 0.5, y: 0.33 });
  });

  it('inherits Plane defaults and lets a thumb override them', () => {
    const planeGrid: PlaneSnapTarget = { type: 'grid', x: 0.5, y: 0.5 };
    const inherited = mount({}, { snap: [planeGrid] });
    drag(inherited.plane, inherited.plane, [at(0.8, 0.7)]);
    expect(lastValue(inherited.onValueChange)).toEqual({ x: 1, y: 0.5 });

    const overridden = mount({ snap: [] }, { snap: [planeGrid] });
    drag(overridden.plane, overridden.plane, [at(0.75, 0.25)]);
    expect(lastValue(overridden.onValueChange)).toEqual({ x: 0.75, y: 0.25 });

    const bypass = mount({}, { snap: [planeGrid], snapBypass: false });
    drag(bypass.plane, bypass.plane, [{ ...at(0.8, 0.7), altKey: true }]);
    expect(lastValue(bypass.onValueChange)).toEqual({ x: 1, y: 0.5 });
  });

  it('snaps nested thumbs in their local space and does not inherit Plane targets', () => {
    const childChange = vi.fn();
    const grandChange = vi.fn();
    const { container, plane } = render(
      <Plane snap={[{ type: 'grid', x: 0.5, y: 0.5 }]}>
        <PlaneThumb thumbId="parent" defaultValue={{ x: 0.5, y: 0.5 }}>
          <PlaneThumb
            thumbId="child"
            defaultValue={{ x: 0, y: 0 }}
            snap={[{ type: 'grid', x: 0.25, y: 0.25 }]}
            onValueChange={childChange}
          >
            <PlaneThumb
              thumbId="grand"
              defaultValue={{ x: 0.1, y: 0.1 }}
              onValueChange={grandChange}
            />
          </PlaneThumb>
        </PlaneThumb>
      </Plane>,
    );
    const thumb = (id: string) =>
      container.querySelector(`[data-thumb-id="${id}"]`) as HTMLElement;
    // World (0.82, 0.38) is local (0.32, -0.12) to the parent.
    drag(plane, thumb('child'), [at(0.5, 0.5), at(0.82, 0.38)]);
    expect(lastValue(childChange)).toEqual({ x: 0.25, y: 0 });
    expect(parseFloat(thumb('child').style.left)).toBeCloseTo(75);
    // The grandchild has no own targets and ignores the Plane grid.
    drag(plane, thumb('grand'), [at(0.85, 0.6), at(0.83, 0.63)]);
    expect(lastValue(grandChange).x).toBeCloseTo(0.08);
    expect(lastValue(grandChange).y).toBeCloseTo(0.13);
  });

  it('does not snap controlled values set by the parent', () => {
    const { thumb, axis, rerenderThumb } = mount({
      snap: [grid],
      value: { x: 0.33, y: 0.47 },
    });
    expect(axis('x').value).toBe('0.33');
    expect(thumb.style.left).toBe('33%');
    expect(thumb.hasAttribute('data-snapped')).toBe(false);
    rerenderThumb({ value: { x: 0.5, y: 0.5 } });
    expect(thumb.hasAttribute('data-snapped')).toBe(false);
  });

  it('drops the snapped state when a controlled parent changes the value', () => {
    function Fixture({ external }: { external: PlaneValue | null }) {
      const [value, setValue] = useState<PlaneValue>({ x: 0.1, y: 0.1 });
      return (
        <Plane>
          <PlaneThumb
            data-testid="thumb"
            snap={[grid]}
            value={external ?? value}
            onValueChange={setValue}
          />
        </Plane>
      );
    }
    const { plane, container, rerender } = render(<Fixture external={null} />);
    const thumb = container.querySelector('[data-testid="thumb"]')!;
    drag(plane, plane, [at(0.33, 0.46)]);
    expect(thumb.getAttribute('data-snapped')).toBe('true');
    rerender(<Fixture external={{ x: 0.33, y: 0.33 }} />);
    expect(thumb.hasAttribute('data-snapped')).toBe(false);
  });

  it('marks snap transitions until the next free update', () => {
    const point: PlaneSnapTarget = { type: 'point', x: 0.5, y: 0.5 };
    const { plane, thumb } = mount({ snap: [point] });
    act(() => pointer(plane, 'pointerdown', at(0.2, 0.2)));
    expect(thumb.hasAttribute('data-snap-transition')).toBe(false);
    expect(thumb.dataset.dragging).toBe('true');
    act(() => pointer(plane, 'pointermove', at(0.52, 0.5)));
    expect(thumb.dataset.snapTransition).toBe('true');
    // Leaving is also a snap transition.
    act(() => pointer(plane, 'pointermove', at(0.7, 0.5)));
    expect(thumb.hasAttribute('data-snapped')).toBe(false);
    expect(thumb.dataset.snapTransition).toBe('true');
    // The next free move clears it.
    act(() => pointer(plane, 'pointermove', at(0.75, 0.5)));
    expect(thumb.hasAttribute('data-snap-transition')).toBe(false);
    act(() => pointer(plane, 'pointerup', at(0.75, 0.5)));
    expect(thumb.hasAttribute('data-dragging')).toBe(false);
  });
});

describe('PlaneThumb snapping regressions', () => {
  it('positions thumbs of a Plane nested inside another thumb in their own plane', () => {
    const { container } = render(
      <Plane>
        <PlaneThumb thumbId="outer" defaultValue={{ x: 0.5, y: 0.5 }}>
          <Plane>
            <PlaneThumb thumbId="inner" defaultValue={{ x: 0.2, y: 0.2 }} />
          </Plane>
        </PlaneThumb>
      </Plane>,
    );
    const inner = container.querySelector(
      '[data-thumb-id="inner"]',
    ) as HTMLElement;
    expect(inner.style.left).toBe('20%');
    expect(inner.style.top).toBe('80%');
  });

  it('drops the snapped state when the targets are removed or replaced', () => {
    const point: PlaneSnapTarget = { type: 'point', x: 0.5, y: 0.5 };
    const { plane, thumb, container, rerenderThumb, onValueCommitted } = mount({
      snap: [point],
      defaultValue: { x: 0.2, y: 0.2 },
    });
    const probe = () =>
      container.querySelector('[data-testid="snapped"]')!.textContent;
    drag(plane, plane, [at(0.52, 0.5)]);
    expect(thumb.dataset.snapped).toBe('true');
    expect(probe()).toBe('point:xy');
    rerenderThumb({ snap: [{ type: 'point', x: 0.25, y: 0.25 }] });
    expect(thumb.hasAttribute('data-snapped')).toBe(false);
    expect(thumb.hasAttribute('data-snap-transition')).toBe(false);
    expect(probe()).toBe('none');
    rerenderThumb({ snap: [point] });
    expect(thumb.dataset.snapped).toBe('true');
    rerenderThumb({ snap: undefined });
    expect(thumb.hasAttribute('data-snapped')).toBe(false);
    expect(lastDetails(onValueCommitted).snap).toEqual({
      target: point,
      index: 0,
      axes: ['x', 'y'],
    });
  });

  it('keeps the snapped state when equal targets are recreated', () => {
    const { plane, thumb, rerenderThumb } = mount({
      snap: [{ type: 'line', axis: 'x', at: 0.5 }],
    });
    drag(plane, plane, [at(0.52, 0.3)]);
    expect(thumb.dataset.snappedAxis).toBe('x');
    rerenderThumb({ snap: [{ type: 'line', axis: 'x', at: 0.5 }] });
    expect(thumb.dataset.snappedAxis).toBe('x');
  });

  it('snaps both axes to perpendicular lines and reports both parts', () => {
    const vertical: PlaneSnapTarget = { type: 'line', axis: 'x', at: 0.5 };
    const horizontal: PlaneSnapTarget = { type: 'line', axis: 'y', at: 0.5 };
    const { plane, thumb, onValueChange } = mount({
      snap: [vertical, horizontal],
      defaultValue: { x: 0.1, y: 0.1 },
    });
    drag(plane, plane, [at(0.51, 0.49)]);
    expect(lastValue(onValueChange)).toEqual({ x: 0.5, y: 0.5 });
    expect(thumb.dataset.snappedAxis).toBe('both');
    expect(lastDetails(onValueChange).snap.parts).toHaveLength(2);
  });

  it('reaches both bounds when the grid does not divide the range', () => {
    const { axis, onValueChange } = mount({
      snap: [{ type: 'grid', x: 0.3 }],
      defaultValue: { x: 0.95, y: 0.5 },
    });
    // The last grid line (0.9) is behind the value: End goes to the bound.
    key(axis('x'), 'End');
    expect(lastValue(onValueChange).x).toBe(1);
    key(axis('x'), 'ArrowLeft');
    expect(lastValue(onValueChange).x).toBe(0.9);
    key(axis('x'), 'ArrowRight');
    expect(lastValue(onValueChange).x).toBe(1);
    key(axis('x'), 'Home');
    expect(lastValue(onValueChange).x).toBe(0);
  });

  it('only reports keyboard grid hits for axes the grid moved', () => {
    const { axis, thumb, onValueChange } = mount({
      snap: [{ type: 'grid', x: 0.25 }],
      defaultValue: { x: 0.3, y: 0.3 },
    });
    key(axis('x'), 'ArrowRight');
    expect(lastDetails(onValueChange).snap.axes).toEqual(['x']);
    expect(thumb.dataset.snapTransition).toBe('true');
    // y has no grid: no hit and no snap transition.
    key(axis('x'), 'ArrowUp');
    expect(lastDetails(onValueChange).snap).toBeUndefined();
    expect(thumb.hasAttribute('data-snapped')).toBe(false);
    expect(thumb.hasAttribute('data-snap-transition')).toBe(false);
  });
});

describe('PlaneThumb keyboard snapping', () => {
  const grid: PlaneSnapTarget = { type: 'grid', x: 0.25 };

  it('moves arrows to the next grid line on gridded axes', () => {
    const { axis, onValueChange, onValueCommitted } = mount({
      snap: [grid],
      defaultValue: { x: 0.3, y: 0.3 },
    });
    key(axis('x'), 'ArrowRight');
    expect(lastValue(onValueChange)).toEqual({ x: 0.5, y: 0.3 });
    expect(lastDetails(onValueChange).snap).toEqual({
      target: grid,
      index: 0,
      axes: ['x'],
    });
    expect(lastDetails(onValueCommitted).snap).toEqual({
      target: grid,
      index: 0,
      axes: ['x'],
    });
    key(axis('x'), 'ArrowLeft');
    expect(lastValue(onValueChange)).toEqual({ x: 0.25, y: 0.3 });
    // y has no grid: regular step.
    key(axis('x'), 'ArrowUp');
    expect(lastValue(onValueChange).y).toBeCloseTo(0.31);
  });

  it('uses smallStep without the grid while Alt is held, and large grid steps with Shift', () => {
    const { axis, onValueChange } = mount({
      snap: [{ type: 'grid', x: 0.05 }],
      defaultValue: { x: 0.5, y: 0.5 },
      largeStep: 0.2,
    });
    key(axis('x'), 'ArrowRight', { altKey: true });
    expect(lastValue(onValueChange).x).toBeCloseTo(0.501);
    expect(lastDetails(onValueChange).snap).toBeUndefined();
    key(axis('x'), 'ArrowRight');
    expect(lastValue(onValueChange).x).toBe(0.55);
    key(axis('x'), 'ArrowRight', { shiftKey: true });
    expect(lastValue(onValueChange).x).toBe(0.75);
    key(axis('x'), 'PageDown');
    expect(lastValue(onValueChange).x).toBe(0.55);
    key(axis('x'), 'End');
    expect(lastValue(onValueChange).x).toBe(1);
  });

  it('ignores magnetic targets for keyboard input', () => {
    const { axis, onValueChange } = mount({
      snap: [{ type: 'point', x: 0.51, y: 0.5 }],
      defaultValue: { x: 0.5, y: 0.5 },
    });
    key(axis('x'), 'ArrowRight');
    expect(lastValue(onValueChange)).toEqual({ x: 0.51, y: 0.5 });
    expect(lastDetails(onValueChange).snap).toBeUndefined();
  });

  it('exposes the grid size as the native step and the snapped value as text', () => {
    const { axis, onValueChange, plane } = mount({
      snap: [{ type: 'grid', x: 0.25, y: 0.1 }],
      defaultValue: { x: 0.5, y: 0.33 },
    });
    expect(axis('x').step).toBe('0.25');
    // 0.33 is off the y grid; "any" keeps the browser from rewriting it.
    expect(axis('y').step).toBe('any');
    drag(plane, plane, [at(0.62, 0.71)]);
    expect(lastValue(onValueChange)).toEqual({ x: 0.5, y: 0.7 });
    expect(axis('y').step).toBe('0.1');
    expect(axis('x').getAttribute('aria-valuetext')).toBe(
      '50% horizontal, 70% vertical',
    );
  });

  it('quantizes native input changes to the grid', () => {
    const { axis, onValueChange } = mount({ snap: [grid] });
    const input = axis('x');
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )!.set!;
      setter.call(input, '0.8');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(lastValue(onValueChange)).toEqual({ x: 0.75, y: 0.5 });
    expect(lastDetails(onValueChange).reason).toBe('input-change');
  });
});

describe('PlaneThumb motion', () => {
  function stubAnimationFrames() {
    let callbacks: FrameRequestCallback[] = [];
    let now = 0;
    const counts = { requested: 0, cancelled: 0 };
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      counts.requested += 1;
      callbacks.push(cb);
      return callbacks.length;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {
      counts.cancelled += 1;
      callbacks = [];
    });
    return {
      counts,
      pending: () => callbacks.length,
      frame(ms = 16) {
        now += ms;
        const run = callbacks;
        callbacks = [];
        act(() => run.forEach((cb) => cb(now)));
      },
      settle() {
        for (let i = 0; i < 20 && callbacks.length > 0; i += 1) this.frame();
      },
    };
  }

  // Moves halfway to the target each frame; done within 0.01.
  function createHalfway(smoothDrag = false) {
    const calls: { reason: string; dtMs: number }[] = [];
    const motion: PlaneMotion = {
      smoothDrag,
      step(current, target, dtMs, info) {
        calls.push({ reason: info.reason, dtMs });
        const value = {
          x: current.x + (target.x - current.x) / 2,
          y: current.y + (target.y - current.y) / 2,
        };
        const done =
          Math.abs(value.x - target.x) < 0.01 &&
          Math.abs(value.y - target.y) < 0.01;
        return { value: done ? target : value, done };
      },
    };
    return { motion, calls };
  }

  it('follows free drags instantly and animates snap transitions', () => {
    const frames = stubAnimationFrames();
    const { motion, calls } = createHalfway();
    const point: PlaneSnapTarget = { type: 'point', x: 0.5, y: 0.5 };
    const { plane, thumb, onValueChange } = mount({
      motion,
      snap: [point],
      defaultValue: { x: 0.2, y: 0.2 },
    });
    act(() => pointer(plane, 'pointerdown', at(0.2, 0.2)));
    act(() => pointer(plane, 'pointermove', at(0.3, 0.5)));
    // Free drag: drawn at the pointer, no frames.
    expect(thumb.style.left).toBe('30%');
    expect(frames.pending()).toBe(0);
    // Entering the point animates; the logical value is immediate.
    act(() => pointer(plane, 'pointermove', at(0.53, 0.5)));
    expect(lastValue(onValueChange)).toEqual({ x: 0.5, y: 0.5 });
    expect(thumb.style.left).toBe('30%');
    frames.frame();
    expect(parseFloat(thumb.style.left)).toBeCloseTo(40);
    expect(calls[0].reason).toBe('snap');
    frames.settle();
    expect(thumb.style.left).toBe('50%');
    // The next free move after leaving jumps to the pointer.
    act(() => pointer(plane, 'pointermove', at(0.7, 0.5)));
    act(() => pointer(plane, 'pointermove', at(0.75, 0.5)));
    expect(thumb.style.left).toBe('75%');
    act(() => pointer(plane, 'pointerup', at(0.75, 0.5)));
  });

  it('animates keyboard and programmatic changes', () => {
    const frames = stubAnimationFrames();
    const { motion, calls } = createHalfway();
    const { thumb, axis, rerenderThumb, onValueChange } = mount({
      motion,
      snap: [{ type: 'grid', x: 0.25 }],
      value: { x: 0.25, y: 0.5 },
    });
    key(axis('x'), 'ArrowRight');
    expect(lastValue(onValueChange)).toEqual({ x: 0.5, y: 0.5 });
    rerenderThumb({ value: { x: 0.5, y: 0.5 } });
    expect(thumb.style.left).toBe('25%');
    frames.frame();
    expect(calls[calls.length - 1].reason).toBe('keyboard');
    frames.settle();
    expect(thumb.style.left).toBe('50%');
    rerenderThumb({ value: { x: 0.9, y: 0.5 } });
    expect(thumb.style.left).toBe('50%');
    frames.frame();
    expect(calls[calls.length - 1].reason).toBe('programmatic');
    expect(parseFloat(thumb.style.left)).toBeCloseTo(70);
  });

  it('smooths free drags when the motion opts in', () => {
    const frames = stubAnimationFrames();
    const { motion, calls } = createHalfway(true);
    const { plane, thumb } = mount({
      motion,
      defaultValue: { x: 0.2, y: 0.5 },
    });
    drag(plane, plane, [at(0.6, 0.5)]);
    expect(thumb.style.left).toBe('20%');
    frames.frame();
    expect(calls[0].reason).toBe('drag');
    expect(parseFloat(thumb.style.left)).toBeCloseTo(40);
  });

  it('runs one frame loop that retargets without restarting and uses frame timestamps', () => {
    const frames = stubAnimationFrames();
    const { motion, calls } = createHalfway();
    const { thumb, rerenderThumb } = mount({
      motion,
      value: { x: 0.1, y: 0.5 },
    });
    rerenderThumb({ value: { x: 0.5, y: 0.5 } });
    frames.frame(16);
    frames.frame(20);
    const requestedBefore = frames.counts.requested;
    rerenderThumb({ value: { x: 0.9, y: 0.5 } });
    // Retargeting mid-animation neither cancels nor requests a new frame.
    expect(frames.counts.cancelled).toBe(0);
    expect(frames.counts.requested).toBe(requestedBefore);
    frames.frame(24);
    expect(calls.map((call) => call.dtMs).slice(1, 3)).toEqual([20, 24]);
    frames.settle();
    expect(thumb.style.left).toBe('90%');
    expect(frames.pending()).toBe(0);
  });

  it('settles instantly without motion', () => {
    const frames = stubAnimationFrames();
    const { plane, thumb } = mount({ defaultValue: { x: 0.2, y: 0.5 } });
    drag(plane, plane, [at(0.6, 0.5)]);
    expect(thumb.style.left).toBe('60%');
    expect(frames.pending()).toBe(0);
  });

  it('inherits motion from Plane and moves nested thumbs with the presented parent', () => {
    const frames = stubAnimationFrames();
    const { motion } = createHalfway();
    const { container } = render(
      <Plane motion={motion}>
        <PlaneThumb
          thumbId="parent"
          defaultValue={{ x: 0.2, y: 0.5 }}
          largeStep={0.4}
        >
          <PlaneThumb thumbId="child" defaultValue={{ x: 0.1, y: 0 }} />
        </PlaneThumb>
      </Plane>,
    );
    const thumb = (id: string) =>
      container.querySelector(`[data-thumb-id="${id}"]`) as HTMLElement;
    const parentAxis = thumb('parent').querySelector(
      ':scope > [data-plane-axis="x"]',
    )!;
    key(parentAxis, 'PageUp');
    expect(thumb('parent').style.left).toBe('20%');
    expect(parseFloat(thumb('child').style.left)).toBeCloseTo(30);
    frames.frame();
    expect(parseFloat(thumb('parent').style.left)).toBeCloseTo(40);
    expect(parseFloat(thumb('child').style.left)).toBeCloseTo(50);
  });

  it('hit-tests against the logical value during motion', () => {
    stubAnimationFrames();
    const { motion } = createHalfway();
    const { plane, thumb, axis, onValueChange } = mount(
      { motion, defaultValue: { x: 0.2, y: 0.5 }, largeStep: 0.6 },
      { pressBehavior: 'nearest' },
    );
    key(axis('x'), 'PageUp');
    // Presented still at 20%, but the logical position (80%) is what a
    // nearest-thumb press measures from.
    expect(thumb.style.left).toBe('20%');
    onValueChange.mockClear();
    drag(plane, plane, [at(0.79, 0.5)]);
    expect(lastValue(onValueChange).x).toBeCloseTo(0.79);
  });
});
