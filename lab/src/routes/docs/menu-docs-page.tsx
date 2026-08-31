import { DocsExample } from './docs-example.js';
import { MenuBasicExample } from './examples/menu-basic-example.js';
import menuBasicExampleCode from './examples/menu-basic-example.tsx?raw';
import { MenuMinimalExample } from './examples/menu-minimal-example.js';
import menuMinimalExampleCode from './examples/menu-minimal-example.tsx?raw';
import { MenuPlacementExample } from './examples/menu-placement-example.js';
import menuPlacementExampleCode from './examples/menu-placement-example.tsx?raw';
import { MarkdownDocsPage } from './markdown-docs-page.js';
import {
  PropReferenceTable,
  type PropReference,
} from './prop-reference-table.js';
import menuDocs from './menu.md?raw';

const DROPDOWN_MENU_PROPS = [
  {
    name: 'open',
    shortType: 'boolean',
    type: 'boolean | undefined',
    description: 'Controls whether the menu is open.',
  },
  {
    name: 'defaultOpen',
    shortType: 'boolean',
    type: 'boolean | undefined',
    defaultValue: 'false',
    description: 'Sets the initial open state for an uncontrolled menu.',
  },
  {
    name: 'onOpenChange',
    shortType: 'function',
    type: '(open: boolean, eventDetails: MenuRoot.ChangeEventDetails) => void',
    description: 'Receives open-state changes and their interaction details.',
  },
  {
    name: 'modal',
    shortType: 'boolean',
    type: 'boolean | undefined',
    defaultValue: 'true',
    description: 'Limits outside interaction while the menu is open.',
  },
] satisfies readonly PropReference[];

const DROPDOWN_MENU_TRIGGER_PROPS = [
  {
    name: 'asChild',
    shortType: 'boolean',
    type: 'boolean | undefined',
    defaultValue: 'false',
    description:
      'Composes trigger behavior onto the single React element passed as children.',
  },
  {
    name: 'disabled',
    shortType: 'boolean',
    type: 'boolean | undefined',
    defaultValue: 'false',
    description: 'Prevents the trigger from opening the menu.',
  },
] satisfies readonly PropReference[];

const DROPDOWN_MENU_CONTENT_PROPS = [
  {
    name: 'variant',
    shortType: "'default' | 'ui3'",
    type: 'DropdownMenuVariant | undefined',
    defaultValue: "'default'",
    description: 'Selects the default or Control Kit UI3 surface treatment.',
  },
  {
    name: 'side',
    shortType:
      "'top' | 'right' | 'bottom' | 'left' | 'inline-start' | 'inline-end'",
    type: 'Side | undefined',
    defaultValue: "'bottom'",
    description: 'Places the popup on a side of the trigger.',
  },
  {
    name: 'align',
    shortType: "'start' | 'center' | 'end'",
    type: 'Align | undefined',
    defaultValue: "'center'",
    description: 'Aligns the popup along the selected side.',
  },
  {
    name: 'sideOffset',
    shortType: 'number | function',
    type: 'number | OffsetFunction | undefined',
    defaultValue: '4',
    description: 'Adds space between the trigger and popup.',
  },
  {
    name: 'collisionAvoidance',
    shortType: 'CollisionAvoidance',
    type: 'CollisionAvoidance | undefined',
    description: 'Configures popup collision handling.',
  },
  {
    name: 'collisionPadding',
    shortType: 'Padding',
    type: 'Padding | undefined',
    defaultValue: '5',
    description: 'Adds space between the popup and collision boundary.',
  },
  {
    name: 'sticky',
    shortType: 'boolean',
    type: 'boolean | undefined',
    defaultValue: 'false',
    description: 'Keeps the popup within its collision boundary.',
  },
] satisfies readonly PropReference[];

