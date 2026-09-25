// @vitest-environment jsdom

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ControlField,
  PrimitiveValueInput,
  getControlFieldInteraction,
  type ControlFieldRootProps,
  type ControlFieldScrubAreaProps,
} from '../src/index.js';
import './helpers/dom-polyfills.js';

// Regressions for PR #91 review threads.

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

let setExternalValue: (value: number | null) => void = () => {};

function mountField(
  props: Partial<ControlFieldRootProps> = {},
  scrubProps: Partial<ControlFieldScrubAreaProps> = {},
  initialValue: number | null = 10,
) {
  function Harness() {
    const [value, setValue] = React.useState<number | null>(initialValue);
    setExternalValue = setValue;
    return (
      <form>
        <ControlField.Root
          {...props}
          value={value}
          onValueChange={(nextValue, details) => {
            props.onValueChange?.(nextValue, details);
            if (!details.isCanceled) setValue(nextValue);
          }}
        >
          <ControlField.Group>
            <ControlField.ScrubArea {...scrubProps}>V</ControlField.ScrubArea>
            <ControlField.Input aria-label="Amount" />
          </ControlField.Group>
        </ControlField.Root>
      </form>
    );
  }
  const { container, root } = render(<Harness />);
  const input = container.querySelector(
    '[data-slot="control-field-input"]',
  ) as HTMLInputElement;
  const scrubArea = container.querySelector(
    '[data-slot="control-field-scrub-area"]',
  ) as HTMLElement;
  scrubArea.setPointerCapture = vi.fn();
  const form = container.querySelector('form') as HTMLFormElement;
  return { container, root, input, scrubArea, form };
}

function typeText(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function keyDown(
  input: HTMLInputElement,
  key: string,
  init: KeyboardEventInit = {},
) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  act(() => {
    input.dispatchEvent(event);
  });
  return event;
}

function pointer(
  target: EventTarget,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  clientX: number,
  init: { shiftKey?: boolean } = {},
) {
  act(() => {
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        clientX,
        button: 0,
        ...init,
      }),
    );
  });
}

function mockAnimationFrames() {
  const frames = new Map<number, FrameRequestCallback>();
  let nextId = 1;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    const id = nextId++;
    frames.set(id, callback);
    return id;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    frames.delete(id);
  });
  return (time: number) => {
    const next = frames.entries().next().value;
    if (!next) return;
    const [id, callback] = next;
    frames.delete(id);
    act(() => callback(time));
  };
}

