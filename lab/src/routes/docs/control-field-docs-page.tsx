import { DocsExample } from './docs-example.js';
import { ControlFieldBasicExample } from './examples/control-field-basic-example.js';
import controlFieldBasicCode from './examples/control-field-basic-example.tsx?raw';
import { ControlFieldExpressionExample } from './examples/control-field-expression-example.js';
import controlFieldExpressionCode from './examples/control-field-expression-example.tsx?raw';
import { MarkdownDocsPage } from './markdown-docs-page.js';
import controlFieldDocs from './control-field.md?raw';

export function ControlFieldDocsPage() {
  return (
    <MarkdownDocsPage
      format="component"
      slots={{
        'demo:basic': (
          <DocsExample code={controlFieldBasicCode} label="Control Field">
            <ControlFieldBasicExample />
          </DocsExample>
        ),
        'demo:expression': (
          <DocsExample
            code={controlFieldExpressionCode}
            label="Control Field expressions"
          >
            <ControlFieldExpressionExample />
          </DocsExample>
        ),
      }}
      source={controlFieldDocs}
    />
  );
}
