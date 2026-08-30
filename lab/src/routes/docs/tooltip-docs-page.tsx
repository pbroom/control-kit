import { DocsExample } from './docs-example.js';
import { TooltipExample } from './examples/tooltip-basic-example.js';
import tooltipExampleCode from './examples/tooltip-basic-example.tsx?raw';
import { TooltipContrastExample } from './examples/tooltip-contrast-example.js';
import tooltipContrastExampleCode from './examples/tooltip-contrast-example.tsx?raw';
import { TooltipDelayExample } from './examples/tooltip-delay-example.js';
import tooltipDelayExampleCode from './examples/tooltip-delay-example.tsx?raw';
import { TooltipPlacementExample } from './examples/tooltip-placement-example.js';
import tooltipPlacementExampleCode from './examples/tooltip-placement-example.tsx?raw';
import { TooltipPointerExample } from './examples/tooltip-pointer-example.js';
import tooltipPointerExampleCode from './examples/tooltip-pointer-example.tsx?raw';
import { MarkdownDocsPage } from './markdown-docs-page.js';
import {
  PropReferenceTable,
  type PropReference,
} from './prop-reference-table.js';
import tooltipDocs from './tooltip.md?raw';

const TOOLTIP_PROVIDER_PROPS = [
  {
    name: 'delay',
    type: 'number | undefined',
    shortType: 'number',
    defaultValue: '450',
    description: 'The initial hover delay in milliseconds.',
  },
  {
    name: 'closeDelay',
    type: 'number | undefined',
    shortType: 'number',
    description: 'The delay before an open tooltip closes, in milliseconds.',
  },
  {
    name: 'timeout',
    type: 'number | undefined',
    shortType: 'number',
    defaultValue: '300',
    description:
      'The handoff window in which an adjacent tooltip opens instantly, in milliseconds.',
  },
] satisfies readonly PropReference[];

const TOOLTIP_PROPS = [
  {
    name: 'open',
    type: 'boolean | undefined',
    shortType: 'boolean',
    description: 'The controlled open state.',
  },
  {
    name: 'defaultOpen',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'false',
    description: 'The initial open state in uncontrolled mode.',
  },
  {
    name: 'onOpenChange',
    shortType: 'function',
    type: '(open: boolean, eventDetails: TooltipRoot.ChangeEventDetails) => void',
    description: 'Called when the tooltip opens or closes.',
  },
  {
    name: 'disableHoverablePopup',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'false',
    description:
      'Controls whether the tooltip may remain open while its popup is hovered.',
  },
  {
    name: 'trackCursorAxis',
    type: "'none' | 'x' | 'y' | 'both' | undefined",
    shortType: "'none' | 'x' | 'y' | 'both'",
    defaultValue: "'none'",
    description: 'Selects the cursor axis followed by the positioned tooltip.',
  },
  {
    name: 'disabled',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'false',
    description: 'Prevents the tooltip from opening.',
  },
] satisfies readonly PropReference[];

const TOOLTIP_TRIGGER_PROPS = [
  {
    name: 'render',
    shortType: 'ReactElement | function',
    type: 'React.ReactElement | ComponentRenderFn<HTMLProps, TooltipTrigger.State> | undefined',
    description:
      'Replaces the default button or composes tooltip behavior onto another element.',
  },
  {
    name: 'delay',
    type: 'number | undefined',
    shortType: 'number',
    description: 'Overrides the provider hover delay for this trigger.',
  },
  {
    name: 'closeDelay',
    type: 'number | undefined',
    shortType: 'number',
    defaultValue: '0',
    description: 'Overrides the close delay for this trigger, in milliseconds.',
  },
  {
    name: 'closeOnClick',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'true',
    description: 'Controls whether clicking the trigger closes the tooltip.',
  },
  {
    name: 'disabled',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'false',
    description:
      'Prevents tooltip interaction without disabling the rendered trigger element.',
  },
] satisfies readonly PropReference[];

