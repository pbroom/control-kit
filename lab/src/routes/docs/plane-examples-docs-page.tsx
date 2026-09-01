import type { ComponentType } from 'react';
import { DocsExample } from './docs-example.js';
import { MarkdownDocsPage } from './markdown-docs-page.js';
import planeExamplesDocs from './plane-examples.md?raw';

type ExampleModule = Record<string, ComponentType>;

type PlaneExampleDefinition = {
  exportName: string;
  file: string;
  title: string;
};

type PlaneExampleGroup = {
  examples: readonly PlaneExampleDefinition[];
  title: string;
};

const exampleModules = import.meta.glob<ExampleModule>(
  './examples/plane-examples/*.tsx',
  { eager: true },
);
const exampleSources = import.meta.glob<string>(
  './examples/plane-examples/*.tsx',
  { eager: true, import: 'default', query: '?raw' },
);

const PLANE_EXAMPLE_GROUPS = [
  {
    title: 'Color',
    examples: [
      {
        file: 'saturation-value',
        exportName: 'SaturationValueExample',
        title: 'Saturation × brightness/value',
      },
      {
        file: 'three-way-color-adjuster',
        exportName: 'ThreeWayColorAdjusterExample',
        title:
          'Color grading controls — Circular controls (3-way color adjuster)',
      },
      {
        file: 'mesh-gradient',
        exportName: 'MeshGradientExample',
        title: 'Mesh gradient',
      },
    ],
  },
  {
    title: 'Position and alignment',
    examples: [
      {
        file: 'background-position',
        exportName: 'BackgroundPositionExample',
        title: 'Background-position',
      },
      {
        file: 'gradient-origin',
        exportName: 'GradientOriginExample',
        title: 'Gradient center/origin',
      },
      {
        file: 'pattern-offset',
        exportName: 'PatternOffsetExample',
        title: 'Pattern/texture offset',
      },
      {
        file: 'drop-shadow-offset',
        exportName: 'DropShadowOffsetExample',
        title: 'Drop-shadow offset',
      },
      {
        file: 'crop-focal-point',
        exportName: 'CropFocalPointExample',
        title: 'Image crop focal point',
      },
      {
        file: 'container-anchor',
        exportName: 'ContainerAnchorExample',
        title: 'Anchor point inside a container',
      },
    ],
  },
  {
    title: 'Typography',
    examples: [
      {
        file: 'variable-font-axes',
        exportName: 'VariableFontAxesExample',
        title: 'Variable-font axis pairs, e.g. weight × width',
      },
      {
        file: 'tracking-line-height',
        exportName: 'TrackingLineHeightExample',
        title: 'Tracking × line-height',
      },
    ],
  },
  {
    title: 'Animation and motion',
    examples: [
      {
        file: 'bezier-control-point',
        exportName: 'BezierControlPointExample',
        title: 'Bezier control-point editor',
      },
      {
        file: 'spring-stiffness-damping',
        exportName: 'SpringStiffnessDampingExample',
        title: 'Spring stiffness × damping',
      },
      {
        file: 'motion-direction-intensity',
        exportName: 'MotionDirectionIntensityExample',
        title: 'Motion direction/intensity',
      },
    ],
  },
  {
    title: 'Physics and simulation',
    examples: [
      {
        file: 'force-direction-magnitude',
        exportName: 'ForceDirectionMagnitudeExample',
        title: 'Force direction and magnitude',
      },
      {
        file: 'gravity-vector',
        exportName: 'GravityVectorExample',
        title: 'Gravity vector',
      },
      {
        file: 'joystick',
        exportName: 'JoystickExample',
        title: 'Joystick/game controls',
      },
      {
        file: 'fluid-flow',
        exportName: 'FluidFlowExample',
        title: 'Fluid-flow direction',
      },
      {
        file: 'particle-emitter',
        exportName: 'ParticleEmitterExample',
        title: 'Particle emitter direction/spread',
      },
    ],
  },
  {
    title: 'Audio',
    examples: [
      {
        file: 'xy-synth-pad',
        exportName: 'XySynthPadExample',
        title: 'XY synth pads',
      },
      {
        file: 'filter-cutoff-resonance',
        exportName: 'FilterCutoffResonanceExample',
        title: 'Filter cutoff × resonance',
      },
      {
        file: 'timbre-morph',
        exportName: 'TimbreMorphExample',
        title: 'Timbre morphing between parameters',
      },
      {
        file: 'spatial-audio',
        exportName: 'SpatialAudioExample',
        title: 'Spatial-audio source positioning',
      },
    ],
  },
  {
    title: 'Photo and video',
    examples: [
      {
        file: 'color-curves',
        exportName: 'ColorCurvesExample',
        title: 'Color curves control',
      },
    ],
  },
  {
    title: 'Data visualization',
    examples: [
      {
        file: 'four-corner-interpolation',
        exportName: 'FourCornerInterpolationExample',
        title: 'Choosing an interpolation point between four states',
      },
    ],
  },
  {
    title: 'Search and recommendation tuning',
    examples: [
      {
        file: 'recommendation-matrix',
        exportName: 'RecommendationMatrixExample',
        title: 'Familiar ↔ novel × safe ↔ adventurous',
      },
    ],
  },
  {
    title: 'Design-system and visual styling',
    examples: [
      {
        file: 'radius-border-width',
        exportName: 'RadiusBorderWidthExample',
        title: 'Border radius × border width',
      },
      {
        file: 'elevation-blur',
        exportName: 'ElevationBlurExample',
        title: 'Elevation × blur',
      },
      {
        file: 'noise-scale-intensity',
        exportName: 'NoiseScaleIntensityExample',
        title: 'Noise scale × intensity',
      },
    ],
  },
  {
    title: 'Canvas and diagramming',
    examples: [
      {
        file: 'minimap-viewport',
        exportName: 'MinimapViewportExample',
        title: 'Minimap viewport position',
      },
      {
        file: 'canvas-pan',
        exportName: 'CanvasPanExample',
        title: 'Canvas pan',
      },
    ],
  },
  {
    title: 'Maps and geospatial',
    examples: [
      {
        file: 'floor-plan-position',
        exportName: 'FloorPlanPositionExample',
        title: 'Relative position within a floor plan',
      },
    ],
  },
  {
    title: '3D tools represented in 2D',
    examples: [
      {
        file: 'light-direction',
        exportName: 'LightDirectionExample',
        title: 'Light direction',
      },
      {
        file: 'camera-orbit',
        exportName: 'CameraOrbitExample',
        title: 'Camera orbit: azimuth × elevation',
      },
    ],
  },
  {
    title: 'Game controls',
    examples: [
      {
        file: 'pitch-yaw',
        exportName: 'PitchYawExample',
        title: 'Pitch × yaw',
      },
    ],
  },
  {
    title: 'Business and prioritization',
    examples: [
      {
        file: 'importance-urgency',
        exportName: 'ImportanceUrgencyExample',
        title: 'Importance × urgency',
      },
    ],
  },
  {
    title: 'AI and generative controls',
    examples: [
      {
        file: 'creative-detail',
        exportName: 'CreativeDetailExample',
        title: 'Literal ↔ creative × concise ↔ detailed',
      },
    ],
  },
] as const satisfies readonly PlaneExampleGroup[];

