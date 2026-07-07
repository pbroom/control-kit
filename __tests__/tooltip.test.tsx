// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../src/tooltip.js';

const mountedRoots: Root[] = [];

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// Radix measures the tooltip arrow with ResizeObserver, which jsdom lacks.
if (typeof globalThis.ResizeObserver === 'undefined') {
  class TestResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  Object.defineProperty(globalThis, 'ResizeObserver', {
    value: TestResizeObserver,
    configurable: true,
  });
}

if (typeof globalThis.PointerEvent === 'undefined') {
  class TestPointerEvent extends MouseEvent {
    pointerId: number;
    pointerType: string;

    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
      this.pointerType = init.pointerType ?? 'mouse';
    }
  }

  Object.defineProperty(globalThis, 'PointerEvent', {
    value: TestPointerEvent,
    configurable: true,
  });
}

function mountControlledTooltip(
  contentProps: Partial<Parameters<typeof TooltipContent>[0]> = {},
) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push(root);

  act(() => {
    root.render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent {...contentProps}>Tip body</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
  });

  return container;
}

function getContent(): HTMLElement | null {
  return document.querySelector('[data-slot="tooltip-content"]');
}

afterEach(() => {
  for (const root of mountedRoots.splice(0)) {
    act(() => root.unmount());
  }
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('TooltipContent', () => {
  it('portals open tooltip content with a pointer arrow', () => {
    mountControlledTooltip();
    const content = getContent();

    expect(content).not.toBeNull();
    expect(content?.textContent).toContain('Tip body');
    expect(content?.querySelector('svg')).not.toBeNull();
  });

  it('omits the arrow when showPointer is disabled', () => {
    mountControlledTooltip({ showPointer: false });

    expect(getContent()?.querySelector('svg')).toBeNull();
  });

  it('renders the low contrast treatment with an outlined arrow', () => {
    mountControlledTooltip({ highContrast: false });
    const content = getContent();

    expect(content?.className).toContain('bg-background');
    expect(content?.querySelectorAll('svg path')).toHaveLength(2);
  });

  it('animates open by default when no handoff is in progress', () => {
    mountControlledTooltip();

    expect(getContent()?.className).toContain('animate-in');
    expect(getContent()?.className).not.toContain('animate-none');
  });
});

describe('Tooltip handoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function mountTooltipPair() {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    mountedRoots.push(root);

    act(() => {
      root.render(
        <TooltipProvider
          delayDuration={0}
          skipDelayDuration={300}
          disableHoverableContent
        >
          <Tooltip>
            <TooltipTrigger data-testid="trigger-a">A</TooltipTrigger>
            <TooltipContent>Tip A</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger data-testid="trigger-b">B</TooltipTrigger>
            <TooltipContent>Tip B</TooltipContent>
          </Tooltip>
        </TooltipProvider>,
      );
    });

    return {
      triggerA: container.querySelector(
        '[data-testid="trigger-a"]',
      ) as HTMLElement,
      triggerB: container.querySelector(
        '[data-testid="trigger-b"]',
      ) as HTMLElement,
    };
  }

  // React synthesizes onPointerEnter/Leave from pointerover/pointerout, so
  // native enter/leave events would bypass the trigger handlers. Timers only
  // advance far enough for the zero-delay open to fire while the provider's
  // skip-delay handoff window (300ms) stays live.
  function hoverTrigger(trigger: HTMLElement) {
    act(() => {
      trigger.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
      trigger.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
      vi.advanceTimersByTime(10);
    });
  }

  function leaveTrigger(trigger: HTMLElement) {
    act(() => {
      trigger.dispatchEvent(new PointerEvent('pointerout', { bubbles: true }));
      vi.advanceTimersByTime(10);
    });
  }

  it('suppresses the open animation when moving between adjacent tooltips', () => {
    const { triggerA, triggerB } = mountTooltipPair();

    hoverTrigger(triggerA);
    expect(document.body.textContent).toContain('Tip A');
    expect(getContent()?.className).toContain('animate-in');

    leaveTrigger(triggerA);
    hoverTrigger(triggerB);

    expect(document.body.textContent).toContain('Tip B');
    expect(getContent()?.className).toContain('animate-none');
  });
});
