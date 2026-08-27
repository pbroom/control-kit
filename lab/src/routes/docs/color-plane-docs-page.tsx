import { DocsExample } from './docs-example.js';
import { ColorPlaneAxesExample } from './examples/color-plane-axes-example.js';
import colorPlaneAxesExampleCode from './examples/color-plane-axes-example.tsx?raw';
import { ColorPlaneExample } from './examples/color-plane-basic-example.js';
import colorPlaneExampleCode from './examples/color-plane-basic-example.tsx?raw';
import { MarkdownDocsPage } from './markdown-docs-page.js';
import colorPlaneDocs from './color-plane.md?raw';

export function ColorPlaneDocsPage() {
  return (
    <MarkdownDocsPage
      format="component"
      slots={{
        'demo:basic': (
          <DocsExample code={colorPlaneExampleCode} label="Color plane">
            <ColorPlaneExample />
          </DocsExample>
        ),
        'demo:axes': (
          <DocsExample
            code={colorPlaneAxesExampleCode}
            label="Color plane axes"
          >
            <ColorPlaneAxesExample />
          </DocsExample>
        ),
      }}
      source={colorPlaneDocs}
    />
  );
}
