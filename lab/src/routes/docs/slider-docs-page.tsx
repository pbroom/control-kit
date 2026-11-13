import { DocsExample } from './docs-example.js';
import { SliderExample } from './examples/slider-basic-example.js';
import sliderExampleCode from './examples/slider-basic-example.tsx?raw';
import { SliderChannelsExample } from './examples/slider-channels-example.js';
import sliderChannelsExampleCode from './examples/slider-channels-example.tsx?raw';
import { SliderRangeExample } from './examples/slider-range-example.js';
import sliderRangeExampleCode from './examples/slider-range-example.tsx?raw';
import { SliderStylingExample } from './examples/slider-styling-example.js';
import sliderStylingExampleCode from './examples/slider-styling-example.tsx?raw';
import { SliderVerticalExample } from './examples/slider-vertical-example.js';
import sliderVerticalExampleCode from './examples/slider-vertical-example.tsx?raw';
import { MarkdownDocsPage } from './markdown-docs-page.js';
import {
  PropReferenceTable,
  type PropReference,
} from './prop-reference-table.js';
import sliderDocs from './slider.md?raw';

const SLIDER_PROPS = [
  {
    name: 'value',
    type: 'number | undefined',
    shortType: 'number',
    description: 'The controlled value. Update it from onValueChange.',
  },
  {
    name: 'defaultValue',
    type: 'number | undefined',
    shortType: 'number',
    description: 'The initial value in uncontrolled mode.',
  },
  {
    name: 'onValueChange',
    shortType: 'function',
    type: '(value: number, eventDetails: Slider.Root.ChangeEventDetails) => void',
    description:
      'Called for every change, including each step of a drag. Details carry the reason and native event.',
  },
  {
    name: 'onValueCommitted',
    shortType: 'function',
    type: '(value: number, eventDetails: Slider.Root.CommitEventDetails) => void',
    description:
      'Called once when a drag ends or a key changes the value. Use it for saving.',
  },
  {
    name: 'min',
    type: 'number | undefined',
    shortType: 'number',
    defaultValue: '0',
    description: 'The lowest value. It should not equal max.',
  },
  {
    name: 'max',
    type: 'number | undefined',
    shortType: 'number',
    defaultValue: '100',
    description: 'The highest value. It should not equal min.',
  },
  {
    name: 'step',
    type: 'number | undefined',
    shortType: 'number',
    defaultValue: '1',
    description: 'The increment for arrow keys and the grid values snap to.',
  },
  {
    name: 'largeStep',
    type: 'number | undefined',
    shortType: 'number',
    defaultValue: '10',
    description:
      'The increment for Page Up, Page Down, and Shift with an arrow.',
  },
  {
    name: 'orientation',
    type: "'horizontal' | 'vertical' | undefined",
    shortType: "'horizontal' | 'vertical'",
    defaultValue: "'horizontal'",
    description:
      'Sets the layout and arrow-key direction. Give a vertical slider an explicit height.',
  },
  {
    name: 'disabled',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'false',
    description: 'Prevents interaction and dims the slider.',
  },
  {
    name: 'unstyled',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'false',
    description:
      'Keeps interaction and positioning while dropping the default rail and thumb styles.',
  },
  {
    name: 'showIndicator',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'true',
    description: 'Renders the filled portion of the track.',
  },
  {
    name: 'controlProps',
    type: 'Slider.Control.Props | undefined',
    shortType: 'object',
    description:
      'Props for the control part, including className, style, and data attributes.',
  },
  {
    name: 'trackProps',
    type: 'Slider.Track.Props | undefined',
    shortType: 'object',
    description:
      'Props for the track part. Set a background here for a custom rail.',
  },
  {
    name: 'thumbProps',
    type: 'Slider.Thumb.Props | undefined',
    shortType: 'object',
    description: 'Props for the thumb part.',
  },
  {
    name: 'aria-label',
    type: 'string | undefined',
    shortType: 'string',
    description:
      'Names the slider. It is forwarded to the thumb input, as are aria-labelledby and aria-valuetext.',
  },
  {
    name: 'className',
    type: 'string | undefined',
    shortType: 'string',
    description: 'Adds classes to the root.',
  },
] satisfies readonly PropReference[];

