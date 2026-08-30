import { DocsExample } from './docs-example.js';
import { TabsExample } from './examples/tabs-basic-example.js';
import tabsExampleCode from './examples/tabs-basic-example.tsx?raw';
import { TabsDisabledExample } from './examples/tabs-disabled-example.js';
import tabsDisabledExampleCode from './examples/tabs-disabled-example.tsx?raw';
import { TabsManualExample } from './examples/tabs-manual-example.js';
import tabsManualExampleCode from './examples/tabs-manual-example.tsx?raw';
import { MarkdownDocsPage } from './markdown-docs-page.js';
import {
  PropReferenceTable,
  type PropReference,
} from './prop-reference-table.js';
import tabsDocs from './tabs.md?raw';

const TABS_PROPS = [
  {
    name: 'value',
    type: 'string | undefined',
    shortType: 'string',
    description: 'The controlled value of the active tab.',
  },
  {
    name: 'defaultValue',
    type: 'string | undefined',
    shortType: 'string',
    description: 'The initially active tab in uncontrolled mode.',
  },
  {
    name: 'onValueChange',
    shortType: 'function',
    type: '(value: string) => void',
    description: 'Called when the active tab changes.',
  },
  {
    name: 'activationMode',
    type: "'automatic' | 'manual' | undefined",
    shortType: "'automatic' | 'manual'",
    defaultValue: "'automatic'",
    description:
      'Controls whether a focused trigger activates automatically or requires Enter or Space.',
  },
  {
    name: 'orientation',
    type: "'horizontal' | 'vertical' | undefined",
    shortType: "'horizontal' | 'vertical'",
    defaultValue: "'horizontal'",
    description: 'Sets the tab list orientation and arrow-key direction.',
  },
  {
    name: 'dir',
    type: "'ltr' | 'rtl' | undefined",
    shortType: "'ltr' | 'rtl'",
    description: 'Sets the reading direction used for keyboard navigation.',
  },
] satisfies readonly PropReference[];

const TABS_LIST_PROPS = [
  {
    name: 'loop',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'true',
    description:
      'Controls whether arrow-key focus wraps between the first and last trigger.',
  },
  {
    name: 'asChild',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'false',
    description: 'Composes the list behavior onto its immediate child.',
  },
  {
    name: 'className',
    type: 'string | undefined',
    shortType: 'string',
    description: 'Adds classes to the tab list.',
  },
] satisfies readonly PropReference[];

const TABS_TRIGGER_PROPS = [
  {
    name: 'value',
    type: 'string',
    required: true,
    description: 'Associates the trigger with the content of the same value.',
  },
  {
    name: 'disabled',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'false',
    description: 'Prevents the trigger from receiving focus or activation.',
  },
  {
    name: 'asChild',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'false',
    description: 'Composes the trigger behavior onto its immediate child.',
  },
  {
    name: 'className',
    type: 'string | undefined',
    shortType: 'string',
    description: 'Adds classes to the trigger.',
  },
] satisfies readonly PropReference[];

const TABS_CONTENT_PROPS = [
  {
    name: 'value',
    type: 'string',
    required: true,
    description: 'Associates the panel with the trigger of the same value.',
  },
  {
    name: 'forceMount',
    type: 'true | undefined',
    shortType: 'true',
    defaultValue: 'false',
    description:
      'Keeps the panel mounted when inactive for animation or state-preservation needs.',
  },
  {
    name: 'asChild',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'false',
    description: 'Composes the panel behavior onto its immediate child.',
  },
  {
    name: 'className',
    type: 'string | undefined',
    shortType: 'string',
    description: 'Adds classes to the tab panel.',
  },
] satisfies readonly PropReference[];

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
        'props:tabs': <PropReferenceTable name="Tabs" props={TABS_PROPS} />,
        'props:tabs-list': (
          <PropReferenceTable name="TabsList" props={TABS_LIST_PROPS} />
        ),
        'props:tabs-trigger': (
          <PropReferenceTable name="TabsTrigger" props={TABS_TRIGGER_PROPS} />
        ),
        'props:tabs-content': (
          <PropReferenceTable name="TabsContent" props={TABS_CONTENT_PROPS} />
        ),
      }}
      source={tabsDocs}
    />
  );
}
