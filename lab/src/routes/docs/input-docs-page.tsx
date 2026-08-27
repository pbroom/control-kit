import { DocsExample } from './docs-example.js';
import { InputPrimitiveExample } from './examples/input-primitive-basic-example.js';
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
    type: 'number',
    required: true,
    description: 'The controlled committed numeric value.',
  },
  {
    name: 'onValueChange',
    type: '(value: number, details: PrimitiveValueChangeDetails) => void',
    shortType: 'function',
    required: true,
    description: 'Updates the committed value after input interaction.',
  },
  {
    name: 'ariaLabel',
    type: 'string | undefined',
    shortType: 'string',
    description: 'Names the spinbutton when no visible label is associated.',
  },
  {
    name: 'placeholder',
    type: 'string | undefined',
    shortType: 'string',
    description: 'Placeholder text shown for an empty draft.',
  },
  {
    name: 'leadingElement',
    type: 'ReactNode',
    shortType: 'ReactNode',
    defaultValue: "'V'",
    description:
      'Supplies the default leading scrub-handle content when the handle is enabled.',
  },
  {
    name: 'trailingElement',
    type: 'ReactNode',
    shortType: 'ReactNode',
    description:
      'Renders after the input, or supplies the trailing scrub handle when no handleElement is set.',
  },
  {
    name: 'handleElement',
    type: 'ReactNode',
    shortType: 'ReactNode',
    description: 'Overrides content inside the scrub handle.',
  },
  {
    name: 'handleSide',
    type: 'PrimitiveHandleSide | undefined',
    shortType: "'leading' | 'trailing'",
    defaultValue: "'leading'",
    description: 'Places the scrub handle before or after the input.',
  },
  {
    name: 'handleContentWidth',
    type: 'number | undefined',
    shortType: 'number',
    defaultValue: '24',
    description: 'Sets scrub-handle content width in pixels.',
  },
  {
    name: 'min',
    type: 'number',
    required: true,
    description: 'The lower bound for clamp and wrap modes.',
  },
  {
    name: 'max',
    type: 'number',
    required: true,
    description: 'The upper bound for clamp and wrap modes.',
  },
  {
    name: 'wrapMode',
    type: 'PrimitiveWrapMode',
    shortType: "'clamp' | 'wrap' | 'free'",
    required: true,
    description: 'Controls how values behave at the bounds.',
  },
  {
    name: 'step',
    type: 'number',
    required: true,
    description: 'The standard keyboard and scrub increment.',
  },
  {
    name: 'fineStep',
    type: 'number',
    required: true,
    description: 'The Alt/Option-modified increment.',
  },
  {
    name: 'coarseStep',
    type: 'number',
    required: true,
    description: 'The Shift-modified increment.',
  },
  {
    name: 'pageStep',
    type: 'number',
    required: true,
    description: 'The Page Up and Page Down increment.',
  },
  {
    name: 'precision',
    type: 'PrimitivePrecision',
    required: true,
    description: 'Controls displayed decimal precision.',
  },
  {
    name: 'autoTrim',
    type: 'boolean',
    required: true,
    description: 'Trims insignificant trailing zeros from formatted values.',
  },
  {
    name: 'allowExpressions',
    type: 'boolean',
    required: true,
    description:
      'Tells a supplied expression parser whether expression evaluation is enabled.',
  },
  {
    name: 'parseExpression',
    type: 'PrimitiveExpressionParser | undefined',
    shortType: 'function',
    description:
      'Parses drafts and receives allowExpressions, the current value, and the active range.',
  },
  {
    name: 'selectAllOnFocus',
    type: 'boolean',
    required: true,
    description: 'Selects the complete draft when the input receives focus.',
  },
  {
    name: 'commitOnBlur',
    type: 'boolean',
    required: true,
    description: 'Commits a valid draft when focus leaves the input.',
  },
  {
    name: 'scrubEnabled',
    type: 'boolean',
    required: true,
    description: 'Renders and enables pointer scrubbing.',
  },
  {
    name: 'scrubPixelsPerStep',
    type: 'number | undefined',
    shortType: 'number',
    defaultValue: '1',
    description: 'Sets pointer pixels required for each scrub step.',
  },
  {
    name: 'stepDragDistance',
    type: 'number | undefined',
    shortType: 'number',
    description: 'Alternative scrub distance for one configured step.',
  },
  {
    name: 'scrubThreshold',
    type: 'number',
    required: true,
    description: 'Sets pointer movement required before scrubbing begins.',
  },
  {
    name: 'scrubCommitThreshold',
    type: 'number | undefined',
    shortType: 'number',
    description: 'Sets the minimum scrub delta before publishing a value.',
  },
  {
    name: 'scrubMaxCommitRate',
    type: 'number | undefined',
    shortType: 'number',
    description: 'Limits scrub value publications per second.',
  },
  {
    name: 'pointerLockEnabled',
    type: 'boolean',
    required: true,
    description: 'Uses pointer lock for unbounded scrubbing when available.',
  },
  {
    name: 'horizontalArrowKeysMoveCaret',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'true',
    description:
      'Keeps horizontal arrows available for caret movement while editing.',
  },
  {
    name: 'disabled',
    type: 'boolean',
    required: true,
    description: 'Disables editing and scrubbing.',
  },
  {
    name: 'readOnly',
    type: 'boolean',
    required: true,
    description: 'Prevents changes without disabling focus.',
  },
  {
    name: 'onInvalidCommit',
    type: '(draft: string) => void',
    shortType: 'function',
    description: 'Reports a draft that could not be committed.',
  },
  {
    name: 'visualState',
    type: 'PrimitiveVisualState',
    shortType: "'auto' | 'valid' | 'invalid'",
    required: true,
    description: 'Controls validation styling.',
  },
  {
    name: 'visualTreatment',
    type: 'PrimitiveVisualTreatment | undefined',
    shortType: "'default' | 'embedded'",
    defaultValue: "'default'",
    description: 'Selects standalone or embedded surface styling.',
  },
  {
    name: 'showInvalidBorder',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'false',
    description: 'Shows the invalid border treatment.',
  },
  {
    name: 'onScrubbingChange',
    type: '(isScrubbing: boolean) => void',
    shortType: 'function',
    description: 'Reports when pointer scrubbing starts or ends.',
  },
  {
    name: 'size',
    type: 'PrimitiveSize',
    shortType: "'sm' | 'md' | 'lg' | 'full'",
    required: true,
    description: 'Sets the control width preset.',
  },
  {
    name: 'density',
    type: 'PrimitiveDensity | undefined',
    shortType: "'compact' | 'comfortable'",
    defaultValue: "'compact'",
    description: 'Sets the control height and text density.',
  },
] satisfies readonly PropReference[];

export function InputDocsPage() {
  return (
    <MarkdownDocsPage
      slots={{
        'demo:basic': (
          <DocsExample code={inputExampleCode} label="Primitive value input">
            <InputPrimitiveExample />
          </DocsExample>
        ),
        'props:input': (
          <PropReferenceTable name="PrimitiveValueInput" props={INPUT_PROPS} />
        ),
      }}
      source={inputDocs}
    />
  );
}
