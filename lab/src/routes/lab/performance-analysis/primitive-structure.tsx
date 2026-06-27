import { useEffect, useMemo, useRef } from 'react';
import type {
  LabHtmlInCanvasSupportState,
  LabPrimitiveStructure,
} from './types.js';

type ThreeModule = typeof import('three');
type ThreeObject3D = InstanceType<ThreeModule['Object3D']>;
type ThreeOrthographicCamera = InstanceType<ThreeModule['OrthographicCamera']>;
type StructureCalloutEntry = {
  callout: (typeof STRUCTURE_LAYER_CALLOUTS)[number];
  layer: LabPrimitiveStructure['layers'][number];
  layerIndex: number;
};
type HtmlInCanvasElement = HTMLCanvasElement & {
  requestPaint?: () => void;
};
type HtmlInCanvasContext = CanvasRenderingContext2D & {
  drawElementImage?: (element: Element, x: number, y: number) => unknown;
};

const STRUCTURE_CAMERA_DISTANCE = 8.2;
const STRUCTURE_FRUSTUM_SIZE = 7.35;
const STRUCTURE_LAYER_GAP_Y = 0.64;
const STRUCTURE_MAX_PIXEL_RATIO = 2;

const STRUCTURE_LAYER_PALETTE = [
  {
    fill: '#687383',
    line: '#cfd6dc',
    opacity: 0.18,
  },
  {
    fill: '#c1c8ce',
    line: '#f0f3f5',
    opacity: 0.22,
  },
  {
    fill: '#9db7c7',
    line: '#d9edf4',
    opacity: 0.2,
  },
  {
    fill: '#f2f4f5',
    line: '#ffffff',
    opacity: 0.36,
  },
] as const;

const STRUCTURE_LAYER_CALLOUTS = [
  {
    labelX: 64,
    labelY: 72,
    targetX: 31,
    targetY: 72,
  },
  {
    labelX: 64,
    labelY: 60,
    targetX: 36,
    targetY: 62,
  },
  {
    labelX: 64,
    labelY: 48,
    targetX: 40,
    targetY: 51,
  },
  {
    labelX: 64,
    labelY: 36,
    targetX: 29,
    targetY: 36,
  },
] as const;

function structureLayerTone(layerIndex: number) {
  return STRUCTURE_LAYER_PALETTE[
    Math.min(layerIndex, STRUCTURE_LAYER_PALETTE.length - 1)
  ];
}

function structureLayerCallout(layerIndex: number) {
  return STRUCTURE_LAYER_CALLOUTS[
    Math.min(layerIndex, STRUCTURE_LAYER_CALLOUTS.length - 1)
  ];
}

function createStructureMaterial(
  THREE: ThreeModule,
  tone: (typeof STRUCTURE_LAYER_PALETTE)[number],
) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(tone.fill),
    depthWrite: false,
    opacity: tone.opacity,
    side: THREE.DoubleSide,
    transparent: true,
  });
}

function createLayerGroup(
  THREE: ThreeModule,
  layer: LabPrimitiveStructure['layers'][number],
  layerIndex: number,
) {
  const group = new THREE.Group();
  const layerY =
    layerIndex * STRUCTURE_LAYER_GAP_Y + (layer.offsetZ ?? 0) * 0.1;
  const tone = structureLayerTone(layerIndex);
  const geometry = new THREE.PlaneGeometry(layer.width, layer.height, 1, 1);
  geometry.rotateX(-Math.PI / 2);
  const material = createStructureMaterial(THREE, tone);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = layer.id;
  mesh.renderOrder = layerIndex * 2;

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({
      color: tone.line,
      depthWrite: false,
      opacity: layerIndex === 0 ? 0.46 : 0.68,
      transparent: true,
    }),
  );
  edges.name = `${layer.id}-edges`;
  edges.renderOrder = mesh.renderOrder + 1;

  group.name = `${layer.id}-assembly-layer`;
  group.position.set(layer.offsetX ?? 0, layerY, -(layer.offsetY ?? 0));
  group.add(mesh, edges);

  return group;
}

