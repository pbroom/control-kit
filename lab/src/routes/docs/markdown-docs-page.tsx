import type { ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { HighlightedCode } from './highlighted-code.js';

const DOCS_SLOT_PATTERN = /<!--\s*([a-z]+:[a-z0-9-]+)\s*-->/g;

type MarkdownDocsPageProps = {
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
          language={language === 'ts' ? 'typescript' : 'tsx'}
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
    <div className="my-8 w-full overflow-x-auto overscroll-x-contain">
      <table className="my-0 min-w-[640px]" {...props}>
        {children}
      </table>
    </div>
  ),
};

export function MarkdownDocsPage({
  slots = {},
  source,
}: MarkdownDocsPageProps) {
  const sections = source.split(DOCS_SLOT_PATTERN);

  return (
    <article
      className="ck-primitive-docs prose prose-invert w-full max-w-[760px] prose-headings:font-[var(--font-brand)] prose-headings:tracking-[-0.02em] prose-h1:mb-3 prose-h1:text-[42px] prose-h1:leading-[1.05] prose-h2:mt-16 prose-h2:mb-5 prose-h2:text-2xl prose-h3:mt-10 prose-h3:text-lg prose-p:text-white/62 prose-p:leading-7 prose-a:text-white prose-a:underline-offset-4 prose-strong:text-white/90 prose-code:rounded prose-code:bg-white/[0.07] prose-code:px-1 prose-code:py-0.5 prose-code:text-white/82 prose-code:before:content-none prose-code:after:content-none prose-li:text-white/62 prose-th:text-white/85 prose-td:text-white/62 prose-th:border-white/10 prose-td:border-white/10"
      data-docs-markdown
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
              className="not-prose my-10 overflow-hidden rounded-[20px] border border-white/10 bg-[#111112]"
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
  );
}
