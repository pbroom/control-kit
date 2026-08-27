import { DocsExample } from './docs-example.js';
import { InputMultiExample } from './examples/input-multi-basic-example.js';
import inputMultiExampleCode from './examples/input-multi-basic-example.tsx?raw';
import { MarkdownDocsPage } from './markdown-docs-page.js';
import {
  PropReferenceTable,
  type PropReference,
} from './prop-reference-table.js';
import inputMultiDocs from './input-multi.md?raw';

const MULTI_INPUT_PROPS = [
  {
    name: 'fields',
    type: 'Array<MultiInputField<TFieldId>>',
    shortType: 'MultiInputField[]',
    description:
      'Defines field labels, units, layout weight, and display scale.',
  },
  {
    name: 'values',
    type: 'MultiInputValues<TFieldId>',
    shortType: 'MultiInputValues',
    description: 'The controlled numeric value record keyed by field ID.',
  },
  {
    name: 'config',
    type: 'MultiInputConfig<TFieldId>',
    shortType: 'MultiInputConfig',
    description:
      'Per-field bounds, steps, precision, wrapping, and disabled state.',
  },
  {
    name: 'segments',
    type: 'Array<MultiInputSegmentModel<TFieldId>>',
    shortType: 'MultiInputSegmentModel[]',
    description: 'Precomputed alternative to fields, values, and config.',
  },
  {
    name: 'onFieldChange',
    type: '(field: TFieldId, value: number) => void',
    shortType: 'function',
    required: true,
    description: 'Updates one controlled field value.',
  },
  {
    name: 'parseExpression',
    type: 'PrimitiveExpressionParser | undefined',
    shortType: 'function',
    description: 'Parses expression drafts for every segment.',
  },
  {
    name: 'showLeadingLabels',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'false',
    description: 'Shows compact labels at the leading edge of each segment.',
  },
] satisfies readonly PropReference[];

const MULTI_INPUT_SEGMENT_PROPS = [
  {
    name: 'field',
    type: 'MultiInputField<TFieldId>',
    shortType: 'MultiInputField',
    required: true,
    description:
      'Defines the field ID, labels, unit, layout, and display scale.',
  },
  {
    name: 'config',
    type: 'MultiInputSegmentConfig',
    shortType: 'MultiInputSegmentConfig',
    required: true,
    description:
      'Configures bounds, steps, precision, wrapping, and disabled state.',
  },
  {
    name: 'value',
    type: 'number',
    required: true,
    description: 'The controlled stored value before display scaling.',
  },
  {
    name: 'onValueChange',
    type: '(value: number) => void',
    shortType: 'function',
    required: true,
    description: 'Updates the stored field value.',
  },
  {
    name: 'onScrubbingChange',
    type: '(field: TFieldId, isScrubbing: boolean) => void',
    shortType: 'function',
    required: true,
    description: 'Reports segment scrub state to the containing control.',
  },
  {
    name: 'parseExpression',
    type: 'PrimitiveExpressionParser | undefined',
    shortType: 'function',
    description: 'Parses expression drafts for this segment.',
  },
  {
    name: 'showLeadingLabel',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'false',
    description: 'Shows the field label before the input.',
  },
] satisfies readonly PropReference[];

export function InputMultiDocsPage() {
  return (
    <MarkdownDocsPage
      slots={{
        'demo:basic': (
          <DocsExample code={inputMultiExampleCode} label="Multi input">
            <InputMultiExample />
          </DocsExample>
        ),
        'props:multi-input': (
          <PropReferenceTable
            name="MultiInputControl"
            props={MULTI_INPUT_PROPS}
          />
        ),
        'props:multi-input-segment': (
          <PropReferenceTable
            name="MultiInputSegment"
            props={MULTI_INPUT_SEGMENT_PROPS}
          />
        ),
      }}
      source={inputMultiDocs}
    />
  );
}
