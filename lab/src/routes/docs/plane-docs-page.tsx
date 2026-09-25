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
    name: 'dragBehavior',
    shortType: "'absolute' | 'relative'",
    type: 'PlaneDragBehavior | undefined',
    defaultValue: "'absolute'",
    description:
      'Absolute movement places the selected thumb at the pointer. Relative movement preserves its starting offset and applies the pointer drag distance.',
  },
  {
    name: 'dragSensitivity',
    shortType: 'number',
    type: 'number | undefined',
    defaultValue: '1',
    description:
      'Scales pointer distance during relative dragging. Smaller values provide finer control.',
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
    name: 'pressBehavior',
    shortType: "'inherit' | 'none'",
    type: 'PlaneThumbPressBehavior | undefined',
    defaultValue: "'inherit'",
    description:
      'Inherit makes the thumb eligible for empty-space presses. None requires a direct press while preserving keyboard interaction.',
  },
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
    description:
      'The controlled plane position, or signed parent-relative offset for a nested thumb.',
  },
  {
    name: 'defaultValue',
    shortType: 'PlaneValue',
    type: 'PlaneValue | undefined',
    defaultValue: 'Top-level: { x: 0.5, y: 0.5 }; nested: { x: 0, y: 0 }',
    description:
      'The initial uncontrolled position. Top-level coordinates clamp to 0–1; nested offsets clamp to -1–1 in plane units.',
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

const PLANE_ATTACHMENT_PROPS = [
  {
    name: 'side',
    shortType:
      "'top' | 'bottom' | 'left' | 'right' | 'inline-start' | 'inline-end'",
    type: 'Popover.Positioner.Props["side"]',
    defaultValue: "'right'",
    description:
      'Preferred side of the parent thumb. Collision handling may flip it.',
  },
  {
    name: 'align',
    shortType: "'start' | 'center' | 'end'",
    type: 'Popover.Positioner.Props["align"]',
    defaultValue: "'center'",
    description: 'Alignment along the selected side.',
  },
  {
    name: 'sideOffset',
    shortType: 'number | function',
    type: 'Popover.Positioner.Props["sideOffset"]',
    defaultValue: '8',
    description: 'Distance from the thumb in pixels.',
  },
  {
    name: 'alignOffset',
    shortType: 'number | function',
    type: 'Popover.Positioner.Props["alignOffset"]',
    defaultValue: '0',
    description: 'Offset along the alignment axis in pixels.',
  },
  {
    name: 'collisionBoundary',
    shortType: 'Boundary',
    type: 'Popover.Positioner.Props["collisionBoundary"]',
    defaultValue: 'clipping ancestors',
    description: 'Boundary used to detect collisions with the attachment.',
  },
  {
    name: 'collisionPadding',
    shortType: 'number | object',
    type: 'Popover.Positioner.Props["collisionPadding"]',
    defaultValue: '8',
    description: 'Space to preserve inside the collision boundary.',
  },
  {
    name: 'collisionAvoidance',
    shortType: 'object',
    type: 'Popover.Positioner.Props["collisionAvoidance"]',
    defaultValue: "{ side: 'flip', align: 'shift' }",
    description: 'Controls how placement responds to collisions.',
  },
  {
    name: 'positionMethod',
    shortType: "'absolute' | 'fixed'",
    type: 'Popover.Positioner.Props["positionMethod"]',
    defaultValue: "'absolute'",
    description: 'CSS positioning method for the attachment.',
  },
  {
    name: 'portal',
    shortType: 'boolean',
    type: 'boolean | undefined',
    defaultValue: 'true',
    description: 'Portals the attachment so it can escape plane clipping.',
  },
  {
    name: 'container',
    shortType: 'HTMLElement | ShadowRoot | ref',
    type: 'Popover.Portal.Props["container"]',
    defaultValue: 'document.body',
    description: 'Portal destination. Only applies when portal is true.',
  },
  {
    name: 'visibility',
    shortType: "'always' | 'hover' | 'focus-within'",
    type: "'always' | 'hover' | 'focus-within' | undefined",
    defaultValue: "'always'",
    description:
      'Shows continuously, while hovered or focused within, or only while focused within. Includes the attachment content.',
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
        'props:plane-attachment': (
          <PropReferenceTable
            name="PlaneAttachment"
            props={PLANE_ATTACHMENT_PROPS}
          />
        ),
      }}
      source={planeDocs}
    />
  );
}
