import { DocsExample } from './docs-example.js';
import { ControlFieldBasicExample } from './examples/control-field-basic-example.js';
import controlFieldBasicCode from './examples/control-field-basic-example.tsx?raw';
import { ControlFieldExpressionExample } from './examples/control-field-expression-example.js';
import controlFieldExpressionCode from './examples/control-field-expression-example.tsx?raw';
import { MarkdownDocsPage } from './markdown-docs-page.js';
import {
  PropReferenceTable,
  type PropReference,
} from './prop-reference-table.js';
import controlFieldDocs from './control-field.md?raw';

const ROOT_PROPS = [
  {
    name: 'value',
    type: 'number | null | undefined',
    description: 'The controlled numeric value.',
  },
  {
    name: 'defaultValue',
    type: 'number | null | undefined',
    defaultValue: 'null',
    description: 'The initial value when the field is uncontrolled.',
  },
  {
    name: 'onValueChange',
    type: '(value: number | null, details: ControlFieldValueChangeDetails) => void',
    shortType: 'function',
    description:
      'Called whenever an interaction or expression changes the value.',
  },
  {
    name: 'onValueCommitted',
    type: '(value: number | null, details: ControlFieldValueCommitDetails) => void',
    shortType: 'function',
    description:
      'Called when an interaction or expression commits its final value.',
  },
  {
    name: 'expressionResolver',
    type: 'ControlFieldExpressionResolver | null | undefined',
    shortType: 'function | null',
    defaultValue: 'resolveControlFieldExpression',
    description:
      'Resolves a non-numeric draft. Set to null for numeric-only entry.',
  },
  {
    name: 'pageStep',
    type: 'number | undefined',
    shortType: 'number',
    defaultValue: '10',
    description: 'The amount added or removed by Page Up and Page Down.',
  },
  {
    name: 'boundaryBehavior',
    type: "'clamp' | 'wrap' | undefined",
    shortType: "'clamp' | 'wrap'",
    defaultValue: "'clamp'",
    description:
      'Clamps interactive changes to the bounds or cycles them across the range.',
  },
  {
    name: 'min',
    type: 'number | undefined',
    description: 'The minimum value and lower validation bound.',
  },
  {
    name: 'max',
    type: 'number | undefined',
    description: 'The maximum value and upper validation bound.',
  },
  {
    name: 'step',
    type: "number | 'any' | undefined",
    shortType: "number | 'any'",
    defaultValue: '1',
    description: 'The amount used by ordinary stepping and scrubbing.',
  },
  {
    name: 'smallStep',
    type: 'number | undefined',
    defaultValue: '0.1',
    description: 'The amount used while Alt is held during a step interaction.',
  },
  {
    name: 'largeStep',
    type: 'number | undefined',
    defaultValue: '10',
    description:
      'The amount used while Shift is held during a step interaction.',
  },
  {
    name: 'format',
    type: 'Intl.NumberFormatOptions | undefined',
    shortType: 'Intl.NumberFormatOptions',
    description: 'Formats the value displayed by the input.',
  },
  {
    name: 'locale',
    type: 'Intl.LocalesArgument | undefined',
    shortType: 'Intl.LocalesArgument',
    description:
      "Sets number parsing and formatting locale. Defaults to the user's runtime locale.",
  },
  {
    name: 'allowWheelScrub',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'false',
    description: 'Allows wheel scrubbing while the focused input is hovered.',
  },
  {
    name: 'snapOnStep',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'false',
    description: 'Snaps stepped values to the nearest step multiple.',
  },
] satisfies readonly PropReference[];

const GROUP_PROPS = [
  {
    name: 'className',
    type: 'string | ((state: NumberField.Group.State) => string | undefined) | undefined',
    shortType: 'string | function',
    description: 'Adds classes to the compact value surface.',
  },
  {
    name: 'render',
    type: 'React.ReactElement | ((props, state) => React.ReactElement) | undefined',
    shortType: 'ReactElement | function',
    description: 'Replaces the rendered div while preserving group behavior.',
  },
] satisfies readonly PropReference[];

const SCRUB_AREA_PROPS = [
  {
    name: 'direction',
    type: "'horizontal' | 'vertical' | undefined",
    shortType: "'horizontal' | 'vertical'",
    defaultValue: "'horizontal'",
    description: 'Sets the pointer movement direction used for scrubbing.',
  },
  {
    name: 'pixelSensitivity',
    type: 'number | undefined',
    defaultValue: '2',
    description:
      'Sets how many pointer pixels are required for each value step.',
  },
  {
    name: 'teleportDistance',
    type: 'number | undefined',
    description:
      'Loops the pointer after it moves this far from the scrub area center.',
  },
  {
    name: 'render',
    type: 'React.ReactElement | ((props, state) => React.ReactElement) | undefined',
    shortType: 'ReactElement | function',
    description: 'Replaces the rendered span while preserving scrub behavior.',
  },
] satisfies readonly PropReference[];

const SCRUB_CURSOR_PROPS = [
  {
    name: 'className',
    type: 'string | ((state: NumberField.ScrubAreaCursor.State) => string | undefined) | undefined',
    shortType: 'string | function',
    description: 'Adds classes to the optional scrub cursor.',
  },
  {
    name: 'render',
    type: 'React.ReactElement | ((props, state) => React.ReactElement) | undefined',
    shortType: 'ReactElement | function',
    description: 'Replaces the rendered span while preserving cursor state.',
  },
] satisfies readonly PropReference[];

