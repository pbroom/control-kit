import { DocsExample } from './docs-example.js';
import { TooltipExample } from './examples/tooltip-basic-example.js';
import tooltipExampleCode from './examples/tooltip-basic-example.tsx?raw';
import { MarkdownDocsPage } from './markdown-docs-page.js';
import {
  PropReferenceTable,
  type PropReference,
} from './prop-reference-table.js';
import tooltipDocs from './tooltip.md?raw';

const PROVIDER_PROPS = [
  {
    name: 'delayDuration',
    type: 'number | undefined',
    shortType: 'number',
    defaultValue: '450',
    description: 'Sets the initial hover delay in milliseconds.',
  },
  {
    name: 'skipDelayDuration',
    type: 'number | undefined',
    shortType: 'number',
    defaultValue: '300',
    description: 'Sets the immediate-open handoff window in milliseconds.',
  },
  {
    name: 'disableHoverableContent',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'false',
    description: 'Closes content when the pointer leaves the trigger.',
  },
] satisfies readonly PropReference[];

const ROOT_PROPS = [
  {
    name: 'defaultOpen',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'false',
    description: 'Sets the initial uncontrolled open state.',
  },
  {
    name: 'open',
    type: 'boolean | undefined',
    shortType: 'boolean',
    description: 'Controls whether the tooltip is open.',
  },
  {
    name: 'onOpenChange',
    type: '(open: boolean) => void',
    shortType: 'function',
    description: 'Reports controlled and uncontrolled open-state changes.',
  },
  {
    name: 'delayDuration',
    type: 'number | undefined',
    shortType: 'number',
    defaultValue: 'provider value',
    description: 'Overrides the provider delay for this tooltip.',
  },
  {
    name: 'disableHoverableContent',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'provider value',
    description: 'Overrides hoverable-content behavior for this tooltip.',
  },
] satisfies readonly PropReference[];

const TRIGGER_PROPS = [
  {
    name: 'asChild',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'false',
    description: 'Composes trigger behavior onto the child element.',
  },
] satisfies readonly PropReference[];

const CONTENT_PROPS = [
  {
    name: 'asChild',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'false',
    description: 'Composes content behavior onto the child element.',
  },
  {
    name: 'aria-label',
    type: 'string | undefined',
    shortType: 'string',
    description: 'Overrides the accessible label of the tooltip content.',
  },
  {
    name: 'side',
    type: "'top' | 'right' | 'bottom' | 'left' | undefined",
    shortType: "'top' | 'right' | 'bottom' | 'left'",
    defaultValue: "'top'",
    description: 'Sets the preferred side of the trigger.',
  },
  {
    name: 'sideOffset',
    type: 'number | undefined',
    shortType: 'number',
    defaultValue: '4',
    description: 'Sets the distance from the trigger in pixels.',
  },
  {
    name: 'align',
    type: "'start' | 'center' | 'end' | undefined",
    shortType: "'start' | 'center' | 'end'",
    defaultValue: "'center'",
    description: 'Aligns content along the trigger.',
  },
  {
    name: 'alignOffset',
    type: 'number | undefined',
    shortType: 'number',
    defaultValue: '0',
    description: 'Offsets content along its alignment axis.',
  },
  {
    name: 'avoidCollisions',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'true',
    description: 'Adjusts placement to remain inside collision boundaries.',
  },
  {
    name: 'collisionPadding',
    type: 'number | Partial<Record<Side, number>> | undefined',
    shortType: 'number | object',
    defaultValue: '0',
    description: 'Adds padding around collision boundaries.',
  },
  {
    name: 'collisionBoundary',
    type: 'Element | null | Array<Element | null> | undefined',
    shortType: 'Element | Element[]',
    defaultValue: '[]',
    description: 'Sets the elements used as collision boundaries.',
  },
  {
    name: 'arrowPadding',
    type: 'number | undefined',
    shortType: 'number',
    defaultValue: '0',
    description: 'Keeps the pointer away from rounded content edges.',
  },
  {
    name: 'updatePositionStrategy',
    type: "'optimized' | 'always' | undefined",
    shortType: "'optimized' | 'always'",
    defaultValue: "'optimized'",
    description: 'Controls how often positioning updates during animation.',
  },
  {
    name: 'sticky',
    type: "'partial' | 'always' | undefined",
    shortType: "'partial' | 'always'",
    defaultValue: "'partial'",
    description: 'Controls how content remains aligned during collisions.',
  },
  {
    name: 'hideWhenDetached',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'false',
    description: 'Hides content when its trigger is fully occluded.',
  },
  {
    name: 'highContrast',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'true',
    description: 'Uses a solid inverse surface instead of a standard surface.',
  },
  {
    name: 'showPointer',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'true',
    description: 'Renders the decorative tooltip pointer.',
  },
  {
    name: 'forceMount',
    type: 'true | undefined',
    shortType: 'true',
    defaultValue: 'false',
    description:
      'Keeps Radix Content mounted after the wrapper portal is present; the portal itself still follows open state.',
  },
  {
    name: 'onEscapeKeyDown',
    type: '(event: KeyboardEvent) => void',
    shortType: 'function',
    description: 'Runs when Escape is pressed while content is open.',
  },
  {
    name: 'onPointerDownOutside',
    type: '(event: PointerDownOutsideEvent) => void',
    shortType: 'function',
    description: 'Runs when pointer down occurs outside the open content.',
  },
] satisfies readonly PropReference[];

export function TooltipDocsPage() {
  return (
    <MarkdownDocsPage
      slots={{
        'demo:basic': (
          <DocsExample code={tooltipExampleCode} label="Tooltip">
            <TooltipExample />
          </DocsExample>
        ),
        'props:tooltip-content': (
          <PropReferenceTable name="TooltipContent" props={CONTENT_PROPS} />
        ),
        'props:tooltip-provider': (
          <PropReferenceTable name="TooltipProvider" props={PROVIDER_PROPS} />
        ),
        'props:tooltip-root': (
          <PropReferenceTable name="Tooltip" props={ROOT_PROPS} />
        ),
        'props:tooltip-trigger': (
          <PropReferenceTable name="TooltipTrigger" props={TRIGGER_PROPS} />
        ),
      }}
      source={tooltipDocs}
    />
  );
}
