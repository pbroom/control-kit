import { DocsExample } from './docs-example.js';
import { CheckboxExample } from './examples/checkbox-basic-example.js';
import checkboxExampleCode from './examples/checkbox-basic-example.tsx?raw';
import { CheckboxGroupExample } from './examples/checkbox-group-example.js';
import checkboxGroupExampleCode from './examples/checkbox-group-example.tsx?raw';
import { CheckboxStatesExample } from './examples/checkbox-states-example.js';
import checkboxStatesExampleCode from './examples/checkbox-states-example.tsx?raw';
import { MarkdownDocsPage } from './markdown-docs-page.js';
import checkboxDocs from './checkbox.md?raw';

export function CheckboxDocsPage() {
  return (
    <MarkdownDocsPage
      format="component"
      slots={{
        'demo:basic': (
          <DocsExample code={checkboxExampleCode} label="Checkbox">
            <CheckboxExample />
          </DocsExample>
        ),
        'demo:states': (
          <DocsExample code={checkboxStatesExampleCode} label="Checkbox states">
            <CheckboxStatesExample />
          </DocsExample>
        ),
        'demo:group': (
          <DocsExample code={checkboxGroupExampleCode} label="Checkbox group">
            <CheckboxGroupExample />
          </DocsExample>
        ),
      }}
      source={checkboxDocs}
    />
  );
}
