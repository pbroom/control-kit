import { useRef, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DocsOnThisPage } from './docs-on-this-page.js';
import { HighlightedCode } from './highlighted-code.js';

const DOCS_SLOT_PATTERN = /<!--\s*([a-z]+:[a-z0-9-]+)\s*-->/g;

type MarkdownDocsPageProps = {
  format?: 'component' | 'primitive';
  slots?: Readonly<Record<string, ReactNode>>;
  source: string;
};

const MARKDOWN_COMPONENTS: Components = {
  code: ({ children, className, ...props }) => {
    const language = /language-([a-z0-9-]+)/.exec(className ?? '')?.[1];

    if (language) {
      return (
        <HighlightedCode
          block
          code={String(children).replace(/\n$/, '')}
          language={
            language === 'ts'
              ? 'typescript'
              : language === 'sh' || language === 'shell'
                ? 'bash'
                : language
          }
        />
      );
    }

    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => children,
  table: ({ children, ...props }) => (
    <div className="docs-markdown-table typeset-scroll mt-2 mb-8 w-full overflow-x-auto overscroll-x-contain">
      <table className="my-0! min-w-[640px]" {...props}>
        {children}
      </table>
    </div>
  ),
};

export function MarkdownDocsPage({
  format = 'primitive',
  slots = {},
  source,
}: MarkdownDocsPageProps) {
  const sections = source.split(DOCS_SLOT_PATTERN);
  const articleRef = useRef<HTMLElement>(null);

  return (
    <div className="docs-page-layout">
      <article
        className={`${format === 'component' ? 'ck-component-docs' : 'ck-primitive-docs'} typeset typeset-docs w-full max-w-[72ch]`}
        data-docs-format={format}
        data-docs-markdown
        ref={articleRef}
      >
        {sections.map((section, index) => {
          if (index % 2 === 1) {
            const slot = slots[section];
            if (!slot) {
              throw new Error(
                `No documentation slot registered for "${section}".`,
              );
            }

            if (!section.startsWith('demo:')) {
              return <div key={`slot-${section}`}>{slot}</div>;
            }

            return (
              <div
                className="not-typeset my-10"
                data-docs-demo={section.slice('demo:'.length)}
                key={`demo-${section}`}
              >
                {slot}
              </div>
            );
          }

          if (!section.trim()) return null;

          return (
            <ReactMarkdown
              components={MARKDOWN_COMPONENTS}
              key={`markdown-${index}`}
              remarkPlugins={[remarkGfm]}
            >
              {section}
            </ReactMarkdown>
          );
        })}
      </article>
      <DocsOnThisPage articleRef={articleRef} pageKey={source} />
    </div>
  );
}