const DROPDOWN_MENU_ITEM_PROPS = [
  {
    name: 'variant',
    shortType: "'default' | 'ui3'",
    type: 'DropdownMenuVariant | undefined',
    defaultValue: "'default'",
    description: 'Selects the item visual treatment.',
  },
  {
    name: 'density',
    shortType: "'compact' | 'comfortable'",
    type: 'DropdownMenuDensity | undefined',
    defaultValue: "'compact'",
    description: 'Selects compact or comfortable item height.',
  },
  {
    name: 'disabled',
    shortType: 'boolean',
    type: 'boolean | undefined',
    defaultValue: 'false',
    description: 'Prevents the item from being highlighted or activated.',
  },
  {
    name: 'closeOnClick',
    shortType: 'boolean',
    type: 'boolean | undefined',
    defaultValue: 'true',
    description: 'Closes the menu when the item is activated.',
  },
  {
    name: 'onSelect',
    shortType: 'function',
    type: 'React.MouseEventHandler<HTMLElement> | undefined',
    description: 'Runs when the item is activated.',
  },
  {
    name: 'typeaheadLabel',
    shortType: 'string',
    type: 'string | undefined',
    defaultValue: 'label or textValue',
    description: 'Overrides the text used by the Lab typeahead controller.',
  },
] satisfies readonly PropReference[];

const DROPDOWN_MENU_CHECKBOX_ITEM_PROPS = [
  {
    name: 'checked',
    shortType: 'boolean',
    type: 'boolean | undefined',
    description: 'Controls whether the checkbox item is checked.',
  },
  {
    name: 'defaultChecked',
    shortType: 'boolean',
    type: 'boolean | undefined',
    defaultValue: 'false',
    description: 'Sets the initial checked state for an uncontrolled item.',
  },
  {
    name: 'onCheckedChange',
    shortType: 'function',
    type: '(checked: boolean, eventDetails: MenuCheckboxItem.ChangeEventDetails) => void',
    description: 'Receives checked-state changes.',
  },
  {
    name: 'closeOnClick',
    shortType: 'boolean',
    type: 'boolean | undefined',
    defaultValue: 'true',
    description: 'Closes the menu when the checkbox item is activated.',
  },
] satisfies readonly PropReference[];

const DROPDOWN_MENU_RADIO_GROUP_PROPS = [
  {
    name: 'value',
    shortType: 'any',
    type: 'any',
    description: 'Controls the selected radio-item value.',
  },
  {
    name: 'defaultValue',
    shortType: 'any',
    type: 'any',
    description: 'Sets the initial value for an uncontrolled radio group.',
  },
  {
    name: 'onValueChange',
    shortType: 'function',
    type: '(value: any, eventDetails: MenuRadioGroup.ChangeEventDetails) => void',
    description: 'Receives selected-value changes.',
  },
] satisfies readonly PropReference[];

const DROPDOWN_MENU_RADIO_ITEM_PROPS = [
  {
    name: 'value',
    shortType: 'any',
    type: 'any',
    description: 'The value selected when this radio item is activated.',
    required: true,
  },
  {
    name: 'disabled',
    shortType: 'boolean',
    type: 'boolean | undefined',
    defaultValue: 'false',
    description: 'Prevents the item from being highlighted or selected.',
  },
  {
    name: 'closeOnClick',
    shortType: 'boolean',
    type: 'boolean | undefined',
    defaultValue: 'true',
    description: 'Closes the menu when the radio item is activated.',
  },
] satisfies readonly PropReference[];

const DROPDOWN_MENU_SUB_PROPS = [
  {
    name: 'open',
    shortType: 'boolean',
    type: 'boolean | undefined',
    description: 'Controls whether the submenu is open.',
  },
  {
    name: 'defaultOpen',
    shortType: 'boolean',
    type: 'boolean | undefined',
    defaultValue: 'false',
    description: 'Sets the initial open state for an uncontrolled submenu.',
  },
  {
    name: 'onOpenChange',
    shortType: 'function',
    type: '(open: boolean, eventDetails: MenuSubmenuRoot.ChangeEventDetails) => void',
    description: 'Receives submenu open-state changes.',
  },
] satisfies readonly PropReference[];

