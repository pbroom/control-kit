import { DocsExample } from './docs-example.js';
import { MenuBasicExample } from './examples/menu-basic-example.js';
import menuBasicExampleCode from './examples/menu-basic-example.tsx?raw';
import { MenuMinimalExample } from './examples/menu-minimal-example.js';
import menuMinimalExampleCode from './examples/menu-minimal-example.tsx?raw';
import { MenuPlacementExample } from './examples/menu-placement-example.js';
import menuPlacementExampleCode from './examples/menu-placement-example.tsx?raw';
import { MarkdownDocsPage } from './markdown-docs-page.js';
import menuDocs from './menu.md?raw';

export function MenuDocsPage() {
  return (
    <MarkdownDocsPage
      format="component"
      slots={{
        'demo:basic': (
          <DocsExample code={menuBasicExampleCode} label="Menu">
            <MenuBasicExample />
          </DocsExample>
        ),
        'demo:minimal': (
          <DocsExample code={menuMinimalExampleCode} label="Minimal menu">
            <MenuMinimalExample />
          </DocsExample>
        ),
        'demo:placement': (
          <DocsExample code={menuPlacementExampleCode} label="Menu placement">
            <MenuPlacementExample />
          </DocsExample>
        ),
      }}
      source={menuDocs}
    />
  );
}
