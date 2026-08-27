import { DocsExample } from './docs-example.js';
import { SliderExample } from './examples/slider-basic-example.js';
import sliderExampleCode from './examples/slider-basic-example.tsx?raw';
import { MarkdownDocsPage } from './markdown-docs-page.js';
import {
  PropReferenceTable,
  type PropReference,
} from './prop-reference-table.js';
import sliderDocs from './slider.md?raw';

const SLIDER_PROPS = [
  {
    name: 'channel',
    type: 'ColorSliderChannel',
    shortType: "'l' | 'c' | 'h' | 'alpha'",
    required: true,
    description: 'The requested color channel controlled by the slider.',
  },
  {
    name: 'range',
    type: '[number, number] | undefined',
    shortType: '[number, number]',
    defaultValue: 'channel range',
    description:
      'Overrides the numeric range for pointer, keyboard, and ARIA values.',
  },
  {
    name: 'orientation',
    type: 'ColorSliderOrientation | undefined',
    shortType: "'horizontal' | 'vertical'",
    defaultValue: "'horizontal'",
    description: 'Sets the visual, pointer, and accessible orientation.',
  },
  {
    name: 'aria-label',
    type: 'string | undefined',
    shortType: 'string',
    defaultValue: 'channel name + slider',
    description: 'Overrides the generated channel-specific slider name.',
  },
  {
    name: 'aria-valuetext',
    type: 'string | undefined',
    shortType: 'string',
    description: 'Supplies an application-specific spoken value.',
  },
  {
    name: 'requested',
    type: 'Color | undefined',
    shortType: 'Color',
    description: 'The standalone controlled requested color.',
  },
  {
    name: 'onChangeRequested',
    type: '(requested: Color, options?: SetRequestedOptions) => void',
    shortType: 'function',
    description: 'Updates standalone requested color state.',
  },
  {
    name: 'dragEpsilon',
    type: 'number | undefined',
    shortType: 'number',
    defaultValue: '0.0005',
    description: 'Skips normalized pointer changes below this threshold.',
  },
  {
    name: 'maxPointerRate',
    type: 'number | undefined',
    shortType: 'number',
    defaultValue: '60',
    description: 'Limits pointer-driven updates per second.',
  },
] satisfies readonly PropReference[];

export function SliderDocsPage() {
  return (
    <MarkdownDocsPage
      slots={{
        'demo:basic': (
          <DocsExample code={sliderExampleCode} label="Color slider">
            <SliderExample />
          </DocsExample>
        ),
        'props:slider': (
          <PropReferenceTable name="ColorSlider" props={SLIDER_PROPS} />
        ),
      }}
      source={sliderDocs}
    />
  );
}
