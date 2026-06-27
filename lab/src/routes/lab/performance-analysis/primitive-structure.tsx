import { useEffect, useRef } from 'react';
import type { LabPrimitiveStructure } from './types.js';

type ThreeModule = typeof import('three');
type ThreeObject3D = InstanceType<ThreeModule['Object3D']>;
type ThreeOrthographicCamera = InstanceType<ThreeModule['OrthographicCamera']>;

const STRUCTURE_CAMERA_DISTANCE = 8.2;
const STRUCTURE_FRUSTUM_SIZE = 7.35;
const STRUCTURE_LAYER_GAP_Y = 0.64;
const STRUCTURE_MAX_PIXEL_RATIO = 2;

const STRUCTURE_LAYER_PALETTE = [
  {
    fill: '#687383',
    line: '#cfd6dc',
    opacity: 0.18,
    swatch: '#687383',
  },
  {
    fill: '#c1c8ce',
    line: '#f0f3f5',
    opacity: 0.22,
    swatch: '#b8c0c6',
  },
  {
    fill: '#9db7c7',
    line: '#d9edf4',
    opacity: 0.2,
    swatch: '#9db7c7',
  },
  {
    fill: '#f2f4f5',
    line: '#ffffff',
    opacity: 0.36,
    swatch: '#eef1f2',
  },
] as const;

function structureLayerTone(layerIndex: number) {
  return STRUCTURE_LAYER_PALETTE[
    Math.min(layerIndex, STRUCTURE_LAYER_PALETTE.length - 1)
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
        'none',
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

export function LabPrimitiveStructureView({
  structure,
}: {
  structure: LabPrimitiveStructure;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  usePrimitiveStructureScene(structure, containerRef);

  return (
    <div
      className="grid min-h-0 min-w-0 gap-4 lg:grid-cols-[minmax(320px,1fr)_minmax(260px,0.62fr)] lg:items-stretch"
      data-testid="lab-primitive-structure-shell"
    >
      <div
        aria-label={`${structure.title} orthographic render`}
        className="relative min-h-[228px] overflow-hidden"
        data-primitive-structure-surface="transparent"
        data-testid="lab-primitive-structure-render"
        ref={containerRef}
      />
      <div className="min-h-0 min-w-0 space-y-3">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold leading-5 text-white/92">
            {structure.title}
          </h2>
          <p className="max-w-[52ch] text-xs leading-5 text-white/50">
            {structure.summary}
          </p>
        </div>
        <ol className="grid min-w-0 gap-2">
          {structure.layers.map((layer, layerIndex) => (
            <li
              className="grid min-w-0 grid-cols-[0.75rem_minmax(0,1fr)] gap-2 border-t border-white/8 pt-2"
              data-primitive-layer={layer.id}
              key={layer.id}
            >
              <span
                aria-hidden
                className="mt-1 size-3 rounded-[3px] border border-white/16"
                style={{
                  backgroundColor: structureLayerTone(layerIndex).swatch,
                }}
              />
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-white/84">
                  {layer.label}
                </span>
                <span className="block text-[11px] leading-4 text-white/45">
                  {layer.detail}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
