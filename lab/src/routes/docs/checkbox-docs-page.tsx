import { DocsExample } from './docs-example.js';
import { CheckboxExample } from './examples/checkbox-basic-example.js';
import checkboxExampleCode from './examples/checkbox-basic-example.tsx?raw';
import { CheckboxGroupExample } from './examples/checkbox-group-example.js';
import checkboxGroupExampleCode from './examples/checkbox-group-example.tsx?raw';
import { CheckboxStatesExample } from './examples/checkbox-states-example.js';
import checkboxStatesExampleCode from './examples/checkbox-states-example.tsx?raw';
import { MarkdownDocsPage } from './markdown-docs-page.js';
import {
  PropReferenceTable,
  type PropReference,
} from './prop-reference-table.js';
import checkboxDocs from './checkbox.md?raw';

const CHECKBOX_PROPS = [
  {
    name: 'checked',
    type: 'boolean',
    required: true,
    description: 'The controlled checked state.',
  },
  {
    name: 'onCheckedChange',
    shortType: 'function',
    type: '(checked: boolean, eventDetails: CheckboxRoot.ChangeEventDetails) => void',
    description:
      'Called when the checkbox is checked or unchecked, with Base UI event details.',
  },
  {
    name: 'children',
    type: 'React.ReactNode',
    description:
      'Renders the integrated visible and accessible label beside the indicator.',
  },
  {
    name: 'className',
    type: 'string | undefined',
    shortType: 'string',
    description: 'Adds classes to the interactive root.',
  },
  {
    name: 'indicatorClassName',
    type: 'string | undefined',
    shortType: 'string',
    description: 'Adds classes to the mounted indicator.',
  },
  {
    name: 'labelClassName',
    type: 'string | undefined',
    shortType: 'string',
    description: 'Adds classes to the label span.',
  },
  {
    name: 'disabled',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'false',
    description: 'Prevents interaction and marks the checkbox as disabled.',
  },
  {
    name: 'readOnly',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'false',
    description:
      'Prevents the checked state from changing while preserving focusability.',
  },
  {
    name: 'required',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'false',
    description: 'Requires the checkbox to be checked for form validation.',
  },
  {
    name: 'name',
    type: 'string | undefined',
    shortType: 'string',
    description: 'Identifies the hidden input during form submission.',
  },
  {
    name: 'value',
    type: 'string | undefined',
    shortType: 'string',
    description: 'The value submitted when the checkbox is checked.',
  },
  {
    name: 'uncheckedValue',
    type: 'string | undefined',
    shortType: 'string',
    description:
      'The value submitted when the checkbox is unchecked. By default, an unchecked checkbox submits no value.',
  },
  {
    name: 'form',
    type: 'string | undefined',
    shortType: 'string',
    description: 'The ID of the form associated with the hidden input.',
  },
] satisfies readonly PropReference[];

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
        'props:checkbox': (
          <PropReferenceTable name="Checkbox" props={CHECKBOX_PROPS} />
        ),
      }}
      source={checkboxDocs}
    />
  );
}
