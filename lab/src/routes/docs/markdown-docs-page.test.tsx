// @vitest-environment jsdom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MarkdownDocsPage } from './markdown-docs-page.js';

vi.mock('./highlighted-code.js', () => ({
  HighlightedCode: ({ code }: { code: string }) => <pre>{code}</pre>,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.body.replaceChildren();
});

function renderDocs(format?: 'component' | 'primitive') {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);

  act(() => {
    root.render(<MarkdownDocsPage format={format} source="# Example" />);
  });

  return { container, root };
}

describe('MarkdownDocsPage', () => {
  it('marks primitive documentation as the default format', () => {
    const { container, root } = renderDocs();
    const article = container.querySelector('article');

    expect(article?.getAttribute('data-docs-format')).toBe('primitive');
    expect(article?.classList.contains('ck-primitive-docs')).toBe(true);

    act(() => root.unmount());
  });

  it('marks component documentation separately', () => {
    const { container, root } = renderDocs('component');
    const article = container.querySelector('article');

    expect(article?.getAttribute('data-docs-format')).toBe('component');
    expect(article?.classList.contains('ck-component-docs')).toBe(true);
    expect(article?.classList.contains('ck-primitive-docs')).toBe(false);

    act(() => root.unmount());
  });
});
