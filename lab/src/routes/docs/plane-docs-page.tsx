import { DocsExample } from './docs-example.js';
import { PlaneExample } from './examples/plane-basic-example.js';
import basicExampleCode from './examples/plane-basic-example.tsx?raw';
import { MultipleThumbsExample } from './examples/plane-multiple-thumbs-example.js';
import multipleThumbsExampleCode from './examples/plane-multiple-thumbs-example.tsx?raw';
import { MarkdownDocsPage } from './markdown-docs-page.js';
import {
  PropReferenceTable,
  type PropReference,
} from './prop-reference-table.js';
import planeDocs from './plane.md?raw';

const PLANE_PROPS = [
  {
    name: 'pressBehavior',
    shortType: "'auto' | 'none' | 'nearest'",
    type: 'PlanePressBehavior | undefined',
    defaultValue: "'auto'",
    description: 'Controls what happens when empty plane space is pressed.',
  },
  {
    name: 'onHoverValueChange',
    shortType: 'function',
    type: '(value: PlaneValue | null, details: PlaneHoverValueChangeDetails) => void',
    description:
      'Called with the normalized position while a mouse or hovering pen moves over the plane, and null when it leaves.',
  },
  {
    name: 'disabled',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'false',
    description: 'Prevents changes and disables every thumb axis input.',
  },
  {
    name: 'readOnly',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'false',
    description:
      'Prevents changes while keeping every thumb axis input available to assistive technology.',
  },
  {
    name: 'role',
    type: 'React.AriaRole | undefined',
    shortType: 'React.AriaRole',
    defaultValue: "'group'",
    description: "The root element's role.",
  },
  {
    name: 'aria-label',
    type: 'string | undefined',
    shortType: 'string',
    defaultValue: "'2D position'",
    description: 'The accessible name for the group.',
  },
  {
    name: 'aria-roledescription',
    type: 'string | undefined',
    shortType: 'string',
    defaultValue: "'2D control'",
    description: 'The human-readable description of the root role.',
  },
] satisfies readonly PropReference[];

const PLANE_THUMB_PROPS = [
  {
    name: 'thumbId',
    shortType: 'string',
    type: 'string | undefined',
    description:
      'Identifies the thumb in data attributes and value-change details.',
  },
  {
    name: 'value',
    shortType: 'PlaneValue',
    type: 'PlaneValue | undefined',
    description: 'The controlled normalized position.',
  },
  {
    name: 'defaultValue',
    shortType: 'PlaneValue',
    type: 'PlaneValue | undefined',
    defaultValue: '{ x: 0.5, y: 0.5 }',
    description: 'The initial uncontrolled position. Coordinates are clamped.',
  },
  {
    name: 'onValueChange',
    shortType: 'function',
    type: '(value: PlaneValue, details: PlaneValueChangeDetails) => void',
    description:
      'Called for each distinct value produced by pointer or keyboard input.',
  },
  {
    name: 'onValueCommit',
    shortType: 'function',
    type: '(value: PlaneValue, details: PlaneValueChangeDetails) => void',
    description:
      "Called when this thumb's pointer or keyboard interaction completes.",
  },
  {
    name: 'disabled',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'false',
    description: 'Prevents changes and disables both axis inputs.',
  },
  {
    name: 'readOnly',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'false',
    description:
      'Prevents changes while keeping both axis inputs available to assistive technology.',
  },
  {
    name: 'aria-label',
    type: 'string | undefined',
    shortType: 'string',
    description: 'Names the thumb and derives both axis names.',
  },
  {
    name: 'xAriaLabel',
    type: 'string | undefined',
    shortType: 'string',
    defaultValue: "'Horizontal position'",
    description: 'Overrides the corresponding aria-label axis name.',
  },
  {
    name: 'yAriaLabel',
    type: 'string | undefined',
    shortType: 'string',
    defaultValue: "'Vertical position'",
    description: 'Overrides the corresponding aria-label axis name.',
  },
  {
    name: 'getAriaValueText',
    type: '(value: PlaneValue) => string',
    shortType: 'function',
    defaultValue: 'percentage-based position',
    description: "Formats the thumb's 2D position for assistive technology.",
  },
  {
    name: 'step',
    type: 'number | undefined',
    shortType: 'number',
    defaultValue: '0.01',
    description: 'The unmodified arrow-key increment.',
  },
  {
    name: 'smallStep',
    type: 'number | undefined',
    shortType: 'number',
    defaultValue: '0.001',
    description: 'The Alt/Option + Arrow increment.',
  },
  {
    name: 'largeStep',
    type: 'number | undefined',
    shortType: 'number',
    defaultValue: '0.1',
    description: 'The Shift+Arrow and Page Up or Page Down increment.',
  },
  {
    name: 'xName',
    type: 'string | undefined',
    shortType: 'string',
    description: "The horizontal range input's form field name.",
  },
  {
    name: 'yName',
    type: 'string | undefined',
    shortType: 'string',
    description: "The vertical range input's form field name.",
  },
  {
    name: 'form',
    type: 'string | undefined',
    shortType: 'string',
    description: 'The ID of the form associated with both axis inputs.',
  },
] satisfies readonly PropReference[];

export function PlaneDocsPage() {
  return (
    <MarkdownDocsPage
      slots={{
        'demo:basic': (
          <DocsExample code={basicExampleCode} label="Normalized position">
            <PlaneExample />
          </DocsExample>
        ),
        'demo:multiple': (
          <DocsExample code={multipleThumbsExampleCode} label="Multiple thumbs">
            <MultipleThumbsExample />
          </DocsExample>
        ),
        'props:plane': <PropReferenceTable name="Plane" props={PLANE_PROPS} />,
        'props:plane-thumb': (
          <PropReferenceTable name="PlaneThumb" props={PLANE_THUMB_PROPS} />
        ),
      }}
      source={planeDocs}
    />
  );
}
