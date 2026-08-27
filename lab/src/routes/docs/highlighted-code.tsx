import { Check, Copy, X } from 'lucide-react';
import { Highlight, themes, type Language } from 'prism-react-renderer';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/button.js';

type HighlightedCodeProps = {
  block?: boolean;
  code: string;
  language?: Language;
};

type CopyState = 'idle' | 'copied' | 'failed';

function CopyCodeButton({ code }: { code: string }) {
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const copyAttempt = useRef(0);
  const resetTimeout = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      copyAttempt.current += 1;
      window.clearTimeout(resetTimeout.current);
    },
    [],
  );

  const handleCopy = async () => {
    const attempt = copyAttempt.current + 1;
    copyAttempt.current = attempt;
    window.clearTimeout(resetTimeout.current);

    try {
      await navigator.clipboard.writeText(code);
      if (attempt !== copyAttempt.current) return;
      setCopyState('copied');
    } catch {
      if (attempt !== copyAttempt.current) return;
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
      <Button
        aria-label={label}
        className="absolute top-2 right-2 z-10"
        data-copy-state={copyState}
        onClick={handleCopy}
        size="icon"
        title={label}
        type="button"
        variant="ghost"
      >
        {copyState === 'copied' ? (
          <Check aria-hidden="true" />
        ) : copyState === 'failed' ? (
          <X aria-hidden="true" />
        ) : (
          <Copy aria-hidden="true" />
        )}
      </Button>
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
