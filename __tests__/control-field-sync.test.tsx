// @vitest-environment jsdom

import * as React from 'react';
import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Field } from '@base-ui/react/field';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ControlField, type ControlFieldRootProps } from '../src/index.js';
import './helpers/dom-polyfills.js';

// Regressions for Base UI's internal text drifting from the text Control
// Field shows, and for scrub gesture lifecycle edge cases.

const mountedRoots: Root[] = [];

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function render(element: React.ReactElement) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push(root);
  act(() => root.render(element));
  return { container, root };
}

function mountField(
  props: Partial<ControlFieldRootProps> = {},
  { initialValue = 10 as number | null } = {},
) {
  function Harness() {
    const [value, setValue] = React.useState<number | null>(initialValue);
    return (
      <ControlField.Root
        {...props}
        value={value}
        onValueChange={(nextValue, details) => {
          props.onValueChange?.(nextValue, details);
          if (!details.isCanceled) setValue(nextValue);
        }}
      >
        <ControlField.Group>
          <ControlField.ScrubArea>V</ControlField.ScrubArea>
          <ControlField.Input aria-label="Amount" />
          <ControlField.Increment aria-label="Increase" />
        </ControlField.Group>
      </ControlField.Root>
    );
  }
  const { container } = render(<Harness />);
  const input = container.querySelector(
    '[data-slot="control-field-input"]',
  ) as HTMLInputElement;
  const increment = container.querySelector(
    '[data-slot="control-field-increment"]',
  ) as HTMLButtonElement;
  const scrubArea = container.querySelector(
    '[data-slot="control-field-scrub-area"]',
  ) as HTMLElement;
  scrubArea.setPointerCapture = vi.fn();
  return { container, input, increment, scrubArea };
}

function typeText(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function keyDown(input: HTMLInputElement, key: string) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  });
  act(() => {
    input.dispatchEvent(event);
  });
  return event;
}

function paste(input: HTMLInputElement, text: string) {
  const event = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', {
    value: { getData: () => text },
  });
  act(() => {
    input.dispatchEvent(event);
  });
}