afterEach(() => {
  for (const root of mountedRoots.splice(0)) {
    act(() => root.unmount());
  }
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('Enter commits typed text as text input', () => {
  it('uses the input-commit reason for typed and expression commits', () => {
    const onValueChange = vi.fn();
    const onValueCommitted = vi.fn();
    const { input } = mountField({ onValueChange, onValueCommitted });

    act(() => input.focus());
    act(() => typeText(input, '25'));
    keyDown(input, 'Enter');
    const [value, details] = onValueCommitted.mock.calls.at(-1)!;
    expect(value).toBe(25);
    expect(details.reason).toBe('input-commit');
    expect(getControlFieldInteraction(details)).toBe('text-input');

    const onInvalidCommit = vi.fn();
    const { input: second } = mountField({ onInvalidCommit });
    act(() => second.focus());
    act(() => typeText(second, '2/'));
    keyDown(second, 'Enter');
    expect(onInvalidCommit).toHaveBeenLastCalledWith(
      '2/',
      expect.objectContaining({ reason: 'input-commit' }),
    );
  });
});

describe('ScrubArea respects canceled changes', () => {
  it('does not commit a scrub whose updates were all canceled', () => {
    const onValueCommitted = vi.fn();
    const { scrubArea, input } = mountField({
      onValueChange: (_value, details) => {
        if (details.reason === 'scrub') details.cancel();
      },
      onValueCommitted,
    });

    pointer(scrubArea, 'pointerdown', 0);
    pointer(document, 'pointermove', 5);
    pointer(document, 'pointerup', 5);

    expect(onValueCommitted).not.toHaveBeenCalled();
    expect(input.value).toBe('10');
  });

  it('commits the last accepted value when later updates are canceled', () => {
    const onValueCommitted = vi.fn();
    const { scrubArea } = mountField({
      onValueChange: (value, details) => {
        if (details.reason === 'scrub' && value !== null && value > 13) {
          details.cancel();
        }
      },
      onValueCommitted,
    });

    pointer(scrubArea, 'pointerdown', 0);
    pointer(document, 'pointermove', 3);
    pointer(document, 'pointermove', 8);
    pointer(document, 'pointerup', 8);

    expect(onValueCommitted).toHaveBeenCalledTimes(1);
    expect(onValueCommitted).toHaveBeenLastCalledWith(
      13,
      expect.objectContaining({ reason: 'scrub' }),
    );
  });
});

describe('Base UI text sync dispatches no DOM events', () => {
  it('keeps native input listeners on an enclosing form silent while focused', () => {
    const { input, form } = mountField({ precision: 2 }, {}, 1.234);
    const formInput = vi.fn();
    form.addEventListener('input', formInput);

    act(() => input.focus());
    keyDown(input, 'ArrowUp');
    keyDown(input, 'ArrowUp');

    expect(input.value).toBe('3.23');
    expect(formInput).not.toHaveBeenCalled();

    // Base UI's text was still synced: a select-all paste replaces it.
    input.setSelectionRange(0, input.value.length);
    const paste = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(paste, 'clipboardData', {
      value: { getData: () => '7' },
    });
    act(() => {
      input.dispatchEvent(paste);
    });
    expect(input.value).toBe('7');
  });
});

describe('Modified navigation keys', () => {
  it.each([
    ['Ctrl+Home', 'Home', { ctrlKey: true }],
    ['Meta+End', 'End', { metaKey: true }],
    ['Ctrl+ArrowUp', 'ArrowUp', { ctrlKey: true }],
    ['Meta+ArrowDown', 'ArrowDown', { metaKey: true }],
  ])('%s leaves the value alone', (_label, key, modifiers) => {
    const onValueChange = vi.fn();
    const { input } = mountField({ onValueChange, min: 0, max: 100 });

    act(() => input.focus());
    const event = keyDown(input, key, modifiers);

    expect(event.defaultPrevented).toBe(false);
    expect(onValueChange).not.toHaveBeenCalled();
    expect(input.value).toBe('10');
  });
});

describe('Escape baseline', () => {
  it('follows controlled updates made while focused', () => {
    const onValueChange = vi.fn();
    const { input } = mountField({ onValueChange });

    act(() => input.focus());
    act(() => setExternalValue(20));
    expect(input.value).toBe('20');
    act(() => typeText(input, '55'));
    keyDown(input, 'Escape');

    expect(input.value).toBe('20');
    expect(onValueChange).not.toHaveBeenCalledWith(10, expect.anything());
  });
});

describe('PrimitiveValueInput legacy Enter', () => {
  function mountLegacy(
    onValueChange: ReturnType<typeof vi.fn>,
    onInvalidCommit?: ReturnType<typeof vi.fn>,
  ) {
    const { container } = render(
      <PrimitiveValueInput
        value={42}
        onValueChange={onValueChange}
        onInvalidCommit={onInvalidCommit}
        min={0}
        max={100}
        wrapMode="clamp"
        step={1}
        fineStep={0.1}
        coarseStep={10}
        pageStep={10}
        precision={0}
        autoTrim
        allowExpressions
        selectAllOnFocus={false}
        commitOnBlur={false}
        scrubEnabled
        scrubThreshold={1}
        pointerLockEnabled={false}
        disabled={false}
        readOnly={false}
        visualState="auto"
        size="full"
      />,
    );
    return container.querySelector('input') as HTMLInputElement;
  }

  it('commits on Enter even when commitOnBlur is false', () => {
    const onValueChange = vi.fn();
    const input = mountLegacy(onValueChange);

    act(() => input.focus());
    act(() => typeText(input, '25'));
    keyDown(input, 'Enter');

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenLastCalledWith(25, {
      interaction: 'text-input',
    });
    expect(document.activeElement).not.toBe(input);
  });

  it('reports and reverts an invalid draft once on Enter', () => {
    const onValueChange = vi.fn();
    const onInvalidCommit = vi.fn();
    const input = mountLegacy(onValueChange, onInvalidCommit);

    act(() => input.focus());
    act(() => typeText(input, 'nope'));
    keyDown(input, 'Enter');

    expect(onInvalidCommit).toHaveBeenCalledTimes(1);
    expect(onValueChange).not.toHaveBeenCalled();
    expect(input.value).toBe('42');
  });
});

describe('Rate-limited scrub edges', () => {
  it('keeps a queued Shift segment when the release has no modifier', () => {
    mockAnimationFrames();
    const onValueCommitted = vi.fn();
    const { scrubArea, input } = mountField(
      { onValueCommitted },
      { maxCommitRate: 10 },
      42,
    );

    pointer(scrubArea, 'pointerdown', 0);
    pointer(document, 'pointermove', 5, { shiftKey: true });
    pointer(document, 'pointerup', 5);

    expect(onValueCommitted).toHaveBeenLastCalledWith(
      92,
      expect.objectContaining({ reason: 'scrub' }),
    );
    expect(input.value).toBe('92');
  });

  it('publishes a queued movement when the scrub area unmounts', () => {
    const flushFrame = mockAnimationFrames();
    const onValueCommitted = vi.fn();
    let setShown!: (shown: boolean) => void;
    function Harness() {
      const [shown, setShownState] = React.useState(true);
      setShown = setShownState;
      const [value, setValue] = React.useState<number | null>(42);
      return (
        <ControlField.Root
          value={value}
          onValueChange={setValue}
          onValueCommitted={onValueCommitted}
        >
          {shown ? (
            <ControlField.ScrubArea maxCommitRate={10}>
              V
            </ControlField.ScrubArea>
          ) : null}
          <ControlField.Input aria-label="Amount" />
        </ControlField.Root>
      );
    }
    const { container } = render(<Harness />);
    const scrubArea = container.querySelector(
      '[data-slot="control-field-scrub-area"]',
    ) as HTMLElement;
    scrubArea.setPointerCapture = vi.fn();
    const input = container.querySelector(
      '[data-slot="control-field-input"]',
    ) as HTMLInputElement;

    pointer(scrubArea, 'pointerdown', 0);
    pointer(document, 'pointermove', 5);
    flushFrame(16);
    expect(input.value).toBe('47');
    pointer(document, 'pointermove', 8);
    act(() => setShown(false));

    expect(onValueCommitted).toHaveBeenCalledTimes(1);
    expect(onValueCommitted).toHaveBeenLastCalledWith(
      50,
      expect.objectContaining({ reason: 'scrub' }),
    );
    expect(input.value).toBe('50');
  });
});
