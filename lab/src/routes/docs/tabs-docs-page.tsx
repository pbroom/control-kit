import { DocsExample } from './docs-example.js';
import { TabsExample } from './examples/tabs-basic-example.js';
import tabsExampleCode from './examples/tabs-basic-example.tsx?raw';
import { TabsControlledExample } from './examples/tabs-controlled-example.js';
import tabsControlledExampleCode from './examples/tabs-controlled-example.tsx?raw';
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
    type: 'any | null | undefined',
    shortType: 'any | null',
    description:
      'The controlled value of the active tab. Pass null to leave every tab inactive.',
  },
  {
    name: 'defaultValue',
    type: 'any | null | undefined',
    shortType: 'any | null',
    defaultValue: '0',
    description: 'The initially active tab in uncontrolled mode.',
  },
  {
    name: 'onValueChange',
    shortType: 'function',
    type: '(value: any | null, eventDetails: ChangeEventDetails) => void',
    description: 'Called when the active tab changes.',
  },
  {
    name: 'orientation',
    type: "'horizontal' | 'vertical' | undefined",
    shortType: "'horizontal' | 'vertical'",
    defaultValue: "'horizontal'",
    description: 'Sets the tab list orientation and arrow-key direction.',
  },
] satisfies readonly PropReference[];

const TABS_LIST_PROPS = [
  {
    name: 'activateOnFocus',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'true',
    description:
      'Controls whether arrow-key focus also activates the focused trigger.',
  },
  {
    name: 'loopFocus',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'true',
    description:
      'Controls whether arrow-key focus wraps between the first and last trigger.',
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
    name: 'render',
    type: 'ReactElement | ((props, state) => ReactElement) | undefined',
    shortType: 'ReactElement | function',
    description:
      'Replaces the trigger element or composes it with another component.',
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
    name: 'keepMounted',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'false',
    description:
      'Keeps the panel mounted when inactive for animation or state-preservation needs.',
  },
  {
    name: 'render',
    type: 'ReactElement | ((props, state) => ReactElement) | undefined',
    shortType: 'ReactElement | function',
    description:
      'Replaces the panel element or composes it with another component.',
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
        'demo:controlled': (
          <DocsExample code={tabsControlledExampleCode} label="Controlled tabs">
            <TabsControlledExample />
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
