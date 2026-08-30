import { DocsExample } from './docs-example.js';
import { ToggleButtonBasicExample } from './examples/toggle-button-basic-example.js';
import toggleButtonBasicExampleCode from './examples/toggle-button-basic-example.tsx?raw';
import { ToggleButtonContentExample } from './examples/toggle-button-content-example.js';
import toggleButtonContentExampleCode from './examples/toggle-button-content-example.tsx?raw';
import { ToggleButtonDensityExample } from './examples/toggle-button-density-example.js';
import toggleButtonDensityExampleCode from './examples/toggle-button-density-example.tsx?raw';
import { ToggleButtonStatesExample } from './examples/toggle-button-states-example.js';
import toggleButtonStatesExampleCode from './examples/toggle-button-states-example.tsx?raw';
import { MarkdownDocsPage } from './markdown-docs-page.js';
import {
  PropReferenceTable,
  type PropReference,
} from './prop-reference-table.js';
import toggleButtonDocs from './toggle-button.md?raw';

const TOGGLE_BUTTON_LAB_PROPS = [
  {
    name: 'selected',
    shortType: 'boolean',
    type: 'boolean',
    description: 'Controls the on or off state in the current Lab preview.',
    required: true,
  },
  {
    name: 'onSelectedChange',
    shortType: 'function',
    type: '(selected: boolean) => void',
    description: 'Receives the next selected state after activation.',
    required: true,
  },
  {
    name: 'disabled',
    shortType: 'boolean',
    type: 'boolean',
    defaultValue: 'false',
    description: 'Applies native disabled behavior.',
    required: true,
  },
  {
    name: 'density',
    shortType: "'compact' | 'comfortable'",
    type: 'PrimitiveDensity',
    defaultValue: "'compact'",
    description: 'Selects compact or comfortable dimensions.',
    required: true,
  },
  {
    name: 'content',
    shortType: "'iconOnly' | 'iconLabel' | 'label'",
    type: 'ToggleButtonContent',
    defaultValue: "'iconLabel'",
    description: 'Shows an icon, an icon with a label, or a label.',
    required: true,
  },
  {
    name: 'label',
    shortType: 'string',
    type: 'string',
    defaultValue: "'Toggle button'",
    description:
      'Supplies visible text or the accessible name for icon-only content.',
    required: true,
  },
  {
    name: 'interactionState',
    shortType: "'default' | 'hovered' | 'pressedDown'",
    type: 'ToggleButtonInteractionState',
    defaultValue: "'default'",
    description:
      'Forces a transient visual state for Lab review; it is not a consumer interaction API.',
    required: true,
  },
] satisfies readonly PropReference[];

export function ToggleButtonDocsPage() {
  return (
    <MarkdownDocsPage
      format="component"
      slots={{
        'demo:basic': (
          <DocsExample
            code={toggleButtonBasicExampleCode}
            label="Toggle button"
          >
            <ToggleButtonBasicExample />
          </DocsExample>
        ),
        'demo:content': (
          <DocsExample
            code={toggleButtonContentExampleCode}
            label="Toggle button content"
          >
            <ToggleButtonContentExample />
          </DocsExample>
        ),
        'demo:states': (
          <DocsExample
            code={toggleButtonStatesExampleCode}
            label="Toggle button states"
          >
            <ToggleButtonStatesExample />
          </DocsExample>
        ),
        'demo:density': (
          <DocsExample
            code={toggleButtonDensityExampleCode}
            label="Toggle button density"
          >
            <ToggleButtonDensityExample />
          </DocsExample>
        ),
        'props:toggle-button': (
          <PropReferenceTable
            name="ToggleButton Lab preview"
            props={TOGGLE_BUTTON_LAB_PROPS}
          />
        ),
      }}
      source={toggleButtonDocs}
    />
  );
}
