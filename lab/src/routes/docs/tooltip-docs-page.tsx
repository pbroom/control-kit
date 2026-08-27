import { DocsExample } from './docs-example.js';
import { TooltipExample } from './examples/tooltip-basic-example.js';
import tooltipExampleCode from './examples/tooltip-basic-example.tsx?raw';
import { TooltipContrastExample } from './examples/tooltip-contrast-example.js';
import tooltipContrastExampleCode from './examples/tooltip-contrast-example.tsx?raw';
import { TooltipPlacementExample } from './examples/tooltip-placement-example.js';
import tooltipPlacementExampleCode from './examples/tooltip-placement-example.tsx?raw';
import { TooltipPointerExample } from './examples/tooltip-pointer-example.js';
import tooltipPointerExampleCode from './examples/tooltip-pointer-example.tsx?raw';
import { MarkdownDocsPage } from './markdown-docs-page.js';
import tooltipDocs from './tooltip.md?raw';

export function TooltipDocsPage() {
  return (
    <MarkdownDocsPage
      format="component"
      slots={{
        'demo:basic': (
          <DocsExample code={tooltipExampleCode} label="Tooltip">
            <TooltipExample />
          </DocsExample>
        ),
        'demo:contrast': (
          <DocsExample
            code={tooltipContrastExampleCode}
            label="Tooltip contrast"
          >
            <TooltipContrastExample />
          </DocsExample>
        ),
        'demo:placement': (
          <DocsExample
            code={tooltipPlacementExampleCode}
            label="Tooltip placement"
          >
            <TooltipPlacementExample />
          </DocsExample>
        ),
        'demo:pointer': (
          <DocsExample code={tooltipPointerExampleCode} label="Tooltip pointer">
            <TooltipPointerExample />
          </DocsExample>
        ),
      }}
      source={tooltipDocs}
    />
  );
}
