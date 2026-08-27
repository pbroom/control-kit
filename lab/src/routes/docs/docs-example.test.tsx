// @vitest-environment jsdom

import { act, type ButtonHTMLAttributes, type PropsWithChildren } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DocsExample } from './docs-example.js';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

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

vi.mock('./highlighted-code.js', () => ({
  CopyCodeButton: ({ code }: { code: string }) => (
    <button aria-label="Copy code" data-code={code} type="button" />
  ),
  HighlightedCode: ({ code }: { code: string }) => <pre>{code}</pre>,
}));

afterEach(() => {
  document.body.replaceChildren();
});

describe('DocsExample', () => {
  it('reveals and hides the complete example source', () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <DocsExample code="const example = true;" label="Plane">
          <div>Rendered Plane</div>
        </DocsExample>,
      );
    });

    const source = container.querySelector('[data-docs-example-code]');
    const toggle = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Show code',
    );

    expect(container.textContent).toContain('Rendered Plane');
    expect(container.textContent).toContain('index.tsx');
    expect(
      container.querySelector('figure[aria-label="Plane demo"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('figure[aria-label="Plane demo code"]'),
    ).not.toBeNull();
    expect(source?.getAttribute('aria-hidden')).toBe('true');
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');

    act(() => toggle?.click());

    expect(source?.getAttribute('aria-hidden')).toBe('false');
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(toggle?.textContent).toBe('Hide code');

    act(() => toggle?.click());

    expect(source?.getAttribute('aria-hidden')).toBe('true');
    expect(toggle?.textContent).toBe('Show code');

    act(() => root.unmount());
  });
});
