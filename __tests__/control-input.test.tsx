// @vitest-environment jsdom

import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ControlInput,
  usePrimitiveValueInput,
  type ControlInputProps,
  type UsePrimitiveValueInputOptions,
} from '../src/index.js';
import './helpers/dom-polyfills.js';

const mountedRoots: Root[] = [];

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function mount(element: React.ReactElement) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push(root);
  act(() => root.render(element));
  return container;
}

function mountControlInput(props: Partial<ControlInputProps> = {}) {
  function Harness() {
    const [value, setValue] = useState<number | null>(props.defaultValue ?? 42);
    return (
      <ControlInput
        {...props}
        value={value}
        onValueChange={(nextValue, details) => {
          setValue(nextValue);
          props.onValueChange?.(nextValue, details);
        }}
      />
    );
  }
  const container = mount(<Harness />);
  const input = container.querySelector(
    'input[type="text"]',
  ) as HTMLInputElement;
  return { container, input };
}

function pressKey(
  input: HTMLInputElement,
  key: string,
  init: KeyboardEventInit = {},
) {
  act(() => {
    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
        ...init,
      }),
    );
  });
}

afterEach(() => {
  for (const root of mountedRoots.splice(0)) {
    act(() => root.unmount());
  }
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('ControlInput', () => {
  it('renders with no props', () => {
    const html = renderToStaticMarkup(<ControlInput />);

    expect(html).toContain('data-slot="control-input"');
    expect(html).toContain('data-slot="control-field-group"');
    expect(html).toContain('data-slot="control-field-input"');
    expect(html).toContain('data-control-kit-scrub-handle');
    expect(html).toContain('w-full');
    expect(html).toContain('h-6');
  });

  it('uses Control Field defaults for stepping and bounds', () => {
    const onValueChange = vi.fn();
    const { input } = mountControlInput({ onValueChange });

    pressKey(input, 'ArrowUp');
    expect(onValueChange).toHaveBeenLastCalledWith(43, expect.anything());
    pressKey(input, 'ArrowUp', { altKey: true });
    expect(onValueChange.mock.calls[1][0]).toBeCloseTo(43.1);
    pressKey(input, 'ArrowUp', { shiftKey: true });
    expect(onValueChange.mock.calls[2][0]).toBeCloseTo(53.1);
    pressKey(input, 'PageUp');
    expect(onValueChange.mock.calls[3][0]).toBeCloseTo(63.1);
  });

  it('labels the input and renders the unit after the text', () => {
    const html = renderToStaticMarkup(
      <ControlInput value={4} label="Radius" unit="px" handle="R" />,
    );

    expect(html).toContain('aria-label="Radius"');
    expect(html.indexOf('>R<')).toBeLessThan(html.indexOf('value="4"'));
    expect(html.indexOf('value="4"')).toBeLessThan(html.indexOf('>px<'));
  });

  it('places a trailing handle after the unit', () => {
    const html = renderToStaticMarkup(
      <ControlInput value={4} unit="px" handle="D" handleSide="trailing" />,
    );

    expect(html.indexOf('>px<')).toBeLessThan(html.indexOf('>D<'));
  });

  it('renders a thin edge scrub strip without handle content', () => {
    const { container } = mountControlInput();
    const handle = container.querySelector(
      '[data-control-kit-scrub-handle]',
    ) as HTMLElement;

    expect(handle.className).toContain('w-[5px]');
    expect(handle.textContent).toBe('');
  });

  it('omits the scrub handle when scrub is false', () => {
    const html = renderToStaticMarkup(<ControlInput scrub={false} />);
    expect(html).not.toContain('data-control-kit-scrub-handle');
  });

  it('applies size, density, and the embedded variant', () => {
    const html = renderToStaticMarkup(
      <ControlInput size="sm" density="comfortable" variant="embedded" />,
    );

    expect(html).toContain('w-32');
    expect(html).toContain('h-8');
    expect(html).toContain('rounded-none');
    expect(html).toContain('data-variant="embedded"');
    expect(html).toContain('border-color:transparent');
  });

  it('marks the input invalid when requested', () => {
    const html = renderToStaticMarkup(<ControlInput invalid />);
    expect(html).toContain('aria-invalid="true"');
  });

  it('scrubs through the handle', () => {
    const onValueChange = vi.fn();
    const onValueCommitted = vi.fn();
    const { container } = mountControlInput({
      onValueChange,
      onValueCommitted,
      handle: 'V',
    });
    const handle = container.querySelector(
      '[data-control-kit-scrub-handle]',
    ) as HTMLElement;
    handle.setPointerCapture = vi.fn();

    act(() => {
      handle.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          pointerId: 1,
          clientX: 0,
          button: 0,
        }),
      );
    });
    act(() => {
      document.dispatchEvent(
        new PointerEvent('pointermove', { pointerId: 1, clientX: 8 }),
      );
    });
    act(() => {
      document.dispatchEvent(
        new PointerEvent('pointerup', { pointerId: 1, clientX: 8 }),
      );
    });

    expect(onValueChange).toHaveBeenLastCalledWith(
      50,
      expect.objectContaining({ reason: 'scrub' }),
    );
    expect(onValueCommitted).toHaveBeenCalledTimes(1);
  });
});

describe('usePrimitiveValueInput (deprecated)', () => {
  it('keeps working for direct consumers', () => {
    const onValueChange = vi.fn();
    const options: UsePrimitiveValueInputOptions = {
      value: 10,
      onValueChange,
      min: 0,
      max: 100,
      wrapMode: 'clamp',
      step: 1,
      fineStep: 0.1,
      coarseStep: 10,
      pageStep: 10,
      precision: 1,
      autoTrim: true,
      allowExpressions: false,
      selectAllOnFocus: false,
      commitOnBlur: true,
      scrubEnabled: true,
      scrubThreshold: 1,
      pointerLockEnabled: false,
      disabled: false,
      readOnly: false,
    };
    function HookHarness() {
      const { inputRef, inputProps } = usePrimitiveValueInput(options);
      return <input ref={inputRef} {...inputProps} />;
    }
    const container = mount(<HookHarness />);
    const input = container.querySelector('input') as HTMLInputElement;

    pressKey(input, 'ArrowUp', { shiftKey: true });
    expect(onValueChange).toHaveBeenLastCalledWith(20, {
      interaction: 'keyboard',
    });
  });
});
