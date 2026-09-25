// @vitest-environment jsdom
import { act, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ColorValueSlider, Slider, type SliderProps } from '../src/slider.js';
import './helpers/dom-polyfills.js';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
function mount(props: SliderProps, color = false) {
  const container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  const render = (nextProps: SliderProps) =>
    act(() =>
      root.render(
        color ? <ColorValueSlider {...nextProps} /> : <Slider {...nextProps} />,
      ),
    );
  render(props);
  return Object.assign(container, { rerender: render });
}
afterEach(() => {
  act(() => root.unmount());
  document.body.replaceChildren();
});
function key(input: HTMLInputElement, key: string, shiftKey = false) {
  act(() =>
    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        key,
        shiftKey,
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
}
function slot(container: HTMLElement, name: string) {
  return container.querySelector<HTMLElement>(`[data-slot="${name}"]`);
}
describe('shared Slider foundation', () => {
  it('connects numeric bounds, keyboard steps, and commit callbacks to the accessible input', () => {
    const onValueCommitted = vi.fn();
    const container = mount({
      'aria-label': 'Flow',
      defaultValue: 25,
      min: 10,
      max: 90,
      step: 5,
      largeStep: 20,
      onValueCommitted,
    });
    const input = container.querySelector('input')!;
    expect(input.getAttribute('aria-label')).toBe('Flow');
    key(input, 'ArrowRight');
    expect(input.value).toBe('30');
    key(input, 'ArrowRight', true);
    expect(input.value).toBe('50');
    key(input, 'End');
    expect(input.value).toBe('90');
    key(input, 'Home');
    expect(input.value).toBe('10');
    expect(onValueCommitted).toHaveBeenLastCalledWith(
      10,
      expect.objectContaining({ reason: 'keyboard' }),
    );
  });
  it('keeps color rail styles and value text while using the same vertical keyboard input', () => {
    const container = mount(
      {
        'aria-label': 'Chroma',
        'aria-valuetext': '20 percent',
        defaultValue: 0.2,
        min: 0,
        max: 0.4,
        step: 0.004,
        orientation: 'vertical',
        trackProps: { style: { background: 'red' } },
      },
      true,
    );
    const input = container.querySelector('input')!;
    expect(input.getAttribute('aria-valuetext')).toBe('20 percent');
    expect(input.getAttribute('aria-orientation')).toBe('vertical');
    expect(
      container
        .querySelector('[data-slot="slider-track"]')
        ?.getAttribute('style'),
    ).toContain('red');
    expect(
      container.querySelector('[data-slot="slider-indicator"]'),
    ).toBeNull();
    key(input, 'ArrowUp');
    expect(input.value).toBe('0.204');
  });
  it('disables the Base UI input and preserves controlled state', () => {
    const onValueChange = vi.fn();
    const container = mount({
      'aria-label': 'Grain',
      value: 30,
      disabled: true,
      onValueChange,
    });
    expect(container.querySelector('input')?.disabled).toBe(true);
    expect(container.querySelector('input')?.value).toBe('30');
    expect(onValueChange).not.toHaveBeenCalled();
  });
  it('leaves thumb focus visuals to unstyled consumers', () => {
    const container = mount({
      'aria-label': 'Custom slider',
      defaultValue: 50,
      unstyled: true,
    });
    const thumb = container.querySelector('[data-slot="slider-thumb"]');
    expect(thumb?.className).not.toContain('focus-within:ring');
  });
});

describe('Slider structure and slots', () => {
  it('renders every part with a data-slot and forwards the ref to the root', () => {
    const ref = createRef<HTMLDivElement>();
    const container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() =>
      root.render(
        <Slider ref={ref} aria-label="Opacity" defaultValue={40}>
          <span data-testid="child">extra</span>
        </Slider>,
      ),
    );

    const sliderRoot = slot(container, 'slider');
    expect(ref.current).toBe(sliderRoot);
    expect(slot(container, 'slider-control')).not.toBeNull();
    expect(slot(container, 'slider-track')).not.toBeNull();
    expect(slot(container, 'slider-indicator')).not.toBeNull();
    expect(slot(container, 'slider-thumb')).not.toBeNull();
    expect(
      sliderRoot?.querySelector('[data-testid="child"]')?.textContent,
    ).toBe('extra');
  });

  it('merges root and slot class names with the default styles', () => {
    const container = mount({
      'aria-label': 'Size',
      defaultValue: 10,
      className: 'root-extra',
      trackProps: { className: 'track-extra' },
      thumbProps: { className: 'thumb-extra', 'data-testid': 'thumb' },
      controlProps: { className: 'control-extra', 'data-part': 'control' },
    });

    const sliderRoot = slot(container, 'slider')!;
    expect(sliderRoot.className).toContain('root-extra');
    expect(sliderRoot.className).toContain('w-full');
    expect(slot(container, 'slider-track')!.className).toContain('track-extra');
    expect(slot(container, 'slider-track')!.className).toContain(
      'rounded-full',
    );
    const thumb = slot(container, 'slider-thumb')!;
    expect(thumb.className).toContain('thumb-extra');
    expect(thumb.className).toContain('focus-within:ring');
    expect(thumb.getAttribute('data-testid')).toBe('thumb');
    const control = slot(container, 'slider-control')!;
    expect(control.className).toContain('control-extra');
    expect(control.getAttribute('data-part')).toBe('control');
  });

  it('drops default sizing and visuals when unstyled but keeps consumer classes and positioning', () => {
    const container = mount({
      'aria-label': 'Custom',
      defaultValue: 50,
      unstyled: true,
      className: 'my-root',
      trackProps: { className: 'my-track' },
      thumbProps: { className: 'my-thumb' },
    });

    const sliderRoot = slot(container, 'slider')!;
    expect(sliderRoot.className).toContain('my-root');
    expect(sliderRoot.className).not.toContain('h-6');
    expect(sliderRoot.className).not.toContain('w-full');
    expect(slot(container, 'slider-track')!.className).toBe('my-track');
    expect(slot(container, 'slider-thumb')!.className).toBe('my-thumb');
    expect(slot(container, 'slider-control')!.style.position).toBe('absolute');
  });

  it('lets controlProps extend and override the control positioning styles', () => {
    const container = mount({
      'aria-label': 'Offset',
      defaultValue: 0,
      controlProps: { style: { inset: '4px', cursor: 'crosshair' } },
    });

    const control = slot(container, 'slider-control')!;
    expect(control.style.position).toBe('absolute');
    expect(control.style.display).toBe('flex');
    expect(control.style.inset).toBe('4px');
    expect(control.style.cursor).toBe('crosshair');
  });

  it('omits the indicator when showIndicator is false', () => {
    const container = mount({
      'aria-label': 'Hue',
      defaultValue: 10,
      showIndicator: false,
    });

    expect(slot(container, 'slider-indicator')).toBeNull();
    expect(slot(container, 'slider-track')).not.toBeNull();
  });

  it('sizes and labels by orientation', () => {
    const horizontal = mount({ 'aria-label': 'Across', defaultValue: 1 });
    expect(slot(horizontal, 'slider')!.className).toContain('h-6 w-full');
    expect(slot(horizontal, 'slider')!.getAttribute('data-orientation')).toBe(
      'horizontal',
    );
    expect(
      horizontal.querySelector('input')!.getAttribute('aria-orientation'),
    ).toBe('horizontal');
    act(() => root.unmount());

    const vertical = mount({
      'aria-label': 'Down',
      defaultValue: 1,
      orientation: 'vertical',
    });
    expect(slot(vertical, 'slider')!.className).toContain('h-40 w-6');
    expect(slot(vertical, 'slider')!.getAttribute('data-orientation')).toBe(
      'vertical',
    );
  });
});