const COLOR_VALUE_SLIDER_PROPS = SLIDER_PROPS.filter(
  (prop) => prop.name !== 'showIndicator',
);

const COLOR_SLIDER_PROPS = [
  {
    name: 'channel',
    shortType: "'l' | 'c' | 'h' | 'alpha'",
    type: 'ColorSliderChannel',
    description: 'Selects the color channel controlled by the slider.',
    required: true,
  },
  {
    name: 'requested',
    shortType: 'Color',
    type: 'Color | undefined',
    description:
      'The standalone requested color. Omit it when a Color ancestor owns the state.',
  },
  {
    name: 'onChangeRequested',
    shortType: 'function',
    type: '(requested: Color, options?: SetRequestedOptions) => void',
    description:
      'Receives standalone requested-color changes. Omit it when a Color ancestor owns the state.',
  },
  {
    name: 'range',
    shortType: '[number, number]',
    type: '[number, number] | undefined',
    defaultValue: 'channel-specific range',
    description:
      'Overrides the channel domain used by pointer, keyboard, and accessible values.',
  },
  {
    name: 'orientation',
    shortType: "'horizontal' | 'vertical'",
    type: 'ColorSliderOrientation | undefined',
    defaultValue: "'horizontal'",
    description: 'Sets the interaction direction and slider orientation.',
  },
  {
    name: 'aria-label',
    shortType: 'string',
    type: 'string | undefined',
    defaultValue: 'generated channel label',
    description: 'Overrides the generated channel-specific accessible name.',
  },
  {
    name: 'aria-valuetext',
    shortType: 'string',
    type: 'string | undefined',
    description: 'Overrides the value announced by assistive technology.',
  },
  {
    name: 'dragEpsilon',
    shortType: 'number',
    type: 'number | undefined',
    defaultValue: '0.0005',
    description:
      'Skips pointer updates smaller than this normalized movement threshold.',
  },
  {
    name: 'maxPointerRate',
    shortType: 'number',
    type: 'number | undefined',
    defaultValue: '60',
    description: 'Caps the pointer update rate during drag interactions.',
  },
] satisfies readonly PropReference[];

export function SliderDocsPage() {
  return (
    <MarkdownDocsPage
      format="component"
      slots={{
        'demo:basic': (
          <DocsExample code={sliderExampleCode} label="Color slider">
            <SliderExample />
          </DocsExample>
        ),
        'demo:vertical': (
          <DocsExample code={sliderVerticalExampleCode} label="Vertical slider">
            <SliderVerticalExample />
          </DocsExample>
        ),
        'demo:channels': (
          <DocsExample code={sliderChannelsExampleCode} label="Slider channels">
            <SliderChannelsExample />
          </DocsExample>
        ),
        'demo:range': (
          <DocsExample code={sliderRangeExampleCode} label="Slider range">
            <SliderRangeExample />
          </DocsExample>
        ),
        'demo:styling': (
          <DocsExample code={sliderStylingExampleCode} label="Slider styling">
            <SliderStylingExample />
          </DocsExample>
        ),
        'props:slider': (
          <PropReferenceTable name="Slider" props={SLIDER_PROPS} />
        ),
        'props:color-value-slider': (
          <PropReferenceTable
            name="ColorValueSlider"
            props={COLOR_VALUE_SLIDER_PROPS}
          />
        ),
        'props:color-slider': (
          <PropReferenceTable name="ColorSlider" props={COLOR_SLIDER_PROPS} />
        ),
      }}
      source={sliderDocs}
    />
  );
}
