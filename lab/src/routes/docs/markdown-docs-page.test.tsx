// @vitest-environment jsdom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MarkdownDocsPage } from './markdown-docs-page.js';

vi.mock('./highlighted-code.js', () => ({
  HighlightedCode: ({
    code,
    language,
  }: {
    code: string;
    language?: string;
  }) => <pre data-language={language}>{code}</pre>,
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

  it('preserves the language of manual-install code blocks', () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <MarkdownDocsPage
          format="component"
          source={
            '```bash\npnpm add example\n```\n\n```css\n@source "src";\n```'
          }
        />,
      );
    });

    expect(
      Array.from(container.querySelectorAll('pre')).map((block) =>
        block.getAttribute('data-language'),
      ),
    ).toEqual(['bash', 'css']);

    act(() => root.unmount());
  });

  it('builds an on-page outline from rendered documentation headings', () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <MarkdownDocsPage
          slots={{
            'demo:gallery': (
              <section>
                <h2 id="gallery">Gallery</h2>
                <h3>Position example</h3>
                <div data-docs-example>
                  <h2>Preview heading</h2>
                </div>
              </section>
            ),
          }}
          source={
            '# Example\n\n## Installation\n\n### Manual\n\n## Installation\n\n<!-- demo:gallery -->'
          }
        />,
      );
    });

    const article = container.querySelector('article');
    const outline = container.querySelector('[data-docs-on-this-page]');
    const links = Array.from(outline?.querySelectorAll('a') ?? []);

    expect(article?.querySelector('h1')?.id).toBe('');
    expect(
      links.map((link) => ({
        depth: link.getAttribute('data-depth'),
        href: link.getAttribute('href'),
        label: link.textContent,
      })),
    ).toEqual([
      { depth: '2', href: '#installation', label: 'Installation' },
      { depth: '3', href: '#manual', label: 'Manual' },
      { depth: '2', href: '#installation-2', label: 'Installation' },
      { depth: '2', href: '#gallery', label: 'Gallery' },
      { depth: '3', href: '#position-example', label: 'Position example' },
    ]);
    expect(
      article?.querySelector('[data-docs-example] h2')?.getAttribute('id'),
    ).toBeNull();

    act(() => root.unmount());
  });
});