describe('Slider accessibility', () => {
  it('routes aria-labelledby and aria-valuetext to the range input, not the root', () => {
    const container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() =>
      root.render(
        <>
          <span id="slider-label">Exposure</span>
          <Slider
            aria-labelledby="slider-label"
            aria-valuetext="plus one stop"
            defaultValue={1}
            min={-3}
            max={3}
          />
        </>,
      ),
    );

    const input = container.querySelector('input')!;
    expect(input.type).toBe('range');
    expect(input.getAttribute('aria-labelledby')).toBe('slider-label');
    expect(input.getAttribute('aria-valuetext')).toBe('plus one stop');
    expect(input.min).toBe('-3');
    expect(input.max).toBe('3');
    const sliderRoot = slot(container, 'slider')!;
    expect(sliderRoot.getAttribute('aria-labelledby')).not.toBe('slider-label');
    expect(sliderRoot.hasAttribute('aria-valuetext')).toBe(false);
  });

  it('marks every part disabled and keeps the input out of focus', () => {
    const container = mount({
      'aria-label': 'Locked',
      defaultValue: 20,
      disabled: true,
    });
    const input = container.querySelector('input')!;

    expect(slot(container, 'slider')!.hasAttribute('data-disabled')).toBe(true);
    expect(slot(container, 'slider-thumb')!.hasAttribute('data-disabled')).toBe(
      true,
    );
    expect(input.disabled).toBe(true);
    act(() => input.focus());
    expect(document.activeElement).not.toBe(input);
  });
});