const TOOLTIP_CONTENT_PROPS = [
  {
    name: 'highContrast',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'true',
    description: 'Selects the solid inverse or surfaced visual treatment.',
  },
  {
    name: 'showPointer',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'true',
    description: 'Shows or hides the decorative pointer.',
  },
  {
    name: 'keepMounted',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'false',
    description:
      'Keeps the portal contents mounted while the tooltip is closed.',
  },
  {
    name: 'positionerClassName',
    type: 'string | undefined',
    shortType: 'string',
    description: 'Adds classes to the composed Base UI positioner.',
  },
  {
    name: 'side',
    type: "'top' | 'bottom' | 'left' | 'right' | 'inline-start' | 'inline-end' | undefined",
    shortType: 'Side',
    defaultValue: "'top'",
    description:
      'Sets the preferred side of the trigger. Collision handling may change it.',
  },
  {
    name: 'align',
    type: "'start' | 'center' | 'end' | undefined",
    shortType: 'Align',
    defaultValue: "'center'",
    description: 'Aligns the popup along the selected side.',
  },
  {
    name: 'sideOffset',
    type: 'number | OffsetFunction | undefined',
    shortType: 'number | function',
    defaultValue: '4',
    description: 'Offsets the popup from the trigger in pixels.',
  },
  {
    name: 'alignOffset',
    type: 'number | OffsetFunction | undefined',
    shortType: 'number | function',
    defaultValue: '0',
    description: 'Offsets the popup along its alignment axis in pixels.',
  },
  {
    name: 'collisionAvoidance',
    type: 'CollisionAvoidance | undefined',
    shortType: 'CollisionAvoidance',
    description:
      'Controls flipping, shifting, and fallback behavior when the preferred position overflows.',
  },
  {
    name: 'collisionPadding',
    type: 'number | { top?: number; right?: number; bottom?: number; left?: number } | undefined',
    shortType: 'Padding',
    defaultValue: '5',
    description:
      'Maintains space between the positioner and its collision boundary.',
  },
  {
    name: 'sticky',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'false',
    description:
      'Keeps the popup in view after its trigger scrolls outside the viewport.',
  },
  {
    name: 'className',
    type: 'string | ((state: TooltipPopup.State) => string | undefined) | undefined',
    shortType: 'string | function',
    description:
      'Adds classes to the popup, optionally from its current state.',
  },
] satisfies readonly PropReference[];

export function TooltipDocsPage() {
  return (
    <MarkdownDocsPage
      format="component"
      slots={{
        'demo:basic': (
          <DocsExample code={tooltipExampleCode} label="Tooltip">
            <TooltipExample />
          </DocsExample>
        ),
        'demo:contrast': (
          <DocsExample
            code={tooltipContrastExampleCode}
            label="Tooltip contrast"
          >
            <TooltipContrastExample />
          </DocsExample>
        ),
        'demo:delay': (
          <DocsExample
            code={tooltipDelayExampleCode}
            label="Tooltip delay and handoff"
          >
            <TooltipDelayExample />
          </DocsExample>
        ),
        'demo:placement': (
          <DocsExample
            code={tooltipPlacementExampleCode}
            label="Tooltip placement"
          >
            <TooltipPlacementExample />
          </DocsExample>
        ),
        'demo:pointer': (
          <DocsExample code={tooltipPointerExampleCode} label="Tooltip pointer">
            <TooltipPointerExample />
          </DocsExample>
        ),
        'props:tooltip-provider': (
          <PropReferenceTable
            name="TooltipProvider"
            props={TOOLTIP_PROVIDER_PROPS}
          />
        ),
        'props:tooltip': (
          <PropReferenceTable name="Tooltip" props={TOOLTIP_PROPS} />
        ),
        'props:tooltip-trigger': (
          <PropReferenceTable
            name="TooltipTrigger"
            props={TOOLTIP_TRIGGER_PROPS}
          />
        ),
        'props:tooltip-content': (
          <PropReferenceTable
            name="TooltipContent"
            props={TOOLTIP_CONTENT_PROPS}
          />
        ),
      }}
      source={tooltipDocs}
    />
  );
}
