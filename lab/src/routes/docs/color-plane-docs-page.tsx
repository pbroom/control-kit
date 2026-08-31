import { DocsExample } from './docs-example.js';
import { ColorPlaneAxesExample } from './examples/color-plane-axes-example.js';
import colorPlaneAxesExampleCode from './examples/color-plane-axes-example.tsx?raw';
import { ColorPlaneExample } from './examples/color-plane-basic-example.js';
import colorPlaneExampleCode from './examples/color-plane-basic-example.tsx?raw';
import { ColorPlaneInteractionExample } from './examples/color-plane-interaction-example.js';
import colorPlaneInteractionExampleCode from './examples/color-plane-interaction-example.tsx?raw';
import { ColorPlaneRenderingExample } from './examples/color-plane-rendering-example.js';
import colorPlaneRenderingExampleCode from './examples/color-plane-rendering-example.tsx?raw';
import { MarkdownDocsPage } from './markdown-docs-page.js';
import {
  PropReferenceTable,
  type PropReference,
} from './prop-reference-table.js';
import colorPlaneDocs from './color-plane.md?raw';

const COLOR_AREA_PROPS = [
  {
    name: 'axes',
    shortType: 'ColorAreaAxes',
    type: 'ColorAreaAxes | undefined',
    defaultValue: "{ x: { channel: 'l' }, y: { channel: 'c' } }",
    description: 'Selects the X and Y channels and their numeric ranges.',
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
    name: 'performanceProfile',
    shortType: "'auto' | 'quality' | 'balanced' | 'performance'",
    type: 'ColorAreaPerformanceProfile | undefined',
    defaultValue: "'auto'",
    description: 'Selects the runtime quality and responsiveness policy.',
  },
  {
    name: 'maxUpdateHz',
    shortType: 'number',
    type: 'number | undefined',
    defaultValue: '60',
    description: 'Caps the pointer-driven update frequency.',
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
    name: 'thumb',
    shortType: 'React.ReactNode',
    type: 'React.ReactNode',
    description: 'Renders an explicit thumb as the top-most child.',
  },
  {
    name: 'showDefaultThumb',
    shortType: 'boolean',
    type: 'boolean | undefined',
    defaultValue: 'true',
    description:
      'Renders the default thumb when no explicit thumb prop or Thumb child is present.',
  },
] satisfies readonly PropReference[];

const COLOR_PLANE_PROPS = [
  {
    name: 'source',
    shortType: "'requested' | 'displayed'",
    type: 'ColorPlaneSource | undefined',
    defaultValue: "'displayed'",
    description: 'Selects the requested or gamut-mapped displayed color.',
  },
  {
    name: 'displayGamut',
    shortType: "'srgb' | 'display-p3'",
    type: 'GamutTarget | undefined',
    defaultValue: 'active color gamut',
    description: 'Selects the output gamut for displayed-source pixels.',
  },
  {
    name: 'renderer',
    shortType: "'auto' | 'gpu' | 'cpu'",
    type: 'ColorPlaneRenderer | undefined',
    defaultValue: "'auto'",
    description:
      'Selects automatic, GPU, or CPU rendering. Legacy webgl and canvas2d aliases are also accepted.',
  },
  {
    name: 'edgeBehavior',
    shortType: "'transparent' | 'clamp'",
    type: 'ColorPlaneEdgeBehavior | undefined',
    defaultValue: "'clamp'",
    description:
      'Clamps displayed out-of-gamut pixels or leaves them transparent.',
  },
  {
    name: 'resolutionScale',
    shortType: 'number',
    type: 'number | undefined',
    defaultValue: '1',
    description:
      'Multiplies the canvas backing-store scale beyond the device pixel ratio.',
  },
] satisfies readonly PropReference[];

const COLOR_AREA_THUMB_PROPS = [
  {
    name: 'aria-label',
    shortType: 'string',
    type: 'string | undefined',
    defaultValue: "'Color area'",
    description: 'Names the two-axis color control.',
  },
  {
    name: 'aria-valuetext',
    shortType: 'string',
    type: 'string | undefined',
    defaultValue: 'formatted channel values',
    description: 'Overrides the announced two-axis value.',
  },
  {
    name: 'stepRatio',
    shortType: 'number',
    type: 'number | undefined',
    defaultValue: '0.01',
    description:
      'Sets the unmodified arrow-key step as a ratio of the axis range.',
  },
  {
    name: 'shiftStepRatio',
    shortType: 'number',
    type: 'number | undefined',
    defaultValue: '0.1',
    description: 'Sets the Shift + Arrow step as a ratio of the axis range.',
  },
] satisfies readonly PropReference[];

export function ColorPlaneDocsPage() {
  return (
    <MarkdownDocsPage
      format="component"
      slots={{
        'demo:basic': (
          <DocsExample code={colorPlaneExampleCode} label="Color plane">
            <ColorPlaneExample />
          </DocsExample>
        ),
        'demo:axes': (
          <DocsExample
            code={colorPlaneAxesExampleCode}
            label="Color plane axes"
          >
            <ColorPlaneAxesExample />
          </DocsExample>
        ),
        'demo:rendering': (
          <DocsExample
            code={colorPlaneRenderingExampleCode}
            label="Color plane rendering"
          >
            <ColorPlaneRenderingExample />
          </DocsExample>
        ),
        'demo:interaction': (
          <DocsExample
            code={colorPlaneInteractionExampleCode}
            label="Color plane interaction tuning"
          >
            <ColorPlaneInteractionExample />
          </DocsExample>
        ),
        'props:color-area': (
          <PropReferenceTable name="ColorArea" props={COLOR_AREA_PROPS} />
        ),
        'props:color-plane': (
          <PropReferenceTable name="ColorPlane" props={COLOR_PLANE_PROPS} />
        ),
        'props:thumb': (
          <PropReferenceTable name="Thumb" props={COLOR_AREA_THUMB_PROPS} />
        ),
      }}
      source={colorPlaneDocs}
    />
  );
}
