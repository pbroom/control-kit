// @vitest-environment jsdom

import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type TabsListProps,
  type TabsProps,
} from '../src/tabs.js';
import './helpers/dom-polyfills.js';

const mountedRoots: Root[] = [];

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function mountTabs(defaultValue = 'one') {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push(root);

  act(() => {
    root.render(
      <Tabs defaultValue={defaultValue}>
        <TabsList>
          <TabsTrigger value="one">First</TabsTrigger>
          <TabsTrigger value="two">Second</TabsTrigger>
        </TabsList>
        <TabsContent value="one">First panel</TabsContent>
        <TabsContent value="two">Second panel</TabsContent>
      </Tabs>,
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

function threeTabs(
  rootProps: Partial<TabsProps> = {},
  listProps: Partial<TabsListProps> = {},
) {
  return (
    <Tabs defaultValue="one" {...rootProps}>
      <TabsList aria-label="Sections" {...listProps}>
        <TabsTrigger value="one">First</TabsTrigger>
        <TabsTrigger value="two">Second</TabsTrigger>
        <TabsTrigger value="three">Third</TabsTrigger>
      </TabsList>
      <TabsContent value="one">First panel</TabsContent>
      <TabsContent value="two">Second panel</TabsContent>
      <TabsContent value="three">Third panel</TabsContent>
    </Tabs>
  );
}

function getTriggers(container: HTMLElement) {
  return container.querySelectorAll<HTMLElement>('[data-slot="tabs-trigger"]');
}

function activeTrigger(container: HTMLElement) {
  return Array.from(getTriggers(container)).find((trigger) =>
    trigger.hasAttribute('data-active'),
  )?.textContent;
}

// Base UI moves composite focus in a microtask, so flush it inside act.
async function keyDown(target: Element, key: string) {
  await act(async () => {
    target.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    );
  });
}

afterEach(() => {
  for (const root of mountedRoots.splice(0)) {
    act(() => root.unmount());
  }
  document.body.replaceChildren();
});

describe('Tabs', () => {
  it('shows only the default tab content initially', () => {
    const container = mountTabs();

    expect(container.textContent).toContain('First panel');
    expect(container.textContent).not.toContain('Second panel');
  });

  it('marks the active trigger with tab semantics', () => {
    const container = mountTabs();
    const triggers = container.querySelectorAll('[data-slot="tabs-trigger"]');

    expect(triggers).toHaveLength(2);
    expect(triggers[0].getAttribute('aria-selected')).toBe('true');
    expect(triggers[0].hasAttribute('data-active')).toBe(true);
    expect(triggers[1].getAttribute('aria-selected')).toBe('false');
  });

  it('switches panels when another trigger is activated', () => {
    const container = mountTabs();
    const triggers = container.querySelectorAll<HTMLElement>(
      '[data-slot="tabs-trigger"]',
    );

    act(() => {
      triggers[1].focus();
      triggers[1].click();
    });

    expect(container.textContent).toContain('Second panel');
    expect(container.textContent).not.toContain('First panel');
    expect(triggers[1].hasAttribute('data-active')).toBe(true);
  });

  it('preserves automatic activation as the Control Kit default', () => {
    const container = mountTabs();
    const triggers = container.querySelectorAll<HTMLElement>(
      '[data-slot="tabs-trigger"]',
    );

    act(() => triggers[1].focus());

    expect(triggers[1].hasAttribute('data-active')).toBe(true);
    expect(container.textContent).toContain('Second panel');
  });

  it('composes triggers and panels with the Base UI render prop', () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    mountedRoots.push(root);

    act(() => {
      root.render(
        <Tabs defaultValue="one">
          <TabsList>
            <TabsTrigger
              nativeButton={false}
              render={<a href="/one" />}
              value="one"
            >
              First
            </TabsTrigger>
          </TabsList>
          <TabsContent render={<section />} value="one">
            First panel
          </TabsContent>
        </Tabs>,
      );
    });

    expect(container.querySelector('a[role="tab"]')).not.toBeNull();
    expect(container.querySelector('section[role="tabpanel"]')).not.toBeNull();
  });

  it('renders data-slot attributes and merges class names on every part', () => {
    const { container } = mount(
      <Tabs defaultValue="one" className="root-x">
        <TabsList className="list-x">
          <TabsTrigger value="one" className="trigger-x">
            First
          </TabsTrigger>
        </TabsList>
        <TabsContent value="one" className="panel-x">
          First panel
        </TabsContent>
      </Tabs>,
    );

    for (const [slotName, extra, base] of [
      ['tabs', 'root-x', 'flex-col'],
      ['tabs-list', 'list-x', 'inline-flex'],
      ['tabs-trigger', 'trigger-x', 'rounded-[5px]'],
      ['tabs-content', 'panel-x', 'rounded-[7px]'],
    ]) {
      const element = container.querySelector(`[data-slot="${slotName}"]`);
      expect(element, slotName).not.toBeNull();
      expect(element!.className).toContain(extra);
      expect(element!.className).toContain(base);
    }
  });

  it('links tabs and panels with ARIA roles and ids', () => {
    const { container } = mount(threeTabs());
    const list = container.querySelector('[data-slot="tabs-list"]')!;
    const [first] = getTriggers(container);
    const panel = container.querySelector('[role="tabpanel"]')!;

    expect(list.getAttribute('role')).toBe('tablist');
    expect(list.getAttribute('aria-label')).toBe('Sections');
    expect(first.getAttribute('role')).toBe('tab');
    expect(first.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.getAttribute('aria-labelledby')).toBe(first.id);
  });

  it('moves focus and activates tabs with arrow, Home, and End keys', async () => {
    const { container } = mount(threeTabs());
    const triggers = getTriggers(container);

    act(() => triggers[0].focus());
    await keyDown(triggers[0], 'ArrowRight');
    expect(document.activeElement).toBe(triggers[1]);
    expect(activeTrigger(container)).toBe('Second');
    expect(container.textContent).toContain('Second panel');

    await keyDown(triggers[1], 'End');
    expect(document.activeElement).toBe(triggers[2]);
    expect(activeTrigger(container)).toBe('Third');

    await keyDown(triggers[2], 'Home');
    expect(document.activeElement).toBe(triggers[0]);
    expect(activeTrigger(container)).toBe('First');
  });

  it('wraps keyboard focus at either end of the list', async () => {
    const { container } = mount(threeTabs());
    const triggers = getTriggers(container);

    act(() => triggers[0].focus());
    await keyDown(triggers[0], 'ArrowLeft');
    expect(document.activeElement).toBe(triggers[2]);

    await keyDown(triggers[2], 'ArrowRight');
    expect(document.activeElement).toBe(triggers[0]);
  });

  it('only moves focus when activateOnFocus is false', async () => {
    const { container } = mount(threeTabs({}, { activateOnFocus: false }));
    const triggers = getTriggers(container);

    act(() => triggers[0].focus());
    await keyDown(triggers[0], 'ArrowRight');

    expect(document.activeElement).toBe(triggers[1]);
    expect(activeTrigger(container)).toBe('First');
    expect(container.textContent).toContain('First panel');

    act(() => triggers[1].click());
    expect(activeTrigger(container)).toBe('Second');
  });

  it('uses vertical arrow keys in vertical orientation', async () => {
    const { container } = mount(threeTabs({ orientation: 'vertical' }));
    const list = container.querySelector('[data-slot="tabs-list"]')!;
    const triggers = getTriggers(container);

    expect(list.getAttribute('aria-orientation')).toBe('vertical');
    act(() => triggers[0].focus());
    await keyDown(triggers[0], 'ArrowRight');
    expect(document.activeElement).toBe(triggers[0]);

    await keyDown(triggers[0], 'ArrowDown');
    expect(document.activeElement).toBe(triggers[1]);
    expect(activeTrigger(container)).toBe('Second');
  });

  it('reports controlled changes and waits for the owner to update', () => {
    const onValueChange = vi.fn();
    const { container, render } = mount(
      threeTabs({ defaultValue: undefined, value: 'one', onValueChange }),
    );
    const triggers = getTriggers(container);

    act(() => triggers[2].click());
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(
      'three',
      expect.objectContaining({ event: expect.any(Event) }),
    );
    expect(activeTrigger(container)).toBe('First');

    render(
      threeTabs({ defaultValue: undefined, value: 'three', onValueChange }),
    );
    expect(activeTrigger(container)).toBe('Third');
    expect(container.textContent).toContain('Third panel');
  });

  it('keeps disabled triggers focusable but never activates them', async () => {
    const onValueChange = vi.fn();
    const { container } = mount(
      <Tabs defaultValue="one" onValueChange={onValueChange}>
        <TabsList>
          <TabsTrigger value="one">First</TabsTrigger>
          <TabsTrigger value="two" disabled>
            Second
          </TabsTrigger>
          <TabsTrigger value="three">Third</TabsTrigger>
        </TabsList>
        <TabsContent value="one">First panel</TabsContent>
        <TabsContent value="two">Second panel</TabsContent>
        <TabsContent value="three">Third panel</TabsContent>
      </Tabs>,
    );
    const triggers = getTriggers(container);

    expect(triggers[1].hasAttribute('data-disabled')).toBe(true);
    act(() => triggers[1].click());
    expect(onValueChange).not.toHaveBeenCalled();
    expect(activeTrigger(container)).toBe('First');

    // Base UI keeps disabled tabs focusable (per the ARIA tabs pattern) but
    // never activates them.
    act(() => triggers[0].focus());
    await keyDown(triggers[0], 'ArrowRight');
    expect(document.activeElement).toBe(triggers[1]);
    expect(activeTrigger(container)).toBe('First');
    expect(onValueChange).not.toHaveBeenCalled();

    await keyDown(triggers[1], 'ArrowRight');
    expect(document.activeElement).toBe(triggers[2]);
    expect(activeTrigger(container)).toBe('Third');
  });

  it('keeps inactive panels hidden in the DOM with keepMounted', () => {
    const { container } = mount(
      <Tabs defaultValue="one">
        <TabsList>
          <TabsTrigger value="one">First</TabsTrigger>
          <TabsTrigger value="two">Second</TabsTrigger>
        </TabsList>
        <TabsContent value="one">First panel</TabsContent>
        <TabsContent value="two" keepMounted>
          Second panel
        </TabsContent>
      </Tabs>,
    );
    const panels = container.querySelectorAll<HTMLElement>(
      '[data-slot="tabs-content"]',
    );

    expect(panels).toHaveLength(2);
    expect(panels[0].hidden).toBe(false);
    expect(panels[1].hidden).toBe(true);
  });
});
