import { DocsExample } from './docs-example.js';
import { ColorPlaneExample } from './examples/color-plane-basic-example.js';
import colorPlaneExampleCode from './examples/color-plane-basic-example.tsx?raw';
import { MarkdownDocsPage } from './markdown-docs-page.js';
import {
  PropReferenceTable,
  type PropReference,
} from './prop-reference-table.js';
import colorPlaneDocs from './color-plane.md?raw';

const COLOR_AREA_PROPS = [
  {
    name: 'axes',
    type: 'ColorAreaAxes | undefined',
    shortType: 'ColorAreaAxes',
    defaultValue: "{ x: { channel: 'l' }, y: { channel: 'c' } }",
    description: 'The channel and range descriptor for each rendered axis.',
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
    name: 'performanceProfile',
    type: 'ColorAreaPerformanceProfile | undefined',
    shortType: "'auto' | 'quality' | 'balanced' | 'performance'",
    defaultValue: "'auto'",
    description: 'Selects the runtime quality and responsiveness profile.',
  },
  {
    name: 'maxUpdateHz',
    type: 'number | undefined',
    shortType: 'number',
    defaultValue: '60',
    description: 'Limits pointer-driven color updates per second.',
  },
  {
    name: 'dragEpsilon',
    type: 'number | undefined',
    shortType: 'number',
    defaultValue: '0.0005',
    description: 'Skips normalized pointer deltas below this threshold.',
  },
  {
    name: 'onInteractionFrame',
    type: '(stats: ColorAreaInteractionFrameStats) => void',
    shortType: 'function',
    description:
      'Reports timing and quality statistics for committed pointer frames.',
  },
  {
    name: 'thumb',
    type: 'React.ReactNode',
    shortType: 'ReactNode',
    description: 'Supplies an explicit top-most thumb slot.',
  },
  {
    name: 'showDefaultThumb',
    type: 'boolean | undefined',
    shortType: 'boolean',
    defaultValue: 'true',
    description:
      'Renders the default thumb when no explicit thumb is supplied.',
  },
] satisfies readonly PropReference[];

const COLOR_PLANE_PROPS = [
  {
    name: 'source',
    type: 'ColorPlaneSource | undefined',
    shortType: "'requested' | 'displayed'",
    defaultValue: "'displayed'",
    description:
      'Chooses requested color or gamut-mapped displayed color pixels.',
  },
  {
    name: 'displayGamut',
    type: 'GamutTarget | undefined',
    shortType: 'GamutTarget',
    defaultValue: "active gamut or 'display-p3'",
    description: 'Sets the output gamut used for displayed-source pixels.',
  },
  {
    name: 'renderer',
    type: 'ColorPlaneRenderer | undefined',
    shortType: "'auto' | 'gpu' | 'cpu' | 'webgl' | 'canvas2d'",
    defaultValue: "'auto'",
    description:
      'Selects the rendering backend. WebGL and Canvas2D are compatibility aliases.',
  },
  {
    name: 'edgeBehavior',
    type: 'ColorPlaneEdgeBehavior | undefined',
    shortType: "'transparent' | 'clamp'",
    defaultValue: "'clamp'",
    description: 'Controls how displayed out-of-gamut pixels render.',
  },
  {
    name: 'outOfGamut',
    type: 'ColorPlaneOutOfGamutConfig | undefined',
    shortType: 'deprecated',
    description: 'Legacy edge configuration. Use edgeBehavior instead.',
  },
  {
    name: 'resolutionScale',
    type: 'number | undefined',
    shortType: 'number',
    defaultValue: '1',
    description:
      'Multiplies backing-store resolution beyond device pixel ratio.',
  },
] satisfies readonly PropReference[];

const THUMB_PROPS = [
  {
    name: 'aria-label',
    type: 'string | undefined',
    shortType: 'string',
    defaultValue: "'Color area'",
    description: 'Names the interactive two-axis slider.',
  },
  {
    name: 'aria-valuetext',
    type: 'string | undefined',
    shortType: 'string',
    defaultValue: 'formatted X and Y channel values',
    description: 'Overrides the generated two-axis value announcement.',
  },
  {
    name: 'stepRatio',
    type: 'number | undefined',
    shortType: 'number',
    defaultValue: '0.01',
    description: 'Sets the Arrow-key step as a ratio of the axis range.',
  },
  {
    name: 'shiftStepRatio',
    type: 'number | undefined',
    shortType: 'number',
    defaultValue: '0.1',
    description: 'Sets the Shift + Arrow step as a ratio of the axis range.',
  },
] satisfies readonly PropReference[];

export function ColorPlaneDocsPage() {
  return (
    <MarkdownDocsPage
      slots={{
        'demo:basic': (
          <DocsExample code={colorPlaneExampleCode} label="Color plane">
            <ColorPlaneExample />
          </DocsExample>
        ),
        'props:color-area': (
          <PropReferenceTable name="ColorArea" props={COLOR_AREA_PROPS} />
        ),
        'props:color-area-thumb': (
          <PropReferenceTable name="Thumb" props={THUMB_PROPS} />
        ),
        'props:color-plane': (
          <PropReferenceTable name="ColorPlane" props={COLOR_PLANE_PROPS} />
        ),
      }}
      source={colorPlaneDocs}
    />
  );
}