describe('Slider values and callbacks', () => {
  it('reports keyboard changes and commits with Base UI event details', () => {
    const onValueChange = vi.fn();
    const onValueCommitted = vi.fn();
    const container = mount({
      'aria-label': 'Level',
      defaultValue: 50,
      onValueChange,
      onValueCommitted,
    });
    const input = container.querySelector('input')!;

    key(input, 'ArrowLeft');

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(
      49,
      expect.objectContaining({ reason: 'keyboard' }),
    );
    expect(onValueCommitted).toHaveBeenCalledExactlyOnceWith(
      49,
      expect.objectContaining({ reason: 'keyboard' }),
    );
  });

  it('uses largeStep for PageUp and PageDown', () => {
    const container = mount({
      'aria-label': 'Paged',
      defaultValue: 50,
      largeStep: 25,
    });
    const input = container.querySelector('input')!;

    key(input, 'PageUp');
    expect(input.value).toBe('75');
    key(input, 'PageDown');
    key(input, 'PageDown');
    expect(input.value).toBe('25');
  });

  it('clamps at the bounds without reporting a change', () => {
    const onValueChange = vi.fn();
    const onValueCommitted = vi.fn();
    const container = mount({
      'aria-label': 'Edge',
      defaultValue: 100,
      onValueChange,
      onValueCommitted,
    });
    const input = container.querySelector('input')!;

    key(input, 'ArrowRight');
    key(input, 'End');

    expect(input.value).toBe('100');
    expect(onValueChange).not.toHaveBeenCalled();
    expect(onValueCommitted).not.toHaveBeenCalled();
  });

  it('reports controlled changes without moving until the value prop updates', () => {
    const onValueChange = vi.fn();
    const props: SliderProps = {
      'aria-label': 'Controlled',
      value: 10,
      onValueChange,
    };
    const container = mount(props);
    const input = container.querySelector('input')!;

    key(input, 'ArrowRight');
    expect(onValueChange).toHaveBeenLastCalledWith(11, expect.anything());
    expect(input.value).toBe('10');

    container.rerender({ ...props, value: 11 });
    expect(input.value).toBe('11');
    key(input, 'ArrowRight');
    expect(onValueChange).toHaveBeenLastCalledWith(12, expect.anything());
  });
});

describe('ColorValueSlider', () => {
  it('tags the root and thumb for color styling while preserving consumer thumb props', () => {
    const container = mount(
      {
        'aria-label': 'Lightness',
        defaultValue: 0.5,
        min: 0,
        max: 1,
        step: 0.01,
        thumbProps: { className: 'swatch', 'data-channel': 'l' },
      },
      true,
    );

    const sliderRoot = slot(container, 'slider')!;
    const thumb = slot(container, 'slider-thumb')!;
    expect(sliderRoot.hasAttribute('data-color-value-slider')).toBe(true);
    expect(thumb.hasAttribute('data-color-slider-thumb')).toBe(true);
    expect(thumb.getAttribute('data-channel')).toBe('l');
    expect(thumb.className).toContain('swatch');
    expect(slot(container, 'slider-indicator')).toBeNull();
    expect(container.querySelector('input')!.getAttribute('aria-label')).toBe(
      'Lightness',
    );
  });

  it('reports fractional keyboard changes through the shared callbacks', () => {
    const onValueChange = vi.fn();
    const container = mount(
      {
        'aria-label': 'Alpha',
        defaultValue: 0.5,
        min: 0,
        max: 1,
        step: 0.05,
        onValueChange,
      },
      true,
    );

    key(container.querySelector('input')!, 'ArrowDown');

    expect(onValueChange).toHaveBeenCalledOnce();
    expect(onValueChange.mock.calls[0][0]).toBeCloseTo(0.45);
  });
});
