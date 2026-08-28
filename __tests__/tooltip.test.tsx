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
import './helpers/dom-polyfills.js';

const mountedRoots: Root[] = [];

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

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
  document.documentElement.removeAttribute('dir');
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

  it.each([
    ['top', '-bottom-1.5'],
    ['bottom', '-top-1.5 rotate-180'],
    ['left', '-right-[9px] -rotate-90'],
    ['right', '-left-[9px] rotate-90'],
  ] as const)('positions the pointer for the %s side', (side, classNames) => {
    mountControlledTooltip({
      collisionAvoidance: { align: 'none', side: 'none' },
      side,
    });
    const pointer = getContent()?.querySelector('svg');

    expect(pointer?.getAttribute('data-side')).toBe(side);
    for (const className of classNames.split(' ')) {
      expect(pointer?.getAttribute('class')).toContain(className);
    }
  });

  it.each([
    ['ltr', 'inline-start', '-end-[9px]', 'ltr:-rotate-90'],
    ['rtl', 'inline-start', '-end-[9px]', 'rtl:rotate-90'],
    ['ltr', 'inline-end', '-start-[9px]', 'ltr:rotate-90'],
    ['rtl', 'inline-end', '-start-[9px]', 'rtl:-rotate-90'],
  ] as const)(
    'positions the %s %s pointer on its logical side',
    (direction, side, offsetClassName, rotationClassName) => {
      document.documentElement.dir = direction;
      mountControlledTooltip({
        collisionAvoidance: { align: 'none', side: 'none' },
        side,
      });
      const pointer = getContent()?.querySelector('svg');

      expect(pointer?.getAttribute('data-side')).toBe(side);
      expect(pointer?.getAttribute('class')).toContain(offsetClassName);
      expect(pointer?.getAttribute('class')).toContain(rotationClassName);
    },
  );

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

  it('uses a normal transition when no handoff is in progress', () => {
    mountControlledTooltip();
    const content = getContent();

    expect(content?.className).toContain('transition-[transform,opacity]');
    expect(content?.className).toContain('data-instant:transition-none');
    expect(content?.hasAttribute('data-instant')).toBe(false);
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
        <TooltipProvider delay={0} timeout={300}>
          <Tooltip disableHoverablePopup>
            <TooltipTrigger data-testid="trigger-a">A</TooltipTrigger>
            <TooltipContent>Tip A</TooltipContent>
          </Tooltip>
          <Tooltip disableHoverablePopup>
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

  // Base UI records the pointer type through React's pointer-enter handler,
  // then opens and closes hover tooltips from native mouseenter/mouseleave
  // listeners. Exercise both halves of that contract here.
  function hoverTrigger(trigger: HTMLElement) {
    act(() => {
      trigger.dispatchEvent(
        new PointerEvent('pointerover', {
          bubbles: true,
          pointerType: 'mouse',
        }),
      );
      trigger.dispatchEvent(new MouseEvent('mouseenter'));
      vi.advanceTimersByTime(10);
    });
  }

  function leaveTrigger(trigger: HTMLElement) {
    act(() => {
      trigger.dispatchEvent(
        new PointerEvent('pointerout', {
          bubbles: true,
          pointerType: 'mouse',
        }),
      );
      trigger.dispatchEvent(new MouseEvent('mouseleave'));
      vi.advanceTimersByTime(10);
    });
  }

  it('suppresses the open animation when moving between adjacent tooltips', () => {
    const { triggerA, triggerB } = mountTooltipPair();

    hoverTrigger(triggerA);
    expect(document.body.textContent).toContain('Tip A');
    expect(getContent()?.hasAttribute('data-instant')).toBe(false);

    leaveTrigger(triggerA);
    hoverTrigger(triggerB);

    expect(document.body.textContent).toContain('Tip B');
    expect(getContent()?.getAttribute('data-instant')).toBe('delay');
  });
});
