// @vitest-environment jsdom

import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MultiInputControl,
  type MultiInputConfig,
  type MultiInputField,
  type MultiInputValues,
} from '../src/index.js';
import './helpers/dom-polyfills.js';

const mountedRoots: Root[] = [];

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type FieldId = 'x' | 'a';

const fields: Array<MultiInputField<FieldId>> = [
  { value: 'x', label: 'X', tooltip: 'Horizontal position' },
  { value: 'a', label: 'A', tooltip: 'Opacity', unit: '%' },
];

// Only min and max are required per field.
const config: MultiInputConfig<FieldId> = {
  x: { min: 0, max: 100 },
  a: { min: 0, max: 1, step: 0.01 },
};

function mountMultiInput(
  onFieldChange = vi.fn(),
  onFieldCommit = vi.fn(),
  initial: MultiInputValues<FieldId> = { x: 50, a: 0.5 },
) {
  function Harness() {
    const [values, setValues] = useState(initial);
    return (
      <MultiInputControl
        fields={fields}
        config={config}
        values={values}
        onFieldChange={(field, value) => {
          setValues((current) => ({ ...current, [field]: value }));
          onFieldChange(field, value);
        }}
        onFieldCommit={onFieldCommit}
      />
    );
  }
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push(root);
  act(() => root.render(<Harness />));
  const inputs = Array.from(
    container.querySelectorAll('[data-slot="control-field-input"]'),
  ) as HTMLInputElement[];
  return { container, inputs, onFieldChange, onFieldCommit };
}

function changeInputValue(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function pressKey(input: HTMLInputElement, key: string) {
  act(() => {
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
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

describe('MultiInputControl on ControlInput', () => {
  it('labels each field and applies config defaults', () => {
    const { inputs, onFieldChange, onFieldCommit } = mountMultiInput();

    expect(inputs.map((input) => input.getAttribute('aria-label'))).toEqual([
      'Horizontal position',
      'Opacity',
    ]);
    expect(inputs[0].value).toBe('50');

    pressKey(inputs[0], 'ArrowUp');
    expect(onFieldChange).toHaveBeenLastCalledWith('x', 51);
    expect(onFieldCommit).toHaveBeenLastCalledWith('x', 51);
    expect(inputs[0].value).toBe('51');
  });

  it('scales percentage fields for display and back for callbacks', () => {
    const { inputs, onFieldChange, onFieldCommit } = mountMultiInput();

    expect(inputs[1].value).toBe('50');
    pressKey(inputs[1], 'ArrowUp');

    expect(onFieldChange.mock.calls.at(-1)?.[0]).toBe('a');
    expect(onFieldChange.mock.calls.at(-1)?.[1]).toBeCloseTo(0.51);
    expect(onFieldCommit.mock.calls.at(-1)?.[1]).toBeCloseTo(0.51);
    expect(inputs[1].value).toBe('51');
  });

  it('reports typed values live and commits them once', () => {
    const { inputs, onFieldChange, onFieldCommit } = mountMultiInput();

    act(() => {
      inputs[0].focus();
      changeInputValue(inputs[0], '7');
    });
    act(() => changeInputValue(inputs[0], '72'));
    expect(onFieldChange).toHaveBeenLastCalledWith('x', 72);
    expect(onFieldCommit).not.toHaveBeenCalled();

    act(() => inputs[0].blur());
    expect(onFieldCommit).toHaveBeenCalledTimes(1);
    expect(onFieldCommit).toHaveBeenLastCalledWith('x', 72);
  });

  it('commits a scrub once on release', () => {
    const { container, onFieldChange, onFieldCommit } = mountMultiInput();
    const handle = container.querySelectorAll(
      '[data-control-kit-scrub-handle]',
    )[0] as HTMLElement;
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
        new PointerEvent('pointermove', { pointerId: 1, clientX: 3 }),
      );
    });
    act(() => {
      document.dispatchEvent(
        new PointerEvent('pointermove', { pointerId: 1, clientX: 6 }),
      );
    });
    expect(container.firstElementChild?.hasAttribute('data-scrubbing')).toBe(
      true,
    );
    act(() => {
      document.dispatchEvent(
        new PointerEvent('pointerup', { pointerId: 1, clientX: 6 }),
      );
    });

    expect(onFieldChange).toHaveBeenCalledTimes(2);
    expect(onFieldCommit).toHaveBeenCalledTimes(1);
    expect(onFieldCommit).toHaveBeenLastCalledWith('x', 56);
  });

  it('resolves arithmetic expressions by default', () => {
    const { inputs, onFieldCommit } = mountMultiInput();

    act(() => {
      inputs[0].focus();
      changeInputValue(inputs[0], '* 2');
    });
    pressKey(inputs[0], 'Enter');

    expect(onFieldCommit).toHaveBeenLastCalledWith('x', 100);
  });
});
