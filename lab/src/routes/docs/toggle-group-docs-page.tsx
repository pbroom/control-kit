import { DocsExample } from './docs-example.js';
import { ToggleGroupExample } from './examples/toggle-group-basic-example.js';
import toggleGroupExampleCode from './examples/toggle-group-basic-example.tsx?raw';
import { ToggleGroupMultipleExample } from './examples/toggle-group-multiple-example.js';
import toggleGroupMultipleExampleCode from './examples/toggle-group-multiple-example.tsx?raw';
import { ToggleGroupVariantsExample } from './examples/toggle-group-variants-example.js';
import toggleGroupVariantsExampleCode from './examples/toggle-group-variants-example.tsx?raw';
import { MarkdownDocsPage } from './markdown-docs-page.js';
import toggleGroupDocs from './toggle-group.md?raw';

export function ToggleGroupDocsPage() {
  return (
    <MarkdownDocsPage
      format="component"
      slots={{
        'demo:basic': (
          <DocsExample code={toggleGroupExampleCode} label="Toggle group">
            <ToggleGroupExample />
          </DocsExample>
        ),
        'demo:multiple': (
          <DocsExample
            code={toggleGroupMultipleExampleCode}
            label="Multiple selection toggle group"
          >
            <ToggleGroupMultipleExample />
          </DocsExample>
        ),
        'demo:variants': (
          <DocsExample
            code={toggleGroupVariantsExampleCode}
            label="Toggle group variants and sizes"
          >
            <ToggleGroupVariantsExample />
          </DocsExample>
        ),
      }}
      source={toggleGroupDocs}
    />
  );
}
