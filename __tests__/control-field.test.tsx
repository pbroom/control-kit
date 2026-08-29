// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Field } from '@base-ui/react/field';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ControlField,
  resolveControlFieldExpression,
  type ControlFieldRootProps,
} from '../src/index.js';
import './helpers/dom-polyfills.js';

const mountedRoots: Root[] = [];

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function mountControlField(props: Partial<ControlFieldRootProps> = {}) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push(root);

  act(() => {
    root.render(
      <Field.Root>
        <ControlField.Root defaultValue={10} {...props}>
          <ControlField.ScrubArea>
            <ControlField.Label>Opacity</ControlField.Label>
            <ControlField.ScrubAreaCursor />
          </ControlField.ScrubArea>
          <ControlField.Group>
            <ControlField.Decrement aria-label="Decrease" />
            <ControlField.Input />
            <ControlField.Increment aria-label="Increase" />
          </ControlField.Group>
          <ControlField.Description>Percentage value</ControlField.Description>
        </ControlField.Root>
      </Field.Root>,
    );
  });

  return container;
}

function changeInputValue(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function keyDown(input: HTMLInputElement, key: string) {
  input.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
  );
}

afterEach(() => {
  for (const root of mountedRoots.splice(0)) {
    act(() => root.unmount());
  }
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('ControlField', () => {
  it('composes Base UI field and number field parts', () => {
    const container = mountControlField();
    const input = container.querySelector('input');

    expect(
      container.querySelector('[data-slot="control-field"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-slot="control-field-scrub-area"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-slot="control-field-group"]'),
    ).not.toBeNull();
    expect(input?.getAttribute('aria-labelledby')).toBeTruthy();
    expect(input?.getAttribute('aria-describedby')).toBeTruthy();
  });

  it('leaves ordinary numeric text entry with Base UI', () => {
    const onValueChange = vi.fn();
    const container = mountControlField({ onValueChange });
    const input = container.querySelector(
      '[data-slot="control-field-input"]',
    ) as HTMLInputElement;

    act(() => {
      input.focus();
      changeInputValue(input, '12');
    });

    expect(input.value).toBe('12');
    expect(onValueChange).toHaveBeenCalledWith(
      12,
      expect.objectContaining({ reason: 'input-change' }),
    );
    expect(input.hasAttribute('data-expression')).toBe(false);
  });

  it('commits arithmetic expression drafts on Enter', () => {
    const onValueChange = vi.fn();
    const onValueCommitted = vi.fn();
    const container = mountControlField({
      onValueChange,
      onValueCommitted,
    });
    const input = container.querySelector(
      '[data-slot="control-field-input"]',
    ) as HTMLInputElement;

    act(() => {
      input.focus();
      changeInputValue(input, '* 2');
    });
    expect(input.value).toBe('* 2');
    expect(input.hasAttribute('data-expression')).toBe(true);

    act(() => keyDown(input, 'Enter'));

    expect(input.value).toBe('20');
    expect(onValueChange).toHaveBeenLastCalledWith(
      20,
      expect.objectContaining({ reason: 'expression', expression: '* 2' }),
    );
    expect(onValueCommitted).toHaveBeenLastCalledWith(
      20,
      expect.objectContaining({ reason: 'expression', expression: '* 2' }),
    );
  });

  it('keeps invalid expressions editable and restores the value with Escape', () => {
    const container = mountControlField();
    const input = container.querySelector(
      '[data-slot="control-field-input"]',
    ) as HTMLInputElement;

    act(() => changeInputValue(input, '2 /'));
    act(() => keyDown(input, 'Enter'));

    expect(input.value).toBe('2 /');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.hasAttribute('data-expression-invalid')).toBe(true);

    act(() => keyDown(input, 'Escape'));

    expect(input.value).toBe('10');
    expect(input.hasAttribute('data-expression-invalid')).toBe(false);
  });

  it('steps by pageStep with Page Up and Page Down', () => {
    const onValueChange = vi.fn();
    const container = mountControlField({ pageStep: 5, onValueChange });
    const input = container.querySelector(
      '[data-slot="control-field-input"]',
    ) as HTMLInputElement;

    act(() => keyDown(input, 'PageUp'));
    expect(input.value).toBe('15');
    expect(onValueChange).toHaveBeenLastCalledWith(
      15,
      expect.objectContaining({ reason: 'page-step' }),
    );

    act(() => keyDown(input, 'PageDown'));
    expect(input.value).toBe('10');
  });

  it('wraps stepped values when requested', () => {
    const container = mountControlField({
      boundaryBehavior: 'wrap',
      min: 0,
      max: 10,
      defaultValue: 10,
      step: 1,
    });
    const input = container.querySelector(
      '[data-slot="control-field-input"]',
    ) as HTMLInputElement;

    act(() => keyDown(input, 'ArrowUp'));
    expect(input.value).toBe('1');
  });
});

describe('resolveControlFieldExpression', () => {
  it('evaluates arithmetic without executing JavaScript', () => {
    expect(
      resolveControlFieldExpression('(2 + 3) * 4', { currentValue: 10 }),
    ).toBe(20);
    expect(resolveControlFieldExpression('* 2', { currentValue: 10 })).toBe(20);
    expect(
      resolveControlFieldExpression('current / 4', { currentValue: 20 }),
    ).toBe(5);
    expect(
      resolveControlFieldExpression('globalThis.alert(1)', {
        currentValue: 10,
      }),
    ).toBeNull();
  });
});
