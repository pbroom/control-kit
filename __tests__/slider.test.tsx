// @vitest-environment jsdom
import { act } from 'react';
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
  act(() =>
    root.render(
      color ? <ColorValueSlider {...props} /> : <Slider {...props} />,
    ),
  );
  return container;
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
});
