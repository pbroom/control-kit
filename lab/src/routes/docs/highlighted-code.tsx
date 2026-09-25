import { Check, Copy, X } from 'lucide-react';
import { Highlight, themes, type Language } from 'prism-react-renderer';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/button.js';

type HighlightedCodeProps = {
  appearance?: 'block' | 'example';
  block?: boolean;
  code: string;
  language?: Language;
  /**
   * Render only the first `previewLines` lines. Collapsed example sources clip
   * to a few lines, so rendering every token span of every example would add
   * tens of thousands of hidden DOM nodes to pages such as Plane Examples.
   */
  previewLines?: number;
  showCopyButton?: boolean;
};

type CopyState = 'idle' | 'copied' | 'failed';

export function CopyCodeButton({
  code,
  placement = 'overlay',
}: {
  code: string;
  placement?: 'inline' | 'overlay';
}) {
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
        className={
          placement === 'overlay' ? 'absolute top-2 right-2 z-10' : undefined
        }
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

/** Returns the first `lineCount` lines of `code`, or all of it when unset. */
export function previewSource(code: string, lineCount?: number) {
  if (lineCount === undefined) return code;
  if (lineCount <= 0) return '';
  let end = -1;
  for (let line = 0; line < lineCount; line += 1) {
    end = code.indexOf('\n', end + 1);
    if (end === -1) return code;
  }
  return code.slice(0, end);
}

export function HighlightedCode({
  appearance = 'block',
  block = false,
  code,
  language = 'tsx',
  previewLines,
  showCopyButton = true,
}: HighlightedCodeProps) {
  // Highlight only the preview so collapsed sources skip tokenizing lines they
  // never show. The copy control below still receives the full `code`.
  const highlightedSource = previewSource(code, previewLines);

  return (
    <Highlight
      code={highlightedSource}
      language={language}
      theme={themes.vsDark}
    >
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

        const isExample = appearance === 'example';

        return (
          <div
            className={
              isExample ? 'not-typeset relative' : 'not-typeset relative my-7'
            }
            data-docs-code-block
          >
            <pre
              className={`${className} my-0! overflow-x-auto bg-[#111112]! py-3! pl-4! font-mono text-[13px] leading-6 shadow-none! ${isExample ? 'min-w-full rounded-none! border-0! pr-4!' : 'rounded-xl border border-white/10 pr-12!'}`}
              data-language={language}
              style={{ ...style, backgroundColor: '#111112' }}
            >
              <code>{highlightedLines}</code>
            </pre>
            {showCopyButton ? <CopyCodeButton code={code} /> : null}
          </div>
        );
      }}
    </Highlight>
  );
}
