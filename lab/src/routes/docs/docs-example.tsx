import { useId, useState, type ReactNode } from 'react';
import { Button } from '../../components/ui/button.js';
import { CopyCodeButton, HighlightedCode } from './highlighted-code.js';

type DocsExampleProps = {
  children: ReactNode;
  code: string;
  filename?: string;
  label: string;
};

export function DocsExample({
  children,
  code,
  filename = 'index.tsx',
  label,
}: DocsExampleProps) {
  const [expanded, setExpanded] = useState(false);
  const sourceId = useId();

  return (
    <div
      className="overflow-hidden rounded-[20px] border border-white/10 bg-[#111112]"
      data-docs-example
    >
      <figure aria-label={`${label} demo`} data-docs-example-preview>
        {children}
      </figure>
      <figure
        aria-label={`${label} demo code`}
        className="border-t border-white/10"
        data-docs-example-source
      >
        <div className="flex h-10 items-center justify-between border-b border-white/10 pl-4">
          <span className="font-mono text-xs text-white/60">{filename}</span>
          <CopyCodeButton code={code} placement="inline" />
        </div>
        <div className="relative bg-[#111112]">
          <div
            aria-hidden={!expanded}
            className={expanded ? undefined : 'max-h-[122px] overflow-hidden'}
            data-docs-example-code
            id={sourceId}
          >
            <HighlightedCode
              appearance="example"
              block
              code={code}
              showCopyButton={false}
            />
          </div>
          <div
            className={
              expanded
                ? 'flex justify-center border-t border-white/10 p-2'
                : 'absolute inset-x-0 bottom-0 flex justify-center bg-linear-to-t from-[#111112] via-[#111112]/95 to-transparent pt-12 pb-2'
            }
          >
            <Button
              aria-controls={sourceId}
              aria-expanded={expanded}
              onClick={() => setExpanded((current) => !current)}
              size="sm"
              type="button"
              variant="outline"
            >
              {expanded ? 'Hide code' : 'Show code'}
            </Button>
          </div>
        </div>
      </figure>
    </div>
  );
}
