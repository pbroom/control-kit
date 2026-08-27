import { useState } from 'react';
import { Plane, PlaneThumb, type PlaneValue } from '@color-kit/control-kit';
import { MarkdownDocsPage } from './markdown-docs-page.js';
import {
  PropReferenceTable,
  type PropReference,
} from './prop-reference-table.js';
import planeDocs from './plane.md?raw';

const INITIAL_VALUE: PlaneValue = { x: 0.5, y: 0.5 };

const INITIAL_POINTS = [
  { id: 'top-left', value: { x: 0.25, y: 0.75 } },
  { id: 'top-right', value: { x: 0.75, y: 0.75 } },
  { id: 'bottom-left', value: { x: 0.25, y: 0.25 } },
  { id: 'bottom-right', value: { x: 0.75, y: 0.25 } },
] satisfies Array<{ id: string; value: PlaneValue }>;

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

function formatPosition(value: PlaneValue) {
  return `${Math.round(value.x * 100)}% horizontal, ${Math.round(value.y * 100)}% vertical`;
}

function PlaneDocsDemo() {
  const [value, setValue] = useState(INITIAL_VALUE);

  return (
    <div className="flex min-h-[440px] flex-col items-center justify-center gap-5 p-8 max-sm:min-h-[360px] max-sm:p-5">
      <Plane
        aria-label="Normalized position"
        className="size-[300px] rounded-2xl border border-white/10 bg-[#171718] max-sm:size-[240px]"
      >
        <PlaneThumb
          className="size-6 border-white/30 bg-white shadow-none"
          getAriaValueText={formatPosition}
          onValueChange={setValue}
          largeStep={0.1}
          step={0.01}
          value={value}
          xAriaLabel="Horizontal position"
          yAriaLabel="Vertical position"
        >
          <span
            aria-hidden="true"
            className="size-3 rounded-full bg-[#171717]"
          />
        </PlaneThumb>
      </Plane>
      <output className="font-mono text-[11px] text-white/48">
        X {value.x.toFixed(2)} · Y {value.y.toFixed(2)}
      </output>
    </div>
  );
}

function PlaneMultipleThumbsDemo() {
  const [points, setPoints] = useState(INITIAL_POINTS);

  return (
    <div className="flex min-h-[440px] flex-col items-center justify-center gap-5 p-8 max-sm:min-h-[360px] max-sm:p-5">
      <Plane
        pressBehavior="nearest"
        aria-label="Mesh control points"
        className="size-[300px] rounded-2xl border border-white/10 bg-[#171718] max-sm:size-[240px]"
      >
        {points.map((point, index) => (
          <PlaneThumb
            key={point.id}
            thumbId={point.id}
            aria-label={`Control point ${index + 1}`}
            className="size-6 border-white/30 bg-white font-mono text-[10px] shadow-none"
            value={point.value}
            onValueChange={(value) => {
              setPoints((current) =>
                current.map((item) =>
                  item.id === point.id ? { ...item, value } : item,
                ),
              );
            }}
          >
            {index + 1}
          </PlaneThumb>
        ))}
      </Plane>
      <p className="text-sm text-white/48">
        Press empty space to move the nearest point.
      </p>
    </div>
  );
}

export function PlaneDocsPage() {
  return (
    <MarkdownDocsPage
      slots={{
        'demo:basic': <PlaneDocsDemo />,
        'demo:multiple': <PlaneMultipleThumbsDemo />,
        'props:plane': <PropReferenceTable name="Plane" props={PLANE_PROPS} />,
        'props:plane-thumb': (
          <PropReferenceTable name="PlaneThumb" props={PLANE_THUMB_PROPS} />
        ),
      }}
      source={planeDocs}
    />
  );
}
