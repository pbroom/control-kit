import { DocsExample } from './docs-example.js';
import { SelectBasicExample } from './examples/select-basic-example.js';
import selectBasicExampleCode from './examples/select-basic-example.tsx?raw';
import { SelectBehaviorExample } from './examples/select-behavior-example.js';
import selectBehaviorExampleCode from './examples/select-behavior-example.tsx?raw';
import { SelectLongListExample } from './examples/select-long-list-example.js';
import selectLongListExampleCode from './examples/select-long-list-example.tsx?raw';
import { SelectPlacementExample } from './examples/select-placement-example.js';
import selectPlacementExampleCode from './examples/select-placement-example.tsx?raw';
import { MarkdownDocsPage } from './markdown-docs-page.js';
import {
  PropReferenceTable,
  type PropReference,
} from './prop-reference-table.js';
import selectDocs from './select.md?raw';

const SELECT_TRIGGER_LAB_PROPS = [
  {
    name: 'disabled',
    shortType: 'boolean',
    type: 'boolean | undefined',
    defaultValue: 'false',
    description: 'Prevents the trigger from opening the menu.',
  },
  {
    name: 'type',
    shortType: "'button' | 'submit' | 'reset'",
    type: "React.ButtonHTMLAttributes<HTMLButtonElement>['type']",
    defaultValue: "'button'",
    description: "Sets the native button's submission behavior.",
  },
] satisfies readonly PropReference[];

const SELECT_LIST_LAB_PROPS = [
  {
    name: 'value',
    shortType: 'string',
    type: 'string | undefined',
    description: 'The currently selected item value.',
  },
  {
    name: 'onValueChange',
    shortType: 'function',
    type: '(value: string) => void',
    description: 'Receives the value selected by an item.',
  },
  {
    name: 'closeOnSelect',
    shortType: 'boolean',
    type: 'boolean | undefined',
    defaultValue: 'true',
    description: 'Closes the surrounding menu after an item is selected.',
  },
  {
    name: 'openAlignment',
    shortType: "'selected' | 'none'",
    type: 'SelectListOpenAlignment | undefined',
    defaultValue: "'selected'",
    description:
      'Aligns the selected row with the trigger when the list opens, or keeps the normal anchored position.',
  },
] satisfies readonly PropReference[];

const SELECT_LIST_ITEM_LAB_PROPS = [
  {
    name: 'value',
    shortType: 'string',
    type: 'string',
    description: 'Identifies the value selected by this row.',
    required: true,
  },
  {
    name: 'disabled',
    shortType: 'boolean',
    type: 'boolean | undefined',
    defaultValue: 'false',
    description: 'Prevents the row from being highlighted or selected.',
  },
  {
    name: 'onSelect',
    shortType: 'function',
    type: 'React.MouseEventHandler<HTMLElement> | undefined',
    description:
      'Runs before the list value changes. Prevent the event to cancel selection.',
  },
  {
    name: 'typeaheadLabel',
    shortType: 'string',
    type: 'string | undefined',
    defaultValue: 'visible item text',
    description: 'Overrides the text used by keyboard typeahead.',
  },
  {
    name: 'density',
    shortType: "'compact' | 'comfortable'",
    type: 'LabMenuDensity | undefined',
    defaultValue: "'compact'",
    description: 'Selects compact or comfortable item height.',
  },
  {
    name: 'variant',
    shortType: "'default' | 'ui3'",
    type: 'LabMenuVariant | undefined',
    defaultValue: "'ui3'",
    description: 'Selects the item visual treatment.',
  },
] satisfies readonly PropReference[];

const SELECT_CONTENT_POSITION_PROPS = [
  {
    name: 'side',
    shortType:
      "'top' | 'right' | 'bottom' | 'left' | 'inline-start' | 'inline-end'",
    type: 'Side | undefined',
    defaultValue: "'bottom'",
    description: 'Places the option list on a side of the trigger.',
  },
  {
    name: 'align',
    shortType: "'start' | 'center' | 'end'",
    type: 'Align | undefined',
    defaultValue: "'center'",
    description: 'Aligns the option list along the selected side.',
  },
  {
    name: 'sideOffset',
    shortType: 'number',
    type: 'number | undefined',
    defaultValue: '4',
    description: 'Adds space in pixels between the trigger and option list.',
  },
  {
    name: 'collisionAvoidance',
    shortType: 'CollisionAvoidance',
    type: "UseAnchorPositioningSharedParameters['collisionAvoidance']",
    description: 'Configures viewport and boundary collision handling.',
  },
  {
    name: 'collisionPadding',
    shortType: 'Padding',
    type: "UseAnchorPositioningSharedParameters['collisionPadding']",
    defaultValue: '5',
    description: 'Adds space between the option list and collision boundary.',
  },
  {
    name: 'sticky',
    shortType: 'boolean',
    type: 'boolean | undefined',
    defaultValue: 'false',
    description: 'Keeps the option list within its collision boundary.',
  },
] satisfies readonly PropReference[];

export function SelectDocsPage() {
  return (
    <MarkdownDocsPage
      format="component"
      slots={{
        'demo:basic': (
          <DocsExample code={selectBasicExampleCode} label="Select">
            <SelectBasicExample />
          </DocsExample>
        ),
        'demo:long-list': (
          <DocsExample
            code={selectLongListExampleCode}
            label="Long select list"
          >
            <SelectLongListExample />
          </DocsExample>
        ),
        'demo:placement': (
          <DocsExample
            code={selectPlacementExampleCode}
            label="Select placement"
          >
            <SelectPlacementExample />
          </DocsExample>
        ),
        'demo:behavior': (
          <DocsExample
            code={selectBehaviorExampleCode}
            label="Select list behavior"
          >
            <SelectBehaviorExample />
          </DocsExample>
        ),
        'props:select-trigger': (
          <PropReferenceTable
            name="SelectTrigger Lab preview"
            props={SELECT_TRIGGER_LAB_PROPS}
          />
        ),
        'props:select-list': (
          <PropReferenceTable
            name="SelectList Lab preview"
            props={SELECT_LIST_LAB_PROPS}
          />
        ),
        'props:select-list-item': (
          <PropReferenceTable
            name="SelectListItem Lab preview"
            props={SELECT_LIST_ITEM_LAB_PROPS}
          />
        ),
        'props:select-content': (
          <PropReferenceTable
            name="Select content positioning"
            props={SELECT_CONTENT_POSITION_PROPS}
          />
        ),
      }}
      source={selectDocs}
    />
  );
}
