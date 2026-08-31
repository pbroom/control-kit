import { DocsExample } from './docs-example.js';
import { ToggleGroupExample } from './examples/toggle-group-basic-example.js';
import toggleGroupExampleCode from './examples/toggle-group-basic-example.tsx?raw';
import { ToggleGroupMultipleExample } from './examples/toggle-group-multiple-example.js';
import toggleGroupMultipleExampleCode from './examples/toggle-group-multiple-example.tsx?raw';
import { ToggleGroupVariantsExample } from './examples/toggle-group-variants-example.js';
import toggleGroupVariantsExampleCode from './examples/toggle-group-variants-example.tsx?raw';
import { MarkdownDocsPage } from './markdown-docs-page.js';
import {
  PropReferenceTable,
  type PropReference,
} from './prop-reference-table.js';
import toggleGroupDocs from './toggle-group.md?raw';

const TOGGLE_GROUP_PROPS = [
  {
    name: 'type',
    type: "'single' | 'multiple' | undefined",
    shortType: "'single' | 'multiple'",
    defaultValue: "'single'",
    description:
      'Selects scalar single-selection or array-based multiple-selection state.',
  },
  {
    name: 'value',
    type: 'string | string[] | undefined',
    shortType: 'string | string[]',
    description:
      'The controlled selection. Its shape follows the selected type.',
  },
  {
    name: 'defaultValue',
    type: 'string | string[] | undefined',
    shortType: 'string | string[]',
    description:
      'The initial uncontrolled selection. Its shape follows the selected type.',
  },
  {
    name: 'onValueChange',
    shortType: 'function',
    type: '((value: string | undefined, details: ToggleGroup.ChangeEventDetails) => void) | ((value: string[], details: ToggleGroup.ChangeEventDetails) => void)',
    description:
      'Called with the next scalar or array selection and Base UI event details.',
  },
  {
    name: 'variant',
    type: "'default' | 'outline' | null | undefined",
    shortType: "'default' | 'outline'",
    defaultValue: "'default'",
    description: 'Selects the surfaced or outlined visual treatment.',
  },
  {
    name: 'size',
    type: "'sm' | 'default' | 'lg' | null | undefined",
    shortType: "'sm' | 'default' | 'lg'",
    defaultValue: "'default'",
    description:
      'Sets the group height. Apply the same size to its items for matched sizing.',
  },
  {
    name: 'loop',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'true',
    description:
      'Controls whether arrow-key focus wraps between the first and last item.',
  },
  {
    name: 'disabled',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'false',
    description: 'Prevents interaction with every item in the group.',
  },
  {
    name: 'orientation',
    type: "'horizontal' | 'vertical' | undefined",
    shortType: "'horizontal' | 'vertical'",
    defaultValue: "'horizontal'",
    description: 'Sets the group orientation and arrow-key direction.',
  },
  {
    name: 'className',
    type: 'string | undefined',
    shortType: 'string',
    description: 'Adds classes to the group root.',
  },
] satisfies readonly PropReference[];

const TOGGLE_GROUP_ITEM_PROPS = [
  {
    name: 'value',
    type: 'string | undefined',
    shortType: 'string',
    description: 'Uniquely identifies the item within its toggle group.',
  },
  {
    name: 'size',
    type: "'sm' | 'default' | 'lg' | null | undefined",
    shortType: "'sm' | 'default' | 'lg'",
    defaultValue: "'default'",
    description: 'Sets the item height and minimum width.',
  },
  {
    name: 'disabled',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'false',
    description: 'Prevents the item from receiving interaction.',
  },
  {
    name: 'render',
    shortType: 'ReactElement | function',
    type: 'React.ReactElement | ComponentRenderFn<HTMLProps, Toggle.State> | undefined',
    description:
      'Replaces the rendered button or composes the item behavior onto another element.',
  },
] satisfies readonly PropReference[];

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
        'props:toggle-group': (
          <PropReferenceTable name="ToggleGroup" props={TOGGLE_GROUP_PROPS} />
        ),
        'props:toggle-group-item': (
          <PropReferenceTable
            name="ToggleGroupItem"
            props={TOGGLE_GROUP_ITEM_PROPS}
          />
        ),
      }}
      source={toggleGroupDocs}
    />
  );
}
