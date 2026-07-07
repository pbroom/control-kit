// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../src/tabs.js';

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
    expect(triggers[0].getAttribute('data-state')).toBe('active');
    expect(triggers[1].getAttribute('aria-selected')).toBe('false');
  });

  it('switches panels when another trigger is activated', () => {
    const container = mountTabs();
    const triggers = container.querySelectorAll<HTMLElement>(
      '[data-slot="tabs-trigger"]',
    );

    act(() => {
      triggers[1].dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, button: 0 }),
      );
      triggers[1].focus();
      triggers[1].click();
    });

    expect(container.textContent).toContain('Second panel');
    expect(container.textContent).not.toContain('First panel');
    expect(triggers[1].getAttribute('data-state')).toBe('active');
  });
});
