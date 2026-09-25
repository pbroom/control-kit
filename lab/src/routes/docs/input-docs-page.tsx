import { DocsExample } from './docs-example.js';
import { ControlInputExample } from './examples/input-primitive-basic-example.js';
import inputExampleCode from './examples/input-primitive-basic-example.tsx?raw';
import { MarkdownDocsPage } from './markdown-docs-page.js';
import {
  PropReferenceTable,
  type PropReference,
} from './prop-reference-table.js';
import inputDocs from './input.md?raw';

const INPUT_PROPS = [
  {
    name: 'value',
    type: 'number | null | undefined',
    description: 'The controlled numeric value.',
  },
  {
    name: 'defaultValue',
    type: 'number | null | undefined',
    defaultValue: 'null',
    description: 'The initial value when the input is uncontrolled.',
  },
  {
    name: 'onValueChange',
    type: '(value: number | null, details: ControlFieldValueChangeDetails) => void',
    shortType: 'function',
    description:
      'Called for every value change, including each parseable keystroke.',
  },
  {
    name: 'onValueCommitted',
    type: '(value: number | null, details: ControlFieldValueCommitDetails) => void',
    shortType: 'function',
    description:
      'Called once per finished edit: a text commit, key step, expression, or scrub release.',
  },
  {
    name: 'label',
    type: 'string | undefined',
    shortType: 'string',
    description: 'Accessible name for the text input.',
  },
  {
    name: 'placeholder',
    type: 'string | undefined',
    shortType: 'string',
    description: 'Placeholder text shown when the value is empty.',
  },
  {
    name: 'min',
    type: 'number | undefined',
    description: 'The minimum value.',
  },
  {
    name: 'max',
    type: 'number | undefined',
    description: 'The maximum value.',
  },
  {
    name: 'boundaryBehavior',
    type: "'clamp' | 'wrap' | 'free' | undefined",
    shortType: "'clamp' | 'wrap' | 'free'",
    defaultValue: "'clamp'",
    description: 'Clamps, wraps, or frees values relative to min and max.',
  },
  {
    name: 'step',
    type: "number | 'any' | undefined",
    shortType: 'number',
    defaultValue: '1',
    description: 'Arrow-key and scrub step.',
  },
  {
    name: 'smallStep',
    type: 'number | undefined',
    defaultValue: '0.1',
    description: 'Step while Alt/Option is held.',
  },
  {
    name: 'largeStep',
    type: 'number | undefined',
    defaultValue: '10',
    description: 'Step while Shift is held.',
  },
  {
    name: 'pageStep',
    type: 'number | undefined',
    defaultValue: 'largeStep',
    description: 'Page Up and Page Down step.',
  },
  {
    name: 'precision',
    type: 'number | undefined',
    description:
      'Fraction digits shown when format is not set. Values keep full precision.',
  },
  {
    name: 'expressionResolver',
    type: 'ControlFieldExpressionResolver | null | undefined',
    shortType: 'function | null',
    defaultValue: 'resolveControlFieldExpression',
    description:
      'Resolves expression drafts. Set to null for numeric-only entry.',
  },
  {
    name: 'selectOnFocus',
    type: 'boolean | undefined',
    defaultValue: 'false',
    description: 'Selects the text when the input receives focus.',
  },
  {
    name: 'size',
    type: "'sm' | 'md' | 'lg' | 'full' | undefined",
    shortType: "'sm' | 'md' | 'lg' | 'full'",
    defaultValue: "'full'",
    description: 'Sets the width preset.',
  },
  {
    name: 'density',
    type: "'compact' | 'comfortable' | undefined",
    shortType: "'compact' | 'comfortable'",
    defaultValue: "'compact'",
    description: 'Sets the height and text density.',
  },
  {
    name: 'variant',
    type: "'default' | 'embedded' | undefined",
    shortType: "'default' | 'embedded'",
    defaultValue: "'default'",
    description:
      'Embedded drops the rounded border for use inside another surface.',
  },
  {
    name: 'unit',
    type: 'ReactNode',
    description: 'Non-interactive unit or suffix rendered after the text.',
  },
  {
    name: 'handle',
    type: 'ReactNode',
    description:
      'Scrub handle content. Without content the handle is a thin edge strip.',
  },
  {
    name: 'handleSide',
    type: "'leading' | 'trailing' | undefined",
    shortType: "'leading' | 'trailing'",
    defaultValue: "'leading'",
    description: 'Places the scrub handle before or after the input.',
  },
  {
    name: 'handleWidth',
    type: 'number | undefined',
    defaultValue: '24',
    description: 'Width in pixels of a handle with content.',
  },
  {
    name: 'scrub',
    type: 'boolean | undefined',
    defaultValue: 'true',
    description: 'Renders the scrub handle.',
  },
  {
    name: 'pixelsPerStep',
    type: 'number | undefined',
    defaultValue: '1',
    description: 'Pointer pixels per step while scrubbing.',
  },
  {
    name: 'stepDistance',
    type: 'number | undefined',
    description: 'Scrub in whole steps, one per stepDistance pixels.',
  },
  {
    name: 'scrubThreshold',
    type: 'number | undefined',
    defaultValue: '1',
    description: 'Pointer pixels before a scrub starts.',
  },
  {
    name: 'scrubCommitThreshold',
    type: 'number | undefined',
    defaultValue: '0',
    description: 'Minimum value change between updates while scrubbing.',
  },
  {
    name: 'scrubMaxCommitRate',
    type: 'number | undefined',
    description: 'Maximum updates per second while scrubbing.',
  },
  {
    name: 'pointerLock',
    type: 'boolean | undefined',
    defaultValue: 'false',
    description: 'Locks the pointer while scrubbing.',
  },
  {
    name: 'onScrubbingChange',
    type: '((isScrubbing: boolean) => void) | undefined',
    shortType: 'function',
    description: 'Reports when scrubbing starts and ends.',
  },
  {
    name: 'invalid',
    type: 'boolean | undefined',
    defaultValue: 'false',
    description: 'Forces the invalid border and aria-invalid.',
  },
  {
    name: 'inputProps',
    type: 'ControlFieldInputProps | undefined',
    shortType: 'object',
    description: 'Props for the text input, such as inputMode or key handlers.',
  },
] satisfies readonly PropReference[];

export function InputDocsPage() {
  return (
    <MarkdownDocsPage
      slots={{
        'demo:basic': (
          <DocsExample code={inputExampleCode} label="Control input">
            <ControlInputExample />
          </DocsExample>
        ),
        'props:input': (
          <PropReferenceTable name="ControlInput" props={INPUT_PROPS} />
        ),
      }}
      source={inputDocs}
    />
  );
}
