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
        'props:color-slider': (
          <PropReferenceTable name="ColorSlider" props={COLOR_SLIDER_PROPS} />
        ),
      }}
      source={sliderDocs}
    />
  );
}