function fitCameraToContainer(
  camera: ThreeOrthographicCamera,
  width: number,
  height: number,
) {
  const aspect = width / height;
  camera.left = (-STRUCTURE_FRUSTUM_SIZE * aspect) / 2;
  camera.right = (STRUCTURE_FRUSTUM_SIZE * aspect) / 2;
  camera.top = STRUCTURE_FRUSTUM_SIZE / 2;
  camera.bottom = -STRUCTURE_FRUSTUM_SIZE / 2;
  camera.updateProjectionMatrix();
}

function disposeObject(THREE: ThreeModule, object: ThreeObject3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
      child.geometry.dispose();

      if (Array.isArray(child.material)) {
        child.material.forEach((material) => material.dispose());
      } else {
        child.material.dispose();
      }
    }
  });
}

function usePrimitiveStructureScene(
  structure: LabPrimitiveStructure,
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    let cleanupScene: (() => void) | null = null;
    let isDisposed = false;

    void import('three').then((THREE) => {
      if (isDisposed) {
        return;
      }

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
      });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, STRUCTURE_MAX_PIXEL_RATIO),
      );
      renderer.domElement.setAttribute('aria-label', structure.title);
      renderer.domElement.setAttribute(
        'data-testid',
        'lab-primitive-structure-canvas',
      );
      renderer.domElement.setAttribute('data-primitive-structure-axis', 'y');
      renderer.domElement.setAttribute(
        'data-primitive-structure-geometry',
        'plane',
      );
      renderer.domElement.setAttribute(
        'data-primitive-structure-guides',
        'callouts',
      );
      renderer.domElement.setAttribute(
        'data-primitive-structure-motion',
        'static',
      );
      renderer.domElement.setAttribute(
        'data-primitive-structure-palette',
        'flat',
      );
      renderer.domElement.setAttribute('role', 'img');
      renderer.domElement.className = 'h-full w-full';
      renderer.domElement.style.display = 'block';
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 80);
      camera.position.set(
        STRUCTURE_CAMERA_DISTANCE * 0.86,
        STRUCTURE_CAMERA_DISTANCE * 0.72,
        STRUCTURE_CAMERA_DISTANCE,
      );
      camera.lookAt(0, STRUCTURE_LAYER_GAP_Y * 1.35, 0);

      const root = new THREE.Group();
      root.rotation.y = -0.12;
      scene.add(root);

      structure.layers.forEach((layer, layerIndex) => {
        root.add(createLayerGroup(THREE, layer, layerIndex));
      });

      const resize = () => {
        const rect = container.getBoundingClientRect();
        const width = Math.max(1, Math.floor(rect.width));
        const height = Math.max(1, Math.floor(rect.height));
        renderer.setSize(width, height, false);
        fitCameraToContainer(camera, width, height);
        renderer.render(scene, camera);
      };

      resize();

      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);

      cleanupScene = () => {
        resizeObserver.disconnect();
        disposeObject(THREE, root);
        renderer.dispose();
        renderer.domElement.remove();
      };
    });

    return () => {
      isDisposed = true;
      cleanupScene?.();
    };
  }, [containerRef, structure]);
}

