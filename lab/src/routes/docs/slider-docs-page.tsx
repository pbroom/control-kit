import { DocsExample } from './docs-example.js';
import { SliderExample } from './examples/slider-basic-example.js';
import sliderExampleCode from './examples/slider-basic-example.tsx?raw';
import { SliderVerticalExample } from './examples/slider-vertical-example.js';
import sliderVerticalExampleCode from './examples/slider-vertical-example.tsx?raw';
import { MarkdownDocsPage } from './markdown-docs-page.js';
import sliderDocs from './slider.md?raw';

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
      }}
      source={sliderDocs}
    />
  );
}
