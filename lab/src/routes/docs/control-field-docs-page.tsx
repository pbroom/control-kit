import { DocsExample } from './docs-example.js';
import { ControlFieldBasicExample } from './examples/control-field-basic-example.js';
import controlFieldBasicCode from './examples/control-field-basic-example.tsx?raw';
import { ControlFieldExpressionExample } from './examples/control-field-expression-example.js';
import controlFieldExpressionCode from './examples/control-field-expression-example.tsx?raw';
import { ControlFieldFormattingExample } from './examples/control-field-formatting-example.js';
import controlFieldFormattingCode from './examples/control-field-formatting-example.tsx?raw';
import { ControlFieldStatesExample } from './examples/control-field-states-example.js';
import controlFieldStatesCode from './examples/control-field-states-example.tsx?raw';
import { ControlFieldSteppersExample } from './examples/control-field-steppers-example.js';
import controlFieldSteppersCode from './examples/control-field-steppers-example.tsx?raw';
import { ControlFieldSteppingExample } from './examples/control-field-stepping-example.js';
import controlFieldSteppingCode from './examples/control-field-stepping-example.tsx?raw';
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
      'Called for every value change, including each parseable keystroke. Put expensive work in onValueCommitted.',
  },
  {
    name: 'onValueCommitted',
    type: '(value: number | null, details: ControlFieldValueCommitDetails) => void',
    shortType: 'function',
    description:
      'Called once per committed edit: Enter or blur after typing, each key step, an expression, a button press, or a scrub release.',
  },
  {
    name: 'onInvalidCommit',
    type: '(text: string, details: ControlFieldInvalidCommitDetails) => void',
    shortType: 'function',
    description:
      'Called when Enter or blur tries to commit text that does not parse. Enter keeps the draft editable; blur restores the value.',
  },
  {
    name: 'expressionResolver',
    type: 'ControlFieldExpressionResolver | null | undefined',
    shortType: 'function | null',
    defaultValue: 'resolveControlFieldExpression',
    description:
      'Resolves a non-numeric draft. Receives the current value, the last committed value (startValue), and the range. Set to null for numeric-only entry.',
  },
  {
    name: 'pageStep',
    type: 'number | undefined',
    shortType: 'number',
    defaultValue: 'largeStep',
    description: 'The amount added or removed by Page Up and Page Down.',
  },
  {
    name: 'boundaryBehavior',
    type: "'clamp' | 'wrap' | 'free' | undefined",
    shortType: "'clamp' | 'wrap' | 'free'",
    defaultValue: "'clamp'",
    description:
      'Clamps changes to the bounds, cycles them across the range, or lets typed, keyboard, and scrub values leave the range while min and max still describe it.',
  },
  {
    name: 'precision',
    type: 'number | undefined',
    shortType: 'number',
    description:
      'Fraction digits shown when format is not set. Only the display is rounded; values keep full precision.',
  },
  {
    name: 'trimTrailingZeros',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'true',
    description: 'Drops trailing zeros from the precision-derived format.',
  },
  {
    name: 'selectOnFocus',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'false',
    description: 'Selects the input text when it receives focus.',
  },
  {
    name: 'commitOnBlur',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'true',
    description:
      'Commits typed text on blur. When false, blur restores the last committed value.',
  },
  {
    name: 'arrowKeys',
    type: "'vertical' | 'both' | undefined",
    shortType: "'vertical' | 'both'",
    defaultValue: "'vertical'",
    description:
      'Steps with Up and Down only, or also with Right and Left. Vertical keeps horizontal arrows for the caret.',
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
    description:
      'Formats the value displayed by the input. Overrides precision. Rounding options round typed values on commit but never controlled, stepped, or scrubbed values.',
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
    name: 'pixelsPerStep',
    type: 'number | undefined',
    defaultValue: '1',
    description: 'Horizontal pointer pixels per step of movement.',
  },
  {
    name: 'stepDistance',
    type: 'number | undefined',
    description:
      'Moves in whole steps, one per stepDistance pixels. Overrides pixelsPerStep.',
  },
  {
    name: 'threshold',
    type: 'number | undefined',
    defaultValue: '1',
    description: 'Pointer pixels required before scrubbing starts.',
  },
  {
    name: 'commitThreshold',
    type: 'number | undefined',
    defaultValue: '0',
    description:
      'Minimum value change between onValueChange calls while dragging. The final value is always published on release.',
  },
  {
    name: 'maxCommitRate',
    type: 'number | undefined',
    description: 'Maximum onValueChange calls per second while dragging.',
  },
  {
    name: 'pointerLock',
    type: 'boolean | undefined',
    defaultValue: 'false',
    description:
      'Locks the pointer while scrubbing so drags are not limited by the screen edge. Falls back to ordinary tracking when unavailable.',
  },
  {
    name: 'onScrubbingChange',
    type: '((isScrubbing: boolean) => void) | undefined',
    shortType: 'function',
    description: 'Reports when scrubbing starts and ends.',
  },
  {
    name: 'className',
    type: 'string | ((state: ControlFieldScrubAreaState) => string | undefined) | undefined',
    shortType: 'string | function',
    description: 'Adds classes to the scrub target.',
  },
] satisfies readonly PropReference[];

const SCRUB_CURSOR_PROPS = [
  {
    name: 'className',
    type: 'string | ((state: ControlFieldScrubAreaState) => string) | undefined',
    shortType: 'string | function',
    description:
      'Deprecated. The part renders nothing and ignores its props; remove it from compositions.',
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
        'demo:stepping': (
          <DocsExample
            code={controlFieldSteppingCode}
            label="Control Field stepping and bounds"
          >
            <ControlFieldSteppingExample />
          </DocsExample>
        ),
        'demo:formatting': (
          <DocsExample
            code={controlFieldFormattingCode}
            label="Formatted Control Fields"
          >
            <ControlFieldFormattingExample />
          </DocsExample>
        ),
        'demo:steppers': (
          <DocsExample
            code={controlFieldSteppersCode}
            label="Control Field stepper buttons"
          >
            <ControlFieldSteppersExample />
          </DocsExample>
        ),
        'demo:states': (
          <DocsExample
            code={controlFieldStatesCode}
            label="Control Field states and field composition"
          >
            <ControlFieldStatesExample />
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
