import { DocsExample } from './docs-example.js';
import { ToggleButtonBasicExample } from './examples/toggle-button-basic-example.js';
import toggleButtonBasicExampleCode from './examples/toggle-button-basic-example.tsx?raw';
import { ToggleButtonContentExample } from './examples/toggle-button-content-example.js';
import toggleButtonContentExampleCode from './examples/toggle-button-content-example.tsx?raw';
import { ToggleButtonStatesExample } from './examples/toggle-button-states-example.js';
import toggleButtonStatesExampleCode from './examples/toggle-button-states-example.tsx?raw';
import { MarkdownDocsPage } from './markdown-docs-page.js';
import toggleButtonDocs from './toggle-button.md?raw';

export function ToggleButtonDocsPage() {
  return (
    <MarkdownDocsPage
      format="component"
      slots={{
        'demo:basic': (
          <DocsExample
            code={toggleButtonBasicExampleCode}
            label="Toggle button"
          >
            <ToggleButtonBasicExample />
          </DocsExample>
        ),
        'demo:content': (
          <DocsExample
            code={toggleButtonContentExampleCode}
            label="Toggle button content"
          >
            <ToggleButtonContentExample />
          </DocsExample>
        ),
        'demo:states': (
          <DocsExample
            code={toggleButtonStatesExampleCode}
            label="Toggle button states"
          >
            <ToggleButtonStatesExample />
          </DocsExample>
        ),
      }}
      source={toggleButtonDocs}
    />
  );
}
