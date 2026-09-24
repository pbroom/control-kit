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
  type ControlFieldScrubAreaProps,
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

  it('restores the last committed value on Escape', () => {
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

  it('moves the Escape and expression baseline to each commit', () => {
    const { input } = mountControlledField();

    act(() => {
      input.focus();
      changeInputValue(input, '10');
    });
    pressKey(input, 'Enter');
    pressKey(input, 'ArrowUp');
    expect(input.value).toBe('11');

    act(() => changeInputValue(input, '99'));
    pressKey(input, 'Escape');
    expect(input.value).toBe('11');

    act(() => changeInputValue(input, '* 2'));
    pressKey(input, 'Enter');
    expect(input.value).toBe('22');
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

function mountScrubField(
  rootProps: Partial<ControlFieldRootProps> = {},
  scrubProps: Partial<ControlFieldScrubAreaProps> = {},
  { accept = false, initialValue = 42 } = {},
) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push(root);

  function Harness() {
    const [value, setValue] = React.useState<number | null>(initialValue);
    return (
      <ControlField.Root
        {...rootProps}
        value={value}
        onValueChange={(nextValue, details) => {
          if (accept) setValue(nextValue);
          rootProps.onValueChange?.(nextValue, details);
        }}
      >
        <ControlField.Group>
          <ControlField.ScrubArea {...scrubProps}>V</ControlField.ScrubArea>
          <ControlField.Input aria-label="Amount" />
        </ControlField.Group>
      </ControlField.Root>
    );
  }

  act(() => {
    root.render(<Harness />);
  });

  const handle = container.querySelector(
    '[data-slot="control-field-scrub-area"]',
  ) as HTMLSpanElement;
  handle.setPointerCapture = vi.fn();
  return { container, handle };
}

function firePointer(
  target: EventTarget,
  type:
    | 'pointerdown'
    | 'pointermove'
    | 'pointerup'
    | 'pointercancel'
    | 'lostpointercapture',
  init: {
    pointerId: number;
    clientX: number;
    button?: number;
    shiftKey?: boolean;
    altKey?: boolean;
  },
) {
  act(() => {
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: init.pointerId,
        clientX: init.clientX,
        button: init.button ?? 0,
        shiftKey: init.shiftKey ?? false,
        altKey: init.altKey ?? false,
      }),
    );
  });
}

function mockAnimationFrames() {
  const frameCallbacks = new Map<number, FrameRequestCallback>();
  let nextFrameId = 1;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    const frameId = nextFrameId++;
    frameCallbacks.set(frameId, callback);
    return frameId;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((frameId) => {
    frameCallbacks.delete(frameId);
  });
  return (frameTime: number) => {
    const next = frameCallbacks.entries().next().value;
    expect(next).toBeDefined();
    const [frameId, callback] = next as [number, FrameRequestCallback];
    frameCallbacks.delete(frameId);
    act(() => callback(frameTime));
  };
}

const scrubReason = expect.objectContaining({ reason: 'scrub' });

