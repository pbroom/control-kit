// @vitest-environment jsdom

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Field } from '@base-ui/react/field';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ControlField,
  getControlFieldInteraction,
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
    expect(
      container.querySelector('[data-slot="control-field-description"]'),
    ).toBeInstanceOf(HTMLParagraphElement);
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

  it('commits arithmetic expression drafts once on blur', () => {
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
    act(() => input.blur());

    expect(input.value).toBe('20');
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith(
      20,
      expect.objectContaining({ reason: 'expression', expression: '* 2' }),
    );
    expect(onValueCommitted).toHaveBeenCalledTimes(1);
    expect(onValueCommitted).toHaveBeenCalledWith(
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

  it('does not apply custom keyboard steps when read-only', () => {
    const onValueChange = vi.fn();
    const onValueCommitted = vi.fn();
    const container = mountControlField({
      boundaryBehavior: 'wrap',
      min: 0,
      max: 100,
      onValueChange,
      onValueCommitted,
      readOnly: true,
    });
    const input = container.querySelector(
      '[data-slot="control-field-input"]',
    ) as HTMLInputElement;

    act(() => {
      keyDown(input, 'PageUp');
      keyDown(input, 'PageDown');
      keyDown(input, 'Home');
      keyDown(input, 'End');
    });

    expect(input.value).toBe('10');
    expect(onValueChange).not.toHaveBeenCalled();
    expect(onValueCommitted).not.toHaveBeenCalled();
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

function mountControlledField(
  props: Partial<ControlFieldRootProps> = {},
  {
    accept = true,
    initialValue = 42,
  }: { accept?: boolean; initialValue?: number } = {},
) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push(root);

  function Harness() {
    const [value, setValue] = React.useState<number | null>(initialValue);
    return (
      <ControlField.Root
        {...props}
        value={value}
        onValueChange={(nextValue, details) => {
          if (accept) setValue(nextValue);
          props.onValueChange?.(nextValue, details);
        }}
      >
        <ControlField.Group>
          <ControlField.Decrement aria-label="Decrease" />
          <ControlField.Input aria-label="Amount" />
          <ControlField.Increment aria-label="Increase" />
        </ControlField.Group>
      </ControlField.Root>
    );
  }

  act(() => {
    root.render(<Harness />);
  });

  const input = container.querySelector(
    '[data-slot="control-field-input"]',
  ) as HTMLInputElement;
  return { container, input };
}

function pressKey(
  input: HTMLInputElement,
  key: string,
  modifiers: { shiftKey?: boolean; altKey?: boolean } = {},
) {
  act(() => {
    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
        ...modifiers,
      }),
    );
  });
}

describe('ControlField keyboard stepping', () => {
  it('steps with modifier-aware step sizes and keyboard reasons', () => {
    const onValueChange = vi.fn();
    const onValueCommitted = vi.fn();
    const { input } = mountControlledField({ onValueChange, onValueCommitted });

    pressKey(input, 'ArrowUp', { shiftKey: true });
    expect(onValueChange).toHaveBeenLastCalledWith(
      52,
      expect.objectContaining({ reason: 'keyboard' }),
    );
    expect(onValueCommitted).toHaveBeenLastCalledWith(
      52,
      expect.objectContaining({ reason: 'keyboard' }),
    );
    expect(getControlFieldInteraction(onValueChange.mock.calls[0][1])).toBe(
      'keyboard',
    );

    pressKey(input, 'ArrowDown');
    expect(onValueChange).toHaveBeenLastCalledWith(51, expect.anything());
  });

  it('accumulates fine steps independently of the display precision', () => {
    const onValueChange = vi.fn();
    const { input } = mountControlledField({ onValueChange, precision: 0 });

    act(() => input.focus());
    for (let index = 0; index < 3; index += 1) {
      pressKey(input, 'ArrowUp', { altKey: true });
    }

    expect(onValueChange).toHaveBeenCalledTimes(3);
    expect(onValueChange.mock.calls[2][0]).toBe(42.3);
    expect(input.value).toBe('42');
  });

  it('steps from the typed draft when stepping while editing', () => {
    const onValueChange = vi.fn();
    const { input } = mountControlledField(
      { onValueChange },
      { accept: false },
    );

    act(() => {
      input.focus();
      changeInputValue(input, '25');
    });
    pressKey(input, 'ArrowUp');

    expect(onValueChange).toHaveBeenLastCalledWith(
      26,
      expect.objectContaining({ reason: 'keyboard' }),
    );
  });

  it('wraps keyboard steps across the range', () => {
    const onValueChange = vi.fn();
    const { input } = mountControlledField(
      {
        onValueChange,
        boundaryBehavior: 'wrap',
        min: 0,
        max: 100,
        step: 10,
      },
      { initialValue: 95 },
    );

    pressKey(input, 'ArrowUp');
    expect(onValueChange).toHaveBeenLastCalledWith(5, expect.anything());
  });

  it('jumps to Home and End boundaries without wrapping', () => {
    const onValueChange = vi.fn();
    const { input } = mountControlledField(
      {
        onValueChange,
        boundaryBehavior: 'wrap',
        min: 0,
        max: 100,
      },
      { accept: false, initialValue: 95 },
    );

    pressKey(input, 'End');
    expect(onValueChange).toHaveBeenLastCalledWith(
      100,
      expect.objectContaining({ reason: 'boundary-key' }),
    );
    pressKey(input, 'Home');
    expect(onValueChange).toHaveBeenLastCalledWith(
      0,
      expect.objectContaining({ reason: 'boundary-key' }),
    );
  });

  it('leaves horizontal arrows to the caret unless arrowKeys is both', () => {
    const onValueChange = vi.fn();
    const { input } = mountControlledField({ onValueChange });
    pressKey(input, 'ArrowRight');
    expect(onValueChange).not.toHaveBeenCalled();

    const { input: bothInput } = mountControlledField({
      onValueChange,
      arrowKeys: 'both',
    });
    pressKey(bothInput, 'ArrowRight');
    expect(onValueChange).toHaveBeenLastCalledWith(43, expect.anything());
    pressKey(bothInput, 'ArrowLeft');
    expect(onValueChange).toHaveBeenLastCalledWith(42, expect.anything());
  });

  it('does not step when disabled or read-only', () => {
    const onValueChange = vi.fn();
    const { input: disabledInput } = mountControlledField({
      onValueChange,
      disabled: true,
    });
    pressKey(disabledInput, 'ArrowUp');
    const { input: readOnlyInput } = mountControlledField({
      onValueChange,
      readOnly: true,
    });
    pressKey(readOnlyInput, 'ArrowUp');

    expect(onValueChange).not.toHaveBeenCalled();
    expect(disabledInput.disabled).toBe(true);
  });

  it('lets free values leave the range while stepping', () => {
    const onValueChange = vi.fn();
    const { input } = mountControlledField(
      { onValueChange, boundaryBehavior: 'free', min: 0, max: 100 },
      { initialValue: 100 },
    );

    pressKey(input, 'ArrowUp');
    expect(onValueChange).toHaveBeenLastCalledWith(101, expect.anything());
  });
});

describe('ControlField text entry', () => {
  it('commits typed text once on Enter and keeps focus', () => {
    const onValueChange = vi.fn();
    const onValueCommitted = vi.fn();
    const { input } = mountControlledField({ onValueChange, onValueCommitted });

    act(() => {
      input.focus();
      changeInputValue(input, '25');
    });
    expect(onValueChange).toHaveBeenLastCalledWith(
      25,
      expect.objectContaining({ reason: 'input-change' }),
    );
    expect(onValueCommitted).not.toHaveBeenCalled();

    pressKey(input, 'Enter');
    expect(onValueCommitted).toHaveBeenCalledTimes(1);
    expect(onValueCommitted).toHaveBeenLastCalledWith(25, expect.anything());
    expect(document.activeElement).toBe(input);

    act(() => input.blur());
    expect(onValueCommitted).toHaveBeenCalledTimes(1);
  });

  it('commits typed text once on blur', () => {
    const onValueCommitted = vi.fn();
    const { input } = mountControlledField({ onValueCommitted });

    act(() => {
      input.focus();
      changeInputValue(input, '25');
    });
    act(() => input.blur());

    expect(onValueCommitted).toHaveBeenCalledTimes(1);
    expect(onValueCommitted).toHaveBeenLastCalledWith(
      25,
      expect.objectContaining({ reason: 'input-blur' }),
    );
    expect(input.value).toBe('25');
  });

  it('restores the focus value on Escape', () => {
    const onValueChange = vi.fn();
    const onValueCommitted = vi.fn();
    const { input } = mountControlledField({ onValueChange, onValueCommitted });

    act(() => {
      input.focus();
      changeInputValue(input, '25');
    });
    pressKey(input, 'Escape');

    expect(input.value).toBe('42');
    expect(onValueChange).toHaveBeenLastCalledWith(42, expect.anything());
    act(() => input.blur());
    expect(onValueCommitted).not.toHaveBeenCalled();
  });

  it('discards drafts on blur when commitOnBlur is false', () => {
    const onValueCommitted = vi.fn();
    const { input } = mountControlledField({
      commitOnBlur: false,
      onValueCommitted,
    });

    act(() => {
      input.focus();
      changeInputValue(input, '25');
    });
    act(() => input.blur());

    expect(onValueCommitted).not.toHaveBeenCalled();
    expect(input.value).toBe('42');
  });

  it('reports invalid commits with the rejected text', () => {
    const onInvalidCommit = vi.fn();
    const onValueCommitted = vi.fn();
    const { input } = mountControlledField({
      onInvalidCommit,
      onValueCommitted,
    });

    act(() => {
      input.focus();
      changeInputValue(input, '2 /');
    });
    pressKey(input, 'Enter');
    expect(onInvalidCommit).toHaveBeenLastCalledWith(
      '2 /',
      expect.objectContaining({ reason: 'keyboard', expression: true }),
    );
    expect(input.value).toBe('2 /');

    act(() => input.blur());
    expect(onInvalidCommit).toHaveBeenCalledTimes(2);
    expect(input.value).toBe('42');
    expect(onValueCommitted).not.toHaveBeenCalled();
  });

  it('selects the text on focus when selectOnFocus is set', () => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    const { input } = mountControlledField({ selectOnFocus: true });

    act(() => input.focus());
    act(() => frames.splice(0).forEach((frame) => frame(0)));

    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(input.value.length);
  });

  it('derives the display format from precision', () => {
    const { input } = mountControlledField(
      { precision: 2 },
      { initialValue: 1.5 },
    );
    expect(input.value).toBe('1.5');

    const { input: fixedInput } = mountControlledField(
      { precision: 2, trimTrailingZeros: false },
      { initialValue: 1234.5 },
    );
    expect(fixedInput.value).toBe('1234.50');
  });

  it('passes range and start value to expression resolvers', () => {
    const expressionResolver = vi.fn(() => 7);
    const { input } = mountControlledField(
      { expressionResolver, min: 0, max: 10 },
      { initialValue: 5 },
    );

    act(() => {
      input.focus();
      changeInputValue(input, '50%');
    });
    pressKey(input, 'Enter');

    expect(expressionResolver).toHaveBeenCalledWith(
      '50%',
      expect.objectContaining({
        currentValue: 5,
        startValue: 5,
        range: [0, 10],
      }),
    );
  });
});