function useHtmlCanvasCalloutLayer({
  calloutEntries,
  enabled,
  htmlCanvasRef,
}: {
  calloutEntries: readonly StructureCalloutEntry[];
  enabled: boolean;
  htmlCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}) {
  useEffect(() => {
    const canvas = htmlCanvasRef.current as HtmlInCanvasElement | null;

    if (!enabled || !canvas) {
      return;
    }

    const context = canvas.getContext('2d') as HtmlInCanvasContext | null;

    if (
      !context ||
      typeof context.drawElementImage !== 'function' ||
      typeof canvas.requestPaint !== 'function'
    ) {
      return;
    }

    const drawElementImage = context.drawElementImage.bind(context);

    const drawCallouts = () => {
      const rect = canvas.getBoundingClientRect();
      const cssWidth = Math.max(1, rect.width);
      const cssHeight = Math.max(1, rect.height);
      const pixelRatio = canvas.width / cssWidth || 1;

      context.reset?.();
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.lineWidth = 1;
      context.strokeStyle = 'rgba(255, 255, 255, 0.42)';
      context.fillStyle = 'rgba(255, 255, 255, 0.6)';

      calloutEntries.forEach(({ callout, layer }) => {
        const labelElement = canvas.querySelector<HTMLElement>(
          `[data-primitive-html-canvas-label="${layer.id}"]`,
        );

        if (!labelElement) {
          return;
        }

        const targetX = (callout.targetX / 100) * cssWidth;
        const targetY = (callout.targetY / 100) * cssHeight;
        const labelX = (callout.labelX / 100) * cssWidth;
        const labelHeight = Math.max(1, labelElement.offsetHeight);
        const labelY = (callout.labelY / 100) * cssHeight - labelHeight / 2;
        const elbowX = labelX - 18;

        context.beginPath();
        context.moveTo(targetX, targetY);
        context.lineTo(elbowX, targetY);
        context.lineTo(labelX - 8, labelY + labelHeight / 2);
        context.stroke();
        context.beginPath();
        context.arc(targetX, targetY, 1.4, 0, Math.PI * 2);
        context.fill();

        const transform = drawElementImage(labelElement, labelX, labelY);

        if (transform instanceof DOMMatrix) {
          labelElement.style.transform = transform.toString();
        } else if (typeof transform === 'string') {
          labelElement.style.transform = transform;
        }
      });
    };

    const syncCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const nextWidth = Math.max(1, Math.round(rect.width * pixelRatio));
      const nextHeight = Math.max(1, Math.round(rect.height * pixelRatio));

      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }

      canvas.requestPaint?.();
    };

    const handlePaint = () => drawCallouts();
    const resizeObserver = new ResizeObserver(syncCanvasSize);

    canvas.addEventListener('paint', handlePaint);
    resizeObserver.observe(canvas);
    syncCanvasSize();

    return () => {
      canvas.removeEventListener('paint', handlePaint);
      resizeObserver.disconnect();
    };
  }, [calloutEntries, enabled, htmlCanvasRef]);
}

