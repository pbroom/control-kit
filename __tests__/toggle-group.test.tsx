// @vitest-environment jsdom

import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ToggleGroup,
  ToggleGroupItem,
  type ToggleGroupProps,
} from '../src/toggle-group.js';
import './helpers/dom-polyfills.js';

const mountedRoots: Root[] = [];

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function mountToggleGroup(props: ToggleGroupProps = {}) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push(root);

  act(() => {
    root.render(
      <ToggleGroup {...props}>
        <ToggleGroupItem value="a">A</ToggleGroupItem>
        <ToggleGroupItem value="b">B</ToggleGroupItem>
      </ToggleGroup>,
    );
  });

  return container;
}

function mount(element: ReactNode) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push(root);
  const render = (next: ReactNode) => act(() => root.render(next));
  render(element);
  return { container, render };
}

// Base UI moves composite focus in a microtask, so flush it inside act.
async function keyDown(target: Element, key: string) {
  await act(async () => {
    target.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    );
  });
}

function pressedStates(container: HTMLElement) {
  return Array.from(getItems(container), (item) =>
    item.getAttribute('aria-pressed'),
  );
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

  it('exposes group semantics, data-slot attributes, and merged class names', () => {
    const container = mountToggleGroup({
      'aria-label': 'Alignment',
      className: 'custom-group',
    });
    const group = container.querySelector<HTMLElement>(
      '[data-slot="toggle-group"]',
    )!;

    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-label')).toBe('Alignment');
    expect(group.className).toContain('custom-group');
    expect(group.className).toContain('rounded-lg');
    expect(getItems(container)).toHaveLength(2);
    for (const item of getItems(container)) {
      expect(item.tagName).toBe('BUTTON');
    }
  });

  it('passes Base UI event details as the second callback argument', () => {
    const onValueChange = vi.fn();
    const container = mountToggleGroup({ onValueChange });

    act(() => getItems(container)[0].click());

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(
      'a',
      expect.objectContaining({ event: expect.any(Event) }),
    );
  });

  it('switches pressed items in uncontrolled single mode', () => {
    const container = mountToggleGroup({ defaultValue: 'a' });

    act(() => getItems(container)[1].click());

    expect(pressedStates(container)).toEqual(['false', 'true']);
    expect(getItems(container)[1].hasAttribute('data-pressed')).toBe(true);
    expect(getItems(container)[0].hasAttribute('data-pressed')).toBe(false);
  });

  it('keeps controlled single values until the owner updates them', () => {
    const onValueChange = vi.fn();
    const items = (
      <>
        <ToggleGroupItem value="a">A</ToggleGroupItem>
        <ToggleGroupItem value="b">B</ToggleGroupItem>
      </>
    );
    const { container, render } = mount(
      <ToggleGroup value="a" onValueChange={onValueChange}>
        {items}
      </ToggleGroup>,
    );

    act(() => getItems(container)[1].click());
    expect(onValueChange).toHaveBeenLastCalledWith('b', expect.anything());
    expect(pressedStates(container)).toEqual(['true', 'false']);

    render(
      <ToggleGroup value="b" onValueChange={onValueChange}>
        {items}
      </ToggleGroup>,
    );
    expect(pressedStates(container)).toEqual(['false', 'true']);
  });

  it('removes items from the array when deselected in multiple mode', () => {
    const onValueChange = vi.fn();
    const container = mountToggleGroup({
      type: 'multiple',
      defaultValue: ['a', 'b'],
      onValueChange,
    });

    act(() => getItems(container)[0].click());

    expect(onValueChange).toHaveBeenLastCalledWith(['b'], expect.anything());
    expect(pressedStates(container)).toEqual(['false', 'true']);

    act(() => getItems(container)[1].click());
    expect(onValueChange).toHaveBeenLastCalledWith([], expect.anything());
    expect(pressedStates(container)).toEqual(['false', 'false']);
  });

  it('reflects controlled array values in multiple mode', () => {
    const container = mountToggleGroup({
      type: 'multiple',
      value: ['a', 'b'],
    });

    expect(pressedStates(container)).toEqual(['true', 'true']);
  });

  it('disables every item when the group is disabled', () => {
    const onValueChange = vi.fn();
    const container = mountToggleGroup({
      disabled: true,
      defaultValue: 'a',
      onValueChange,
    });
    const group = container.querySelector('[data-slot="toggle-group"]')!;

    expect(group.hasAttribute('data-disabled')).toBe(true);
    for (const item of getItems(container)) {
      expect((item as HTMLButtonElement).disabled).toBe(true);
    }
    act(() => getItems(container)[1].click());
    expect(onValueChange).not.toHaveBeenCalled();
    expect(pressedStates(container)).toEqual(['true', 'false']);
  });

  it('disables individual items without affecting their siblings', () => {
    const onValueChange = vi.fn();
    const { container } = mount(
      <ToggleGroup onValueChange={onValueChange}>
        <ToggleGroupItem value="a" disabled>
          A
        </ToggleGroupItem>
        <ToggleGroupItem value="b">B</ToggleGroupItem>
      </ToggleGroup>,
    );
    const items = getItems(container);

    act(() => items[0].click());
    expect(onValueChange).not.toHaveBeenCalled();

    act(() => items[1].click());
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(
      'b',
      expect.anything(),
    );
  });

  it('moves focus between items with arrow keys and wraps by default', async () => {
    const container = mountToggleGroup();
    const items = getItems(container);

    act(() => items[0].focus());
    await keyDown(items[0], 'ArrowRight');
    expect(document.activeElement).toBe(items[1]);

    await keyDown(items[1], 'ArrowRight');
    expect(document.activeElement).toBe(items[0]);

    await keyDown(items[0], 'ArrowLeft');
    expect(document.activeElement).toBe(items[1]);
  });

  it('stops at the ends when loop is false', async () => {
    const container = mountToggleGroup({ loop: false });
    const items = getItems(container);

    act(() => items[1].focus());
    await keyDown(items[1], 'ArrowRight');
    expect(document.activeElement).toBe(items[1]);

    await keyDown(items[1], 'ArrowLeft');
    expect(document.activeElement).toBe(items[0]);
    await keyDown(items[0], 'ArrowLeft');
    expect(document.activeElement).toBe(items[0]);
  });

  it('uses vertical arrow keys in vertical orientation', async () => {
    const container = mountToggleGroup({ orientation: 'vertical' });
    const group = container.querySelector('[data-slot="toggle-group"]')!;
    const items = getItems(container);

    expect(group.getAttribute('data-orientation')).toBe('vertical');
    act(() => items[0].focus());
    await keyDown(items[0], 'ArrowDown');
    expect(document.activeElement).toBe(items[1]);
    await keyDown(items[1], 'ArrowUp');
    expect(document.activeElement).toBe(items[0]);
  });

  it('keeps a single roving tab stop that follows keyboard focus', async () => {
    const container = mountToggleGroup();
    const items = getItems(container);

    expect(Array.from(items, (item) => item.tabIndex)).toEqual([0, -1]);
    act(() => items[0].focus());
    await keyDown(items[0], 'End');
    expect(document.activeElement).toBe(items[1]);
    expect(Array.from(items, (item) => item.tabIndex)).toEqual([-1, 0]);
  });
});
