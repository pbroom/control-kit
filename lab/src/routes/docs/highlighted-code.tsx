import { Check, Copy, X } from 'lucide-react';
import { Highlight, themes, type Language } from 'prism-react-renderer';
import { useEffect, useRef, useState } from 'react';

type HighlightedCodeProps = {
  block?: boolean;
  code: string;
  language?: Language;
};

type CopyState = 'idle' | 'copied' | 'failed';

function CopyCodeButton({ code }: { code: string }) {
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const resetTimeout = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(resetTimeout.current);
    },
    [],
  );

  const handleCopy = async () => {
    window.clearTimeout(resetTimeout.current);

    try {
      await navigator.clipboard.writeText(code);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }

    resetTimeout.current = window.setTimeout(() => {
      setCopyState('idle');
    }, 2_000);
  };

  const label =
    copyState === 'copied'
      ? 'Copied code'
      : copyState === 'failed'
        ? 'Copy failed. Try again'
        : 'Copy code';

  return (
    <>
      <button
        aria-label={label}
        className="absolute top-2 right-2 z-10 inline-flex size-8 items-center justify-center rounded-md border border-white/10 bg-[#1b1b1c] text-white/60 transition-colors hover:bg-[#242426] hover:text-white/90 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none data-[copy-state=failed]:border-red-400/30 data-[copy-state=failed]:bg-red-400/10 data-[copy-state=failed]:text-red-300"
        data-copy-state={copyState}
        onClick={handleCopy}
        title={label}
        type="button"
      >
        {copyState === 'copied' ? (
          <Check aria-hidden="true" className="size-4" />
        ) : copyState === 'failed' ? (
          <X aria-hidden="true" className="size-4" />
        ) : (
          <Copy aria-hidden="true" className="size-4" />
        )}
      </button>
      <span aria-live="polite" className="sr-only" role="status">
        {copyState === 'copied'
          ? 'Code copied to clipboard.'
          : copyState === 'failed'
            ? 'Could not copy code.'
            : ''}
      </span>
    </>
  );
}

export function HighlightedCode({
  block = false,
  code,
  language = 'tsx',
}: HighlightedCodeProps) {
  return (
    <Highlight code={code} language={language} theme={themes.vsDark}>
      {({ className, getLineProps, getTokenProps, style, tokens }) => {
        const highlightedLines = tokens.map((line, lineIndex) => (
          <span {...getLineProps({ line })} key={lineIndex}>
            {line.map((token, tokenIndex) => (
              <span {...getTokenProps({ token })} key={tokenIndex} />
            ))}
            {lineIndex < tokens.length - 1 ? '\n' : null}
          </span>
        ));

        if (!block) {
          return (
            <code
              className={`${className} rounded-none! bg-transparent! p-0! font-mono shadow-none!`}
              style={{ ...style, backgroundColor: 'transparent' }}
            >
              {highlightedLines}
            </code>
          );
        }

        return (
          <div className="not-prose relative my-7" data-docs-code-block>
            <pre
              className={`${className} my-0! overflow-x-auto rounded-xl border border-white/10 bg-[#111112]! py-3! pr-12! pl-4! font-mono text-[13px] leading-6 shadow-none!`}
              data-language={language}
              style={{ ...style, backgroundColor: '#111112' }}
            >
              <code>{highlightedLines}</code>
            </pre>
            <CopyCodeButton code={code} />
          </div>
        );
      }}
    </Highlight>
  );
}