function pointer(
  target: EventTarget,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  clientX: number,
) {
  act(() => {
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        clientX,
        button: 0,
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

describe('ControlField keeps Base UI text in sync with the display', () => {
  it.each([
    ['precision', { precision: 2 }],
    ['a rounding format', { format: { maximumFractionDigits: 2 } }],
  ])('pastes over a select-all with %s', (_label, props) => {
    const onValueCommitted = vi.fn();
    const { input } = mountField(
      { ...props, onValueCommitted },
      { initialValue: 0.123 },
    );

    act(() => input.focus());
    expect(input.value).toBe('0.12');
    input.setSelectionRange(0, input.value.length);
    paste(input, '5');
    expect(input.value).toBe('5');

    act(() => input.blur());
    expect(input.value).toBe('5');
    expect(onValueCommitted).toHaveBeenLastCalledWith(5, expect.anything());
  });

  it('allows a decimal point when the display rounds the fraction away', () => {
    const { input } = mountField({ precision: 0 }, { initialValue: 12.5 });

    act(() => input.focus());
    expect(input.value).toBe('13');
    input.setSelectionRange(2, 2);

    expect(keyDown(input, '.').defaultPrevented).toBe(false);
  });

  it('allows a decimal point over a select-all when the display is rounded', () => {
    const { input } = mountField({ precision: 0 }, { initialValue: 12.5 });

    act(() => input.focus());
    input.setSelectionRange(0, input.value.length);

    expect(keyDown(input, '.').defaultPrevented).toBe(false);
  });

  it('allows a minus sign when the display rounds the sign away', () => {
    const { input } = mountField(
      { precision: 0, min: -100 },
      { initialValue: -0.4 },
    );

    act(() => input.focus());
    expect(input.value).toBe('0');
    input.setSelectionRange(0, 0);

    expect(keyDown(input, '-').defaultPrevented).toBe(false);
  });

  it('steps the + button from a keyboard step made over typed text', () => {
    const { input, increment } = mountField();

    act(() => input.focus());
    act(() => typeText(input, '5'));
    keyDown(input, 'ArrowUp');
    expect(input.value).toBe('6');

    act(() => increment.click());
    expect(input.value).toBe('7');
  });

  it('steps the + button from a committed expression', () => {
    const { input, increment } = mountField();

    act(() => input.focus());
    act(() => typeText(input, '5'));
    act(() => typeText(input, '5+2'));
    keyDown(input, 'Enter');
    expect(input.value).toBe('7');

    act(() => increment.click());
    expect(input.value).toBe('8');
  });

  it('steps the + button from the value restored by Escape', () => {
    const { input, increment } = mountField();

    act(() => input.focus());
    act(() => typeText(input, '55'));
    keyDown(input, 'Escape');
    expect(input.value).toBe('10');

    act(() => increment.click());
    expect(input.value).toBe('11');
  });

  it('steps the + button from the exact value, not the rounded display', () => {
    const onValueChange = vi.fn();
    const { increment } = mountField(
      { precision: 0, onValueChange },
      { initialValue: 12.4 },
    );

    act(() => increment.click());
    expect(onValueChange).toHaveBeenLastCalledWith(
      13.4,
      expect.objectContaining({ reason: 'increment-press' }),
    );
  });
});

describe('ControlField blur commits', () => {
  it('runs Field onBlur validation for a typed value that clamps', () => {
    const validate = vi.fn(() => null);
    function Harness() {
      const [value, setValue] = React.useState<number | null>(10);
      return (
        <Field.Root validationMode="onBlur" validate={validate}>
          <ControlField.Root value={value} onValueChange={setValue} max={100}>
            <ControlField.Input aria-label="Amount" />
          </ControlField.Root>
        </Field.Root>
      );
    }
    const { container } = render(<Harness />);
    const input = container.querySelector(
      '[data-slot="control-field-input"]',
    ) as HTMLInputElement;

    act(() => input.focus());
    act(() => typeText(input, '150'));
    validate.mockClear();
    act(() => input.blur());

    expect(validate).toHaveBeenCalled();
    expect(input.value).toBe('100');
  });

  it('does not commit a typed value whose change was canceled', () => {
    const onValueCommitted = vi.fn();
    const { container } = render(
      <ControlField.Root
        defaultValue={10}
        onValueChange={(_value, details) => {
          if (
            details.reason === 'input-change' ||
            details.reason === 'input-blur'
          ) {
            details.cancel();
          }
        }}
        onValueCommitted={onValueCommitted}
      >
        <ControlField.Input aria-label="Amount" />
      </ControlField.Root>,
    );
    const input = container.querySelector(
      '[data-slot="control-field-input"]',
    ) as HTMLInputElement;

    act(() => input.focus());
    act(() => typeText(input, '55'));
    act(() => input.blur());

    expect(onValueCommitted).not.toHaveBeenCalled();
    expect(input.value).toBe('10');
  });

  it('drops a pending expression when the + button changes the value', () => {
    const onValueCommitted = vi.fn();
    const { input, increment } = mountField({ onValueCommitted });

    act(() => input.focus());
    act(() => typeText(input, '*2'));
    act(() => increment.click());
    expect(input.value).toBe('11');
    act(() => input.blur());

    expect(input.value).toBe('11');
    expect(onValueCommitted).not.toHaveBeenCalledWith(22, expect.anything());
  });

  it('drops a pending expression when scrubbing changes the value', () => {
    const { input, scrubArea } = mountField();

    act(() => input.focus());
    act(() => typeText(input, '*2'));
    pointer(scrubArea, 'pointerdown', 0);
    pointer(document, 'pointermove', 5);
    pointer(document, 'pointerup', 5);
    expect(input.value).toBe('15');
    act(() => input.blur());

    expect(input.value).toBe('15');
  });
});

describe('ControlField.ScrubArea lifecycle', () => {
  it('ends the gesture when the scrub area unmounts mid-drag', () => {
    const onScrubbingChange = vi.fn();
    const onValueCommitted = vi.fn();
    let setShown!: (shown: boolean) => void;
    function Harness() {
      const [shown, setShownState] = React.useState(true);
      setShown = setShownState;
      const [value, setValue] = React.useState<number | null>(10);
      return (
        <ControlField.Root
          value={value}
          onValueChange={setValue}
          onValueCommitted={onValueCommitted}
        >
          <ControlField.Group>
            {shown ? (
              <ControlField.ScrubArea onScrubbingChange={onScrubbingChange}>
                V
              </ControlField.ScrubArea>
            ) : null}
            <ControlField.Input aria-label="Amount" />
          </ControlField.Group>
        </ControlField.Root>
      );
    }
    const { container } = render(<Harness />);
    const scrubArea = container.querySelector(
      '[data-slot="control-field-scrub-area"]',
    ) as HTMLElement;
    scrubArea.setPointerCapture = vi.fn();
    const root = container.querySelector('[data-slot="control-field"]')!;

    pointer(scrubArea, 'pointerdown', 0);
    pointer(document, 'pointermove', 5);
    expect(root.hasAttribute('data-scrubbing')).toBe(true);

    act(() => setShown(false));

    expect(root.hasAttribute('data-scrubbing')).toBe(false);
    expect(onScrubbingChange.mock.calls).toEqual([[true], [false]]);
    expect(onValueCommitted).toHaveBeenCalledTimes(1);
    expect(onValueCommitted).toHaveBeenLastCalledWith(
      15,
      expect.objectContaining({ reason: 'scrub' }),
    );

    pointer(document, 'pointerup', 5);
    expect(onValueCommitted).toHaveBeenCalledTimes(1);
  });

  it('does not report scrubbing changes on mount under StrictMode', () => {
    const onScrubbingChange = vi.fn();
    const { container } = render(
      <StrictMode>
        <ControlField.Root defaultValue={10}>
          <ControlField.ScrubArea onScrubbingChange={onScrubbingChange}>
            V
          </ControlField.ScrubArea>
          <ControlField.Input aria-label="Amount" />
        </ControlField.Root>
      </StrictMode>,
    );
    expect(onScrubbingChange).not.toHaveBeenCalled();

    const scrubArea = container.querySelector(
      '[data-slot="control-field-scrub-area"]',
    ) as HTMLElement;
    scrubArea.setPointerCapture = vi.fn();
    pointer(scrubArea, 'pointerdown', 0);
    pointer(document, 'pointermove', 5);
    pointer(document, 'pointerup', 5);

    expect(onScrubbingChange.mock.calls).toEqual([[true], [false]]);
  });
});
