// @vitest-environment jsdom

import { act, type ButtonHTMLAttributes, type PropsWithChildren } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HighlightedCode } from './highlighted-code.js';

vi.mock('../../components/ui/button.js', () => ({
  Button: ({
    children,
    size,
    variant,
    ...props
  }: PropsWithChildren<
    ButtonHTMLAttributes<HTMLButtonElement> & {
      size?: string;
      variant?: string;
    }
  >) => (
    <button data-size={size} data-variant={variant} {...props}>
      {children}
    </button>
  ),
}));

const mountedRoots: Root[] = [];

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function mountHighlightedCode({
  appearance,
  block,
  code,
  showCopyButton,
}: {
  appearance?: 'block' | 'example';
  block: boolean;
  code: string;
  showCopyButton?: boolean;
}) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push(root);

  act(() => {
    root.render(
      <HighlightedCode
        appearance={appearance}
        block={block}
        code={code}
        language="tsx"
        showCopyButton={showCopyButton}
      />,
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

describe('HighlightedCode', () => {
  it('copies the exact source from a block and reports success', async () => {
    const code = 'const answer = 42;\n';
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const container = mountHighlightedCode({ block: true, code });
    const button = container.querySelector('button');

    expect(button?.type).toBe('button');
    expect(button?.getAttribute('aria-label')).toBe('Copy code');
    expect(button?.getAttribute('data-variant')).toBe('ghost');
    expect(button?.getAttribute('data-size')).toBe('icon');
    expect(button?.closest('[data-docs-code-block]')).not.toBeNull();
    expect(button?.closest('code')).toBeNull();

    await act(async () => {
      button?.click();
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith(code);
    expect(button?.getAttribute('aria-label')).toBe('Copied code');
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      'Code copied to clipboard.',
    );
  });

  it('does not add a copy control to inline highlighted code', () => {
    const container = mountHighlightedCode({
      block: false,
      code: 'PlaneValue',
    });

    expect(container.querySelector('button')).toBeNull();
    expect(container.querySelector('[data-docs-code-block]')).toBeNull();
  });

  it('embeds example source without a nested card or copy control', () => {
    const container = mountHighlightedCode({
      appearance: 'example',
      block: true,
      code: 'const example = true;',
      showCopyButton: false,
    });
    const block = container.querySelector('[data-docs-code-block]');
    const pre = block?.querySelector('pre');

    expect(block?.classList.contains('my-7')).toBe(false);
    expect(pre?.className).toContain('rounded-none!');
    expect(pre?.className).toContain('border-0!');
    expect(container.querySelector('button')).toBeNull();
  });

  it('shows a visible failure state when clipboard access is denied', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('Permission denied'));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const container = mountHighlightedCode({
      block: true,
      code: 'const answer = 42;',
    });
    const button = container.querySelector('button');

    await act(async () => {
      button?.click();
      await Promise.resolve();
    });

    expect(button?.getAttribute('aria-label')).toBe('Copy failed. Try again');
    expect(button?.getAttribute('data-copy-state')).toBe('failed');
    expect(button?.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      'Could not copy code.',
    );
  });

  it('keeps feedback from the latest overlapping copy attempt', async () => {
    let rejectFirst: (reason: Error) => void = () => {};
    let resolveSecond: () => void = () => {};
    const firstWrite = new Promise<void>((_, reject) => {
      rejectFirst = reject;
    });
    const secondWrite = new Promise<void>((resolve) => {
      resolveSecond = resolve;
    });
    const writeText = vi
      .fn()
      .mockReturnValueOnce(firstWrite)
      .mockReturnValueOnce(secondWrite);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const container = mountHighlightedCode({
      block: true,
      code: 'const answer = 42;',
    });
    const button = container.querySelector('button');

    act(() => {
      button?.click();
      button?.click();
    });

    await act(async () => {
      resolveSecond();
      await secondWrite;
    });
    await act(async () => {
      rejectFirst(new Error('Older attempt failed'));
      await firstWrite.catch(() => {});
    });

    expect(button?.getAttribute('data-copy-state')).toBe('copied');
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      'Code copied to clipboard.',
    );
  });
});