export function LabPrimitiveStructureView({
  htmlCanvasLabelsEnabled,
  htmlInCanvasSupportState,
  structure,
}: {
  htmlCanvasLabelsEnabled: boolean;
  htmlInCanvasSupportState: LabHtmlInCanvasSupportState;
  structure: LabPrimitiveStructure;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const htmlCanvasRef = useRef<HTMLCanvasElement | null>(null);
  usePrimitiveStructureScene(structure, containerRef);
  const calloutEntries = useMemo(
    () =>
      structure.layers
        .map((layer, layerIndex) => ({
          callout: structureLayerCallout(layerIndex),
          layer,
          layerIndex,
        }))
        .reverse(),
    [structure.layers],
  );
  const areHtmlCanvasCalloutsActive =
    htmlCanvasLabelsEnabled && htmlInCanvasSupportState === 'supported';
  useHtmlCanvasCalloutLayer({
    calloutEntries,
    enabled: areHtmlCanvasCalloutsActive,
    htmlCanvasRef,
  });

  return (
    <div
      className="relative grid min-h-0 min-w-0 gap-4 lg:grid-cols-[minmax(320px,1fr)_minmax(260px,0.62fr)] lg:items-stretch"
      data-primitive-structure-html-canvas-gate={
        htmlCanvasLabelsEnabled ? 'enabled' : 'disabled'
      }
      data-primitive-structure-html-canvas-support={htmlInCanvasSupportState}
      data-primitive-structure-label-renderer={
        areHtmlCanvasCalloutsActive ? 'html-in-canvas' : 'dom-overlay'
      }
      data-testid="lab-primitive-structure-shell"
    >
      <div
        aria-label={`${structure.title} orthographic render`}
        className="relative min-h-[228px] overflow-hidden"
        data-primitive-structure-surface="transparent"
        data-testid="lab-primitive-structure-render"
        ref={containerRef}
      />
      {areHtmlCanvasCalloutsActive ? (
        <canvas
          {...{ layoutsubtree: '' }}
          aria-label={`${structure.title} HTML-in-canvas callouts`}
          className="pointer-events-none absolute inset-0 z-[1] hidden h-full w-full lg:block"
          data-testid="lab-primitive-structure-html-canvas-layer"
          ref={htmlCanvasRef}
        >
          {calloutEntries.map(({ layer, layerIndex }) => (
            <div
              className="absolute left-0 top-0 w-[min(280px,32vw)] min-w-0 border-t border-white/8 pt-2"
              data-primitive-html-canvas-label={layer.id}
              data-primitive-layer={layer.id}
              key={layer.id}
            >
              <span className="grid min-w-0 grid-cols-[1.6rem_minmax(0,1fr)] gap-2">
                <span className="pt-px font-mono text-[10px] leading-4 text-white/34">
                  {String(structure.layers.length - layerIndex).padStart(
                    2,
                    '0',
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-white/86">
                    {layer.label}
                  </span>
                  <span className="block text-[11px] leading-4 text-white/46">
                    {layer.detail}
                  </span>
                </span>
              </span>
            </div>
          ))}
        </canvas>
      ) : null}
      <svg
        aria-hidden
        className={[
          'pointer-events-none absolute inset-0 z-[1] hidden h-full w-full lg:block',
          areHtmlCanvasCalloutsActive ? 'lg:hidden' : null,
        ]
          .filter(Boolean)
          .join(' ')}
        data-testid="lab-primitive-structure-callouts"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        {calloutEntries.map(({ callout, layer }) => {
          const elbowX = callout.labelX - 5.5;

          return (
            <g data-primitive-callout={layer.id} key={layer.id}>
              <path
                className="stroke-white/42"
                d={`M ${callout.targetX} ${callout.targetY} L ${elbowX} ${callout.targetY} L ${callout.labelX} ${callout.labelY}`}
                data-primitive-callout-line={layer.id}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                className="fill-white/60"
                cx={callout.targetX}
                cy={callout.targetY}
                r="0.34"
              />
            </g>
          );
        })}
      </svg>
      <div className="relative z-[2] min-h-0 min-w-0 space-y-3">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold leading-5 text-white/92">
            {structure.title}
          </h2>
          <p className="max-w-[52ch] text-xs leading-5 text-white/50">
            {structure.summary}
          </p>
        </div>
        <ol
          aria-hidden={areHtmlCanvasCalloutsActive ? true : undefined}
          className={[
            'relative grid min-w-0 gap-2 lg:absolute lg:inset-0 lg:block',
            areHtmlCanvasCalloutsActive
              ? 'pointer-events-none opacity-0'
              : null,
          ]
            .filter(Boolean)
            .join(' ')}
          data-testid="lab-primitive-structure-callout-labels"
        >
          {calloutEntries.map(({ callout, layer, layerIndex }) => (
            <li
              className="min-w-0 border-t border-white/8 pt-2 lg:absolute lg:left-0 lg:right-0 lg:-translate-y-1/2"
              data-primitive-callout-layer="true"
              data-primitive-layer={layer.id}
              key={layer.id}
              style={{ top: `${callout.labelY}%` }}
            >
              <span className="grid min-w-0 grid-cols-[1.6rem_minmax(0,1fr)] gap-2">
                <span className="pt-px font-mono text-[10px] leading-4 text-white/34">
                  {String(structure.layers.length - layerIndex).padStart(
                    2,
                    '0',
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-white/86">
                    {layer.label}
                  </span>
                  <span className="block text-[11px] leading-4 text-white/46">
                    {layer.detail}
                  </span>
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
