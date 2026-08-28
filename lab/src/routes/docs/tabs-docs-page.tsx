import { DocsExample } from './docs-example.js';
import { TabsExample } from './examples/tabs-basic-example.js';
import tabsExampleCode from './examples/tabs-basic-example.tsx?raw';
import { TabsDisabledExample } from './examples/tabs-disabled-example.js';
import tabsDisabledExampleCode from './examples/tabs-disabled-example.tsx?raw';
import { TabsManualExample } from './examples/tabs-manual-example.js';
import tabsManualExampleCode from './examples/tabs-manual-example.tsx?raw';
import { MarkdownDocsPage } from './markdown-docs-page.js';
import tabsDocs from './tabs.md?raw';

export function TabsDocsPage() {
  return (
    <MarkdownDocsPage
      format="component"
      slots={{
        'demo:basic': (
          <DocsExample code={tabsExampleCode} label="Tabs">
            <TabsExample />
          </DocsExample>
        ),
        'demo:disabled': (
          <DocsExample code={tabsDisabledExampleCode} label="Disabled tab">
            <TabsDisabledExample />
          </DocsExample>
        ),
        'demo:manual': (
          <DocsExample code={tabsManualExampleCode} label="Manual tabs">
            <TabsManualExample />
          </DocsExample>
        ),
      }}
      source={tabsDocs}
    />
  );
}
