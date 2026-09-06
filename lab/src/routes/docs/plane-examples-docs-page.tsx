import type { ComponentType } from 'react';
import { DocsExample } from './docs-example.js';
import { MarkdownDocsPage } from './markdown-docs-page.js';
import planeExamplesDocs from './plane-examples.md?raw';

type ExampleModule = Record<string, ComponentType>;

type PlaneExampleDefinition = {
  exportName: string;
  file: string;
  outlineTitle?: string;
  title: string;
};

type PlaneExampleGroup = {
  examples: readonly PlaneExampleDefinition[];
  outlineTitle?: string;
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

const PLANE_EXAMPLE_GROUPS: readonly PlaneExampleGroup[] = [
  {
    title: 'Color',
    examples: [
      {
        file: 'saturation-value',
        exportName: 'SaturationValueExample',
        outlineTitle: 'Saturation / value',
        title: 'Saturation × brightness/value',
      },
      {
        file: 'three-way-color-adjuster',
        exportName: 'ThreeWayColorAdjusterExample',
        outlineTitle: '3-way color grading',
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
    outlineTitle: 'Position',
    examples: [
      {
        file: 'image-pan-and-focal-point',
        exportName: 'ImagePanAndFocalPointExample',
        outlineTitle: 'Image pan / focal point',
        title: 'Image pan and focal point',
      },
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
        outlineTitle: 'Container anchor',
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
        outlineTitle: 'Variable font axes',
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
    outlineTitle: 'Motion',
    examples: [
      {
        file: 'bezier-control-point',
        exportName: 'BezierControlPointExample',
        outlineTitle: 'Bezier editor',
        title: 'Bezier control-point editor',
      },
      {
        file: 'spring-stiffness-damping',
        exportName: 'SpringStiffnessDampingExample',
        outlineTitle: 'Spring / damping',
        title: 'Spring stiffness × damping',
      },
      {
        file: 'motion-direction-intensity',
        exportName: 'MotionDirectionIntensityExample',
        outlineTitle: 'Direction / intensity',
        title: 'Motion direction/intensity',
      },
    ],
  },
  {
    title: 'Physics and simulation',
    outlineTitle: 'Physics',
    examples: [
      {
        file: 'force-direction-magnitude',
        exportName: 'ForceDirectionMagnitudeExample',
        outlineTitle: 'Force vector',
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
        outlineTitle: 'Particle direction',
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
        outlineTitle: 'Timbre morph',
        title: 'Timbre morphing between parameters',
      },
      {
        file: 'spatial-audio',
        exportName: 'SpatialAudioExample',
        outlineTitle: 'Spatial audio',
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
    outlineTitle: 'Data viz',
    examples: [
      {
        file: 'four-corner-interpolation',
        exportName: 'FourCornerInterpolationExample',
        outlineTitle: '4-corner interpolation',
        title: 'Choosing an interpolation point between four states',
      },
    ],
  },
  {
    title: 'Search and recommendation tuning',
    outlineTitle: 'Search tuning',
    examples: [
      {
        file: 'recommendation-matrix',
        exportName: 'RecommendationMatrixExample',
        outlineTitle: 'Recommendation matrix',
        title: 'Familiar ↔ novel × safe ↔ adventurous',
      },
    ],
  },
  {
    title: 'Design-system and visual styling',
    outlineTitle: 'Visual styling',
    examples: [
      {
        file: 'radius-border-width',
        exportName: 'RadiusBorderWidthExample',
        outlineTitle: 'Radius / border',
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
    outlineTitle: 'Canvas',
    examples: [
      {
        file: 'minimap-viewport',
        exportName: 'MinimapViewportExample',
        outlineTitle: 'Minimap position',
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
    outlineTitle: 'Maps',
    examples: [
      {
        file: 'floor-plan-position',
        exportName: 'FloorPlanPositionExample',
        outlineTitle: 'Floor-plan position',
        title: 'Relative position within a floor plan',
      },
    ],
  },
  {
    title: '3D tools represented in 2D',
    outlineTitle: '3D tools',
    examples: [
      {
        file: 'light-direction',
        exportName: 'LightDirectionExample',
        title: 'Light direction',
      },
      {
        file: 'camera-orbit',
        exportName: 'CameraOrbitExample',
        outlineTitle: 'Camera orbit',
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
    outlineTitle: 'Prioritization',
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
    outlineTitle: 'AI controls',
    examples: [
      {
        file: 'creative-detail',
        exportName: 'CreativeDetailExample',
        outlineTitle: 'Creative / detail',
        title: 'Literal ↔ creative × concise ↔ detailed',
      },
    ],
  },
] as const;

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
      data-plane-examples-count={PLANE_EXAMPLE_GROUPS.reduce(
        (count, group) => count + group.examples.length,
        0,
      )}
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
            data-docs-outline-label={group.outlineTitle}
            id={`plane-examples-${group.title.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`}
          >
            {group.title}
          </h2>
          <div className="flex flex-col gap-10">
            {group.examples.map((example) => {
              const Example = getExampleComponent(example);

              return (
                <div className="flex flex-col gap-3" key={example.file}>
                  <h3
                    className="m-0 text-base font-medium text-white/88"
                    data-docs-outline-label={example.outlineTitle}
                  >
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