const INPUT_PROPS = [
  {
    name: 'aria-label',
    type: 'string | undefined',
    description: 'Names a standalone compact input without a visible label.',
  },
  {
    name: 'className',
    type: 'string | ((state: NumberField.Input.State) => string | undefined) | undefined',
    shortType: 'string | function',
    description: 'Adds classes to the input.',
  },
  {
    name: 'render',
    type: 'React.ReactElement | ((props, state) => React.ReactElement) | undefined',
    shortType: 'ReactElement | function',
    description:
      'Replaces the native input while preserving number-field behavior.',
  },
] satisfies readonly PropReference[];

const AFFIX_PROPS = [
  {
    name: 'children',
    type: 'React.ReactNode',
    description: 'Renders optional unit or status content.',
  },
  {
    name: 'className',
    type: 'string | undefined',
    description: 'Adds classes to the rendered span.',
  },
] satisfies readonly PropReference[];

const BUTTON_PROPS = [
  {
    name: 'disabled',
    type: 'boolean | undefined',
    defaultValue: 'false',
    description: 'Prevents the button from changing the value.',
  },
  {
    name: 'className',
    type: 'string | ((state: NumberField.Root.State) => string | undefined) | undefined',
    shortType: 'string | function',
    description: 'Adds classes to the rendered button.',
  },
  {
    name: 'render',
    type: 'React.ReactElement | ((props, state) => React.ReactElement) | undefined',
    shortType: 'ReactElement | function',
    description: 'Replaces the native button while preserving step behavior.',
  },
] satisfies readonly PropReference[];

const LABEL_PROPS = [
  {
    name: 'children',
    type: 'React.ReactNode',
    description: 'Renders the visible field label.',
  },
  {
    name: 'nativeLabel',
    type: 'boolean | undefined',
    defaultValue: 'true',
    description:
      'Keeps native label behavior when the element is replaced with render.',
  },
  {
    name: 'render',
    type: 'React.ReactElement | ((props, state) => React.ReactElement) | undefined',
    shortType: 'ReactElement | function',
    description:
      'Replaces the rendered label while preserving field association.',
  },
] satisfies readonly PropReference[];

const DESCRIPTION_PROPS = [
  {
    name: 'children',
    type: 'React.ReactNode',
    description: 'Renders supplemental field guidance.',
  },
  {
    name: 'render',
    type: 'React.ReactElement | ((props, state) => React.ReactElement) | undefined',
    shortType: 'ReactElement | function',
    description:
      'Replaces the rendered paragraph while preserving field association.',
  },
] satisfies readonly PropReference[];

const ERROR_PROPS = [
  {
    name: 'children',
    type: 'React.ReactNode',
    description: 'Renders the validation error message.',
  },
  {
    name: 'match',
    type: 'boolean | keyof ValidityState | undefined',
    shortType: 'boolean | ValidityState key',
    description: 'Controls which validity state displays the error.',
  },
  {
    name: 'render',
    type: 'React.ReactElement | ((props, state) => React.ReactElement) | undefined',
    shortType: 'ReactElement | function',
    description: 'Replaces the rendered div while preserving validation state.',
  },
] satisfies readonly PropReference[];

export function ControlFieldDocsPage() {
  return (
    <MarkdownDocsPage
      format="component"
      slots={{
        'demo:basic': (
          <DocsExample code={controlFieldBasicCode} label="Control Field">
            <ControlFieldBasicExample />
          </DocsExample>
        ),
        'demo:expression': (
          <DocsExample
            code={controlFieldExpressionCode}
            label="Control Field expressions"
          >
            <ControlFieldExpressionExample />
          </DocsExample>
        ),
        'props:control-field-root': (
          <PropReferenceTable name="ControlField.Root" props={ROOT_PROPS} />
        ),
        'props:control-field-group': (
          <PropReferenceTable name="ControlField.Group" props={GROUP_PROPS} />
        ),
        'props:control-field-scrub-area': (
          <PropReferenceTable
            name="ControlField.ScrubArea"
            props={SCRUB_AREA_PROPS}
          />
        ),
        'props:control-field-scrub-area-cursor': (
          <PropReferenceTable
            name="ControlField.ScrubAreaCursor"
            props={SCRUB_CURSOR_PROPS}
          />
        ),
        'props:control-field-input': (
          <PropReferenceTable name="ControlField.Input" props={INPUT_PROPS} />
        ),
        'props:control-field-affix': (
          <PropReferenceTable name="ControlField.Affix" props={AFFIX_PROPS} />
        ),
        'props:control-field-increment': (
          <PropReferenceTable
            name="ControlField.Increment"
            props={BUTTON_PROPS}
          />
        ),
        'props:control-field-decrement': (
          <PropReferenceTable
            name="ControlField.Decrement"
            props={BUTTON_PROPS}
          />
        ),
        'props:control-field-label': (
          <PropReferenceTable name="ControlField.Label" props={LABEL_PROPS} />
        ),
        'props:control-field-description': (
          <PropReferenceTable
            name="ControlField.Description"
            props={DESCRIPTION_PROPS}
          />
        ),
        'props:control-field-error': (
          <PropReferenceTable name="ControlField.Error" props={ERROR_PROPS} />
        ),
      }}
      source={controlFieldDocs}
    />
  );
}