describe('ControlField.ScrubArea', () => {
  it('scrubs through document pointer events and commits once on release', () => {
    const onValueChange = vi.fn();
    const onValueCommitted = vi.fn();
    const { container, handle } = mountScrubField(
      { onValueChange, onValueCommitted },
      {},
      { accept: true },
    );

    firePointer(handle, 'pointerdown', { pointerId: 1, clientX: 0 });
    firePointer(document, 'pointermove', { pointerId: 1, clientX: 10 });
    firePointer(document, 'pointermove', { pointerId: 1, clientX: 20 });

    expect(onValueChange).toHaveBeenCalledTimes(2);
    expect(onValueChange).toHaveBeenLastCalledWith(62, scrubReason);
    expect(getControlFieldInteraction(onValueChange.mock.calls[1][1])).toBe(
      'pointer',
    );
    expect(onValueCommitted).not.toHaveBeenCalled();
    expect(
      container
        .querySelector('[data-slot="control-field"]')
        ?.hasAttribute('data-scrubbing'),
    ).toBe(true);
    expect(
      container
        .querySelector('[data-slot="control-field-group"]')
        ?.hasAttribute('data-scrubbing'),
    ).toBe(true);

    firePointer(document, 'pointerup', { pointerId: 1, clientX: 20 });

    expect(onValueCommitted).toHaveBeenCalledTimes(1);
    expect(onValueCommitted).toHaveBeenLastCalledWith(62, scrubReason);
    expect(
      container
        .querySelector('[data-slot="control-field"]')
        ?.hasAttribute('data-scrubbing'),
    ).toBe(false);
  });

  it('does not commit a press without movement', () => {
    const onValueCommitted = vi.fn();
    const { handle } = mountScrubField({ onValueCommitted });

    firePointer(handle, 'pointerdown', { pointerId: 1, clientX: 0 });
    firePointer(document, 'pointerup', { pointerId: 1, clientX: 0 });

    expect(onValueCommitted).not.toHaveBeenCalled();
  });

  it('reports scrubbing state changes', () => {
    const onScrubbingChange = vi.fn();
    const { handle } = mountScrubField({}, { onScrubbingChange });

    firePointer(handle, 'pointerdown', { pointerId: 1, clientX: 0 });
    firePointer(document, 'pointermove', { pointerId: 1, clientX: 5 });
    firePointer(document, 'pointerup', { pointerId: 1, clientX: 5 });

    expect(onScrubbingChange.mock.calls).toEqual([[true], [false]]);
  });

  it('steps discretely with stepDistance', () => {
    const onValueChange = vi.fn();
    const { handle } = mountScrubField(
      { onValueChange, step: 0.1, smallStep: 0.01, largeStep: 1 },
      { stepDistance: 2 },
    );

    firePointer(handle, 'pointerdown', { pointerId: 4, clientX: 0 });
    firePointer(document, 'pointermove', { pointerId: 4, clientX: 1 });
    expect(onValueChange).not.toHaveBeenCalled();
    firePointer(document, 'pointermove', { pointerId: 4, clientX: 2 });
    expect(onValueChange).toHaveBeenLastCalledWith(42.1, scrubReason);
    firePointer(document, 'pointermove', { pointerId: 4, clientX: 3 });
    expect(onValueChange).toHaveBeenCalledTimes(1);
    firePointer(document, 'pointermove', { pointerId: 4, clientX: 4 });
    expect(onValueChange).toHaveBeenLastCalledWith(42.2, scrubReason);
  });

  it('does not skip steps for fractional stepDistance values', () => {
    const onValueChange = vi.fn();
    const { handle } = mountScrubField(
      { onValueChange, step: 0.1, smallStep: 0.01, largeStep: 1 },
      { stepDistance: 1.5 },
    );

    firePointer(handle, 'pointerdown', { pointerId: 5, clientX: 0 });
    firePointer(document, 'pointermove', { pointerId: 5, clientX: 2.4 });
    expect(onValueChange).toHaveBeenLastCalledWith(42.1, scrubReason);
    firePointer(document, 'pointermove', { pointerId: 5, clientX: 2.6 });
    expect(onValueChange).toHaveBeenCalledTimes(1);
    firePointer(document, 'pointermove', { pointerId: 5, clientX: 3 });
    expect(onValueChange).toHaveBeenLastCalledWith(42.2, scrubReason);
  });

  it('defers updates until the max commit rate frame budget elapses', () => {
    const flushFrame = mockAnimationFrames();
    const onValueChange = vi.fn();
    const { handle } = mountScrubField(
      { onValueChange },
      { maxCommitRate: 10 },
    );

    firePointer(handle, 'pointerdown', { pointerId: 8, clientX: 0 });
    firePointer(document, 'pointermove', { pointerId: 8, clientX: 5 });
    expect(onValueChange).not.toHaveBeenCalled();

    flushFrame(16);
    expect(onValueChange).toHaveBeenLastCalledWith(47, scrubReason);

    firePointer(document, 'pointermove', { pointerId: 8, clientX: 8 });
    flushFrame(40);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    flushFrame(116);
    expect(onValueChange).toHaveBeenLastCalledWith(50, scrubReason);
  });

  it('accumulates locked pointer movement across frames and release', () => {
    const flushFrame = mockAnimationFrames();
    const moveLockedPointer = (
      movementX: number,
      altKey = false,
      shiftKey = false,
    ) => {
      const event = new MouseEvent('mousemove', {
        bubbles: true,
        altKey,
        shiftKey,
      });
      Object.defineProperty(event, 'movementX', { value: movementX });
      act(() => document.dispatchEvent(event));
    };
    const onValueChange = vi.fn();
    const onValueCommitted = vi.fn();
    const { handle } = mountScrubField(
      { onValueChange, onValueCommitted },
      { pointerLock: true, maxCommitRate: 10 },
      { accept: true },
    );
    handle.requestPointerLock = vi.fn();
    const originalPointerLock = Object.getOwnPropertyDescriptor(
      document,
      'pointerLockElement',
    );
    Object.defineProperty(document, 'pointerLockElement', {
      configurable: true,
      get: () => handle,
    });
    try {
      firePointer(handle, 'pointerdown', { pointerId: 8, clientX: 0 });
      expect(handle.requestPointerLock).toHaveBeenCalled();
      moveLockedPointer(5);
      moveLockedPointer(5);
      moveLockedPointer(5);
      expect(onValueChange).not.toHaveBeenCalled();
      flushFrame(16);
      expect(onValueChange).toHaveBeenLastCalledWith(57, scrubReason);

      moveLockedPointer(2, true);
      moveLockedPointer(3, true);
      flushFrame(40);
      expect(onValueChange).toHaveBeenCalledTimes(1);
      flushFrame(116);
      expect(onValueChange).toHaveBeenLastCalledWith(57.5, scrubReason);

      moveLockedPointer(5);
      moveLockedPointer(5, true);
      moveLockedPointer(2, false, true);
      moveLockedPointer(5, true);
      moveLockedPointer(1);
      flushFrame(140);
      expect(onValueChange).toHaveBeenCalledTimes(2);
      flushFrame(216);
      expect(onValueChange).toHaveBeenLastCalledWith(84.5, scrubReason);

      moveLockedPointer(4, true);
      moveLockedPointer(1, true);
      firePointer(document, 'pointerup', { pointerId: 8, clientX: 0 });
      expect(onValueChange).toHaveBeenCalledTimes(4);
      expect(onValueChange).toHaveBeenLastCalledWith(85, scrubReason);
      expect(onValueCommitted).toHaveBeenCalledTimes(1);
      expect(onValueCommitted).toHaveBeenLastCalledWith(85, scrubReason);
    } finally {
      if (originalPointerLock) {
        Object.defineProperty(
          document,
          'pointerLockElement',
          originalPointerLock,
        );
      } else {
        Reflect.deleteProperty(document, 'pointerLockElement');
      }
    }
  });

  it.each([false, true])(
    'preserves pending modifier segments with a frame after each move: %s',
    (flushEachMove) => {
      const flushFrame = mockAnimationFrames();
      const onValueChange = vi.fn();
      const { handle } = mountScrubField(
        { onValueChange },
        { maxCommitRate: 10 },
        { accept: true },
      );
      firePointer(handle, 'pointerdown', { pointerId: 9, clientX: 0 });

      const moves = [
        { clientX: 5, altKey: false, shiftKey: false },
        { clientX: 10, altKey: true, shiftKey: false },
        { clientX: 12, altKey: false, shiftKey: true },
        { clientX: 17, altKey: true, shiftKey: false },
        { clientX: 18, altKey: false, shiftKey: false },
      ];
      for (const [index, move] of moves.entries()) {
        firePointer(document, 'pointermove', { pointerId: 9, ...move });
        if (flushEachMove) flushFrame(16 + index * 100);
        else expect(onValueChange).not.toHaveBeenCalled();
      }
      if (!flushEachMove) flushFrame(16);
      expect(onValueChange).toHaveBeenLastCalledWith(69, scrubReason);
      expect(onValueChange).toHaveBeenCalledTimes(
        flushEachMove ? moves.length : 1,
      );
      firePointer(document, 'pointerup', { pointerId: 9, clientX: 18 });
    },
  );

  it('holds updates below the commit threshold until release or cancel', () => {
    const onValueChange = vi.fn();
    const onValueCommitted = vi.fn();
    const { handle } = mountScrubField(
      { onValueChange, onValueCommitted },
      { commitThreshold: 5 },
    );

    firePointer(handle, 'pointerdown', { pointerId: 6, clientX: 0 });
    firePointer(document, 'pointermove', { pointerId: 6, clientX: 4 });
    expect(onValueChange).not.toHaveBeenCalled();
    firePointer(document, 'pointermove', { pointerId: 6, clientX: 5 });
    expect(onValueChange).toHaveBeenLastCalledWith(47, scrubReason);
    firePointer(document, 'pointermove', { pointerId: 6, clientX: 7 });
    expect(onValueChange).toHaveBeenCalledTimes(1);

    firePointer(document, 'pointercancel', { pointerId: 6, clientX: 7 });
    expect(onValueChange).toHaveBeenCalledTimes(2);
    expect(onValueChange).toHaveBeenLastCalledWith(49, scrubReason);
    expect(onValueCommitted).toHaveBeenCalledTimes(1);
    expect(onValueCommitted).toHaveBeenLastCalledWith(49, scrubReason);
  });

  it('ends scrubbing when the handle loses pointer capture', () => {
    const onValueChange = vi.fn();
    const { handle } = mountScrubField(
      { onValueChange },
      { commitThreshold: 5 },
    );

    firePointer(handle, 'pointerdown', { pointerId: 9, clientX: 0 });
    firePointer(document, 'pointermove', { pointerId: 9, clientX: 5 });
    firePointer(document, 'pointermove', { pointerId: 9, clientX: 7 });
    expect(onValueChange).toHaveBeenCalledTimes(1);

    firePointer(handle, 'lostpointercapture', { pointerId: 9, clientX: 7 });
    expect(onValueChange).toHaveBeenCalledTimes(2);
    expect(onValueChange).toHaveBeenLastCalledWith(49, scrubReason);

    firePointer(document, 'pointermove', { pointerId: 9, clientX: 12 });
    expect(onValueChange).toHaveBeenCalledTimes(2);
  });

  it('falls back to document dragging when pointer lock throws', () => {
    const onValueChange = vi.fn();
    const { handle } = mountScrubField(
      { onValueChange },
      { pointerLock: true },
    );
    handle.requestPointerLock = vi.fn(() => {
      throw new Error('Pointer lock unavailable');
    }) as HTMLSpanElement['requestPointerLock'];

    firePointer(handle, 'pointerdown', { pointerId: 2, clientX: 0 });
    firePointer(document, 'pointermove', { pointerId: 2, clientX: 12 });

    expect(onValueChange).toHaveBeenLastCalledWith(54, scrubReason);
  });

  it('does not request pointer lock by default', () => {
    const { handle } = mountScrubField();
    handle.requestPointerLock = vi.fn();

    firePointer(handle, 'pointerdown', { pointerId: 2, clientX: 0 });

    expect(handle.requestPointerLock).not.toHaveBeenCalled();
    firePointer(document, 'pointerup', { pointerId: 2, clientX: 0 });
  });

  it('rebases scrub movement at clamp boundaries', () => {
    const onValueChange = vi.fn();
    const { handle } = mountScrubField(
      { onValueChange, min: 0, max: 100 },
      {},
      { initialValue: 95 },
    );

    firePointer(handle, 'pointerdown', { pointerId: 3, clientX: 0 });
    firePointer(document, 'pointermove', { pointerId: 3, clientX: 10 });
    expect(onValueChange).toHaveBeenLastCalledWith(100, scrubReason);
    firePointer(document, 'pointermove', { pointerId: 3, clientX: 9 });
    expect(onValueChange).toHaveBeenLastCalledWith(99, scrubReason);
  });

  it('wraps scrub values across the range', () => {
    const onValueChange = vi.fn();
    const { handle } = mountScrubField(
      { onValueChange, min: 0, max: 360, boundaryBehavior: 'wrap' },
      {},
      { initialValue: 355 },
    );

    firePointer(handle, 'pointerdown', { pointerId: 3, clientX: 0 });
    firePointer(document, 'pointermove', { pointerId: 3, clientX: 10 });
    expect(onValueChange).toHaveBeenLastCalledWith(5, scrubReason);
  });

  it('does not scrub when disabled or read-only', () => {
    const onValueChange = vi.fn();
    const { handle: disabledHandle } = mountScrubField({
      onValueChange,
      disabled: true,
    });
    firePointer(disabledHandle, 'pointerdown', { pointerId: 8, clientX: 0 });
    firePointer(document, 'pointermove', { pointerId: 8, clientX: 20 });

    const { handle: readOnlyHandle } = mountScrubField({
      onValueChange,
      readOnly: true,
    });
    firePointer(readOnlyHandle, 'pointerdown', { pointerId: 9, clientX: 0 });
    firePointer(document, 'pointermove', { pointerId: 9, clientX: 20 });

    expect(onValueChange).not.toHaveBeenCalled();
    expect(disabledHandle.hasAttribute('data-disabled')).toBe(true);
  });

  it('renders the deprecated ScrubAreaCursor as nothing', () => {
    const container = mountControlField();
    expect(
      container.querySelector('[data-slot="control-field-scrub-area"]')
        ?.children.length,
    ).toBe(1);
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
