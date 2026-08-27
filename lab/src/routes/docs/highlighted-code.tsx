import { Highlight, themes, type Language } from 'prism-react-renderer';

type HighlightedCodeProps = {
  block?: boolean;
  code: string;
  language?: Language;
};

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
          <pre
            className={`${className} my-7 overflow-x-auto rounded-xl border border-white/10 bg-[#111112]! px-4 py-3 font-mono text-[13px] leading-6 shadow-none!`}
            data-language={language}
            style={{ ...style, backgroundColor: '#111112' }}
          >
            <code>{highlightedLines}</code>
          </pre>
        );
      }}
    </Highlight>
  );
}
