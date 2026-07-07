// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Checkbox } from '../src/checkbox.js';

const mountedRoots: Root[] = [];

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// Base UI re-dispatches clicks as PointerEvents constructed from the
// element's owner window, which jsdom does not implement.
if (typeof window.PointerEvent === 'undefined') {
  class TestPointerEvent extends MouseEvent {
    pointerId: number;
    pointerType: string;

    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
      this.pointerType = init.pointerType ?? 'mouse';
    }
  }

  Object.defineProperty(window, 'PointerEvent', {
    value: TestPointerEvent,
    configurable: true,
  });
}

function mountCheckbox(props: Partial<Parameters<typeof Checkbox>[0]> = {}) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push(root);

  act(() => {
    root.render(
      <Checkbox checked={false} onCheckedChange={() => {}} {...props}>
        {props.children ?? 'Enable option'}
      </Checkbox>,
    );
  });

  return container;
}

afterEach(() => {
  for (const root of mountedRoots.splice(0)) {
    act(() => root.unmount());
  }
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('Checkbox', () => {
  it('renders an unchecked checkbox with its label', () => {
    const container = mountCheckbox();
    const checkbox = container.querySelector('[data-slot="checkbox"]');
    const label = container.querySelector('[data-slot="checkbox-label"]');

    expect(checkbox).not.toBeNull();
    expect(checkbox?.getAttribute('aria-checked')).toBe('false');
    expect(checkbox?.hasAttribute('data-unchecked')).toBe(true);
    expect(label?.textContent).toBe('Enable option');
  });

  it('reflects the controlled checked state', () => {
    const container = mountCheckbox({ checked: true });
    const checkbox = container.querySelector('[data-slot="checkbox"]');

    expect(checkbox?.getAttribute('aria-checked')).toBe('true');
    expect(checkbox?.hasAttribute('data-checked')).toBe(true);
  });

  it('keeps the indicator mounted while unchecked so it can animate in', () => {
    const container = mountCheckbox();
    const indicator = container.querySelector(
      '[data-slot="checkbox-indicator"]',
    );

    expect(indicator).not.toBeNull();
    expect(indicator?.querySelector('svg')).not.toBeNull();
  });

  it('reports toggles through onCheckedChange', () => {
    const onCheckedChange = vi.fn();
    const container = mountCheckbox({ onCheckedChange });
    const checkbox = container.querySelector(
      '[data-slot="checkbox"]',
    ) as HTMLElement;

    act(() => {
      checkbox.click();
    });

    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(onCheckedChange.mock.calls[0][0]).toBe(true);
  });

  it('ignores clicks while disabled', () => {
    const onCheckedChange = vi.fn();
    const container = mountCheckbox({ onCheckedChange, disabled: true });
    const checkbox = container.querySelector(
      '[data-slot="checkbox"]',
    ) as HTMLElement;

    expect(checkbox.hasAttribute('data-disabled')).toBe(true);

    act(() => {
      checkbox.click();
    });

    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
