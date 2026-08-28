import { DocsExample } from './docs-example.js';
import { SelectBasicExample } from './examples/select-basic-example.js';
import selectBasicExampleCode from './examples/select-basic-example.tsx?raw';
import { SelectLongListExample } from './examples/select-long-list-example.js';
import selectLongListExampleCode from './examples/select-long-list-example.tsx?raw';
import { SelectPlacementExample } from './examples/select-placement-example.js';
import selectPlacementExampleCode from './examples/select-placement-example.tsx?raw';
import { MarkdownDocsPage } from './markdown-docs-page.js';
import selectDocs from './select.md?raw';

export function SelectDocsPage() {
  return (
    <MarkdownDocsPage
      format="component"
      slots={{
        'demo:basic': (
          <DocsExample code={selectBasicExampleCode} label="Select">
            <SelectBasicExample />
          </DocsExample>
        ),
        'demo:long-list': (
          <DocsExample
            code={selectLongListExampleCode}
            label="Long select list"
          >
            <SelectLongListExample />
          </DocsExample>
        ),
        'demo:placement': (
          <DocsExample
            code={selectPlacementExampleCode}
            label="Select placement"
          >
            <SelectPlacementExample />
          </DocsExample>
        ),
      }}
      source={selectDocs}
    />
  );
}