function getExampleModulePath(file: string) {
  return `./examples/plane-examples/${file}.tsx`;
}

function getExampleComponent(example: PlaneExampleDefinition) {
  const path = getExampleModulePath(example.file);
  const component = exampleModules[path]?.[example.exportName];

  if (!component) {
    throw new Error(`No Plane example component exported for ${path}.`);
  }

  return component;
}

function getExampleSource(example: PlaneExampleDefinition) {
  const path = getExampleModulePath(example.file);
  const source = exampleSources[path];

  if (!source) {
    throw new Error(`No Plane example source found for ${path}.`);
  }

  return source;
}

function PlaneExamplesGallery() {
  return (
    <div
      className="flex flex-col gap-16"
      data-plane-examples-count="37"
      data-plane-examples-gallery
    >
      {PLANE_EXAMPLE_GROUPS.map((group) => (
        <section
          aria-labelledby={`plane-examples-${group.title.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`}
          className="flex flex-col gap-6"
          key={group.title}
        >
          <h2
            className="m-0 font-[var(--font-brand)] text-[21px] leading-tight font-semibold tracking-[-0.02em] text-white"
            id={`plane-examples-${group.title.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`}
          >
            {group.title}
          </h2>
          <div className="flex flex-col gap-10">
            {group.examples.map((example) => {
              const Example = getExampleComponent(example);

              return (
                <div className="flex flex-col gap-3" key={example.file}>
                  <h3 className="m-0 text-base font-medium text-white/88">
                    {example.title}
                  </h3>
                  <DocsExample
                    code={getExampleSource(example)}
                    filename={`${example.file}.tsx`}
                    label={example.title}
                  >
                    <Example />
                  </DocsExample>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function PlaneExamplesDocsPage() {
  return (
    <MarkdownDocsPage
      slots={{ 'demo:gallery': <PlaneExamplesGallery /> }}
      source={planeExamplesDocs}
    />
  );
}