const DROPDOWN_MENU_SUB_TRIGGER_PROPS = [
  {
    name: 'variant',
    shortType: "'default' | 'ui3'",
    type: 'DropdownMenuVariant | undefined',
    defaultValue: "'default'",
    description: 'Selects the submenu-trigger visual treatment.',
  },
  {
    name: 'density',
    shortType: "'compact' | 'comfortable'",
    type: 'DropdownMenuDensity | undefined',
    defaultValue: "'compact'",
    description: 'Selects compact or comfortable item height.',
  },
  {
    name: 'typeaheadLabel',
    shortType: 'string',
    type: 'string | undefined',
    defaultValue: 'textValue',
    description: 'Overrides the text used by the Lab typeahead controller.',
  },
  {
    name: 'showDefaultChevron',
    shortType: 'boolean',
    type: 'boolean | undefined',
    defaultValue: 'true for the default variant',
    description: 'Controls the wrapper-provided submenu chevron.',
  },
] satisfies readonly PropReference[];

const DROPDOWN_MENU_SUB_CONTENT_PROPS = DROPDOWN_MENU_CONTENT_PROPS.map(
  (prop) =>
    prop.name === 'side' || prop.name === 'align' || prop.name === 'sideOffset'
      ? { ...prop, defaultValue: undefined }
      : prop,
) satisfies readonly PropReference[];

export function MenuDocsPage() {
  return (
    <MarkdownDocsPage
      format="component"
      slots={{
        'demo:basic': (
          <DocsExample code={menuBasicExampleCode} label="Menu">
            <MenuBasicExample />
          </DocsExample>
        ),
        'demo:minimal': (
          <DocsExample code={menuMinimalExampleCode} label="Minimal menu">
            <MenuMinimalExample />
          </DocsExample>
        ),
        'demo:placement': (
          <DocsExample code={menuPlacementExampleCode} label="Menu placement">
            <MenuPlacementExample />
          </DocsExample>
        ),
        'props:dropdown-menu': (
          <PropReferenceTable name="DropdownMenu" props={DROPDOWN_MENU_PROPS} />
        ),
        'props:dropdown-menu-trigger': (
          <PropReferenceTable
            name="DropdownMenuTrigger"
            props={DROPDOWN_MENU_TRIGGER_PROPS}
          />
        ),
        'props:dropdown-menu-content': (
          <PropReferenceTable
            name="DropdownMenuContent"
            props={DROPDOWN_MENU_CONTENT_PROPS}
          />
        ),
        'props:dropdown-menu-item': (
          <PropReferenceTable
            name="DropdownMenuItem"
            props={DROPDOWN_MENU_ITEM_PROPS}
          />
        ),
        'props:dropdown-menu-checkbox-item': (
          <PropReferenceTable
            name="DropdownMenuCheckboxItem"
            props={DROPDOWN_MENU_CHECKBOX_ITEM_PROPS}
          />
        ),
        'props:dropdown-menu-radio-group': (
          <PropReferenceTable
            name="DropdownMenuRadioGroup"
            props={DROPDOWN_MENU_RADIO_GROUP_PROPS}
          />
        ),
        'props:dropdown-menu-radio-item': (
          <PropReferenceTable
            name="DropdownMenuRadioItem"
            props={DROPDOWN_MENU_RADIO_ITEM_PROPS}
          />
        ),
        'props:dropdown-menu-sub': (
          <PropReferenceTable
            name="DropdownMenuSub"
            props={DROPDOWN_MENU_SUB_PROPS}
          />
        ),
        'props:dropdown-menu-sub-trigger': (
          <PropReferenceTable
            name="DropdownMenuSubTrigger"
            props={DROPDOWN_MENU_SUB_TRIGGER_PROPS}
          />
        ),
        'props:dropdown-menu-sub-content': (
          <PropReferenceTable
            name="DropdownMenuSubContent"
            props={DROPDOWN_MENU_SUB_CONTENT_PROPS}
          />
        ),
      }}
      source={menuDocs}
    />
  );
}
