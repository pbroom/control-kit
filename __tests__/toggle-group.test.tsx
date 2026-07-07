// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ToggleGroup,
  ToggleGroupItem,
  type ToggleGroupProps,
} from '../src/toggle-group.js';

const mountedRoots: Root[] = [];

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function mountToggleGroup(props: Partial<ToggleGroupProps> = {}) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push(root);

  act(() => {
    root.render(
      <ToggleGroup {...(props as ToggleGroupProps)}>
        <ToggleGroupItem value="a">A</ToggleGroupItem>
        <ToggleGroupItem value="b">B</ToggleGroupItem>
      </ToggleGroup>,
    );
  });

  return container;
}

function getItems(container: HTMLElement) {
  return container.querySelectorAll<HTMLElement>(
    '[data-slot="toggle-group-item"]',
  );
}

afterEach(() => {
  for (const root of mountedRoots.splice(0)) {
    act(() => root.unmount());
  }
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('ToggleGroup', () => {
  it('presses the default item in single mode', () => {
    const container = mountToggleGroup({ defaultValue: 'a' });
    const items = getItems(container);

    expect(items[0].getAttribute('aria-pressed')).toBe('true');
    expect(items[1].getAttribute('aria-pressed')).toBe('false');
  });

  it('reports single selections as scalar values', () => {
    const onValueChange = vi.fn();
    const container = mountToggleGroup({ defaultValue: 'a', onValueChange });
    const items = getItems(container);

    act(() => {
      items[1].click();
    });

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0][0]).toBe('b');
  });

  it('reports deselection as undefined in single mode', () => {
    const onValueChange = vi.fn();
    const container = mountToggleGroup({ defaultValue: 'a', onValueChange });
    const items = getItems(container);

    act(() => {
      items[0].click();
    });

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0][0]).toBeUndefined();
  });

  it('accepts scalar controlled values in single mode', () => {
    const container = mountToggleGroup({ value: 'b' });
    const items = getItems(container);

    expect(items[0].getAttribute('aria-pressed')).toBe('false');
    expect(items[1].getAttribute('aria-pressed')).toBe('true');
  });

  it('reports array values in multiple mode', () => {
    const onValueChange = vi.fn();
    const container = mountToggleGroup({
      type: 'multiple',
      defaultValue: ['a'],
      onValueChange,
    });
    const items = getItems(container);

    act(() => {
      items[1].click();
    });

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0][0]).toEqual(['a', 'b']);
  });
});