describe('ControlField format rounding', () => {
  it('does not round a controlled value on focus and blur', () => {
    const onValueChange = vi.fn();
    const onValueCommitted = vi.fn();
    const { input } = mountControlledField(
      {
        format: { maximumFractionDigits: 0 },
        onValueChange,
        onValueCommitted,
      },
      { initialValue: 42.3 },
    );

    expect(input.value).toBe('42');
    act(() => input.focus());
    act(() => input.blur());

    expect(onValueChange).not.toHaveBeenCalled();
    expect(onValueCommitted).not.toHaveBeenCalled();
  });

  it('does not round keyboard or button steps to the format', () => {
    const onValueChange = vi.fn();
    const { container, input } = mountControlledField({
      format: { maximumFractionDigits: 0 },
      onValueChange,
    });

    pressKey(input, 'ArrowUp', { altKey: true });
    expect(onValueChange).toHaveBeenLastCalledWith(42.1, expect.anything());

    const increment = container.querySelector(
      '[data-slot="control-field-increment"]',
    ) as HTMLButtonElement;
    act(() => {
      increment.dispatchEvent(
        new MouseEvent('click', { bubbles: true, altKey: true }),
      );
    });
    expect(onValueChange).toHaveBeenLastCalledWith(
      42.2,
      expect.objectContaining({ reason: 'increment-press' }),
    );
    expect(input.value).toBe('42');
  });

  it('still rounds typed values to an explicit rounding format', () => {
    const onValueCommitted = vi.fn();
    const { input } = mountControlledField({
      format: { maximumFractionDigits: 1 },
      onValueCommitted,
    });

    act(() => {
      input.focus();
      changeInputValue(input, '12.37');
    });
    act(() => input.blur());

    expect(onValueCommitted).toHaveBeenLastCalledWith(12.4, expect.anything());
    expect(input.value).toBe('12.4');
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

  it('applies exponentiation before unary signs', () => {
    expect(resolveControlFieldExpression('-2^2', { currentValue: 10 })).toBe(
      -4,
    );
    expect(resolveControlFieldExpression('2^-2', { currentValue: 10 })).toBe(
      0.25,
    );
    expect(resolveControlFieldExpression('2^3^2', { currentValue: 10 })).toBe(
      512,
    );
  });
});
