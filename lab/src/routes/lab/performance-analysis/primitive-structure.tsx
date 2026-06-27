import { useEffect, useRef } from 'react';
import type { LabPrimitiveStructure } from './types.js';

type ThreeModule = typeof import('three');
type ThreeObject3D = InstanceType<ThreeModule['Object3D']>;
type ThreeOrthographicCamera = InstanceType<ThreeModule['OrthographicCamera']>;

const STRUCTURE_CAMERA_DISTANCE = 7.4;
const STRUCTURE_FRUSTUM_SIZE = 6.25;
const STRUCTURE_MAX_PIXEL_RATIO = 2;

function createStructureMaterial(
  THREE: ThreeModule,
  layerColor: string,
  opacity = 0.88,
) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(layerColor),
    metalness: 0.04,
    opacity,
    roughness: 0.58,
    transparent: opacity < 1,
  });
}

function createLayerMesh(
  THREE: ThreeModule,
  layer: LabPrimitiveStructure['layers'][number],
  layerIndex: number,
) {
  const geometry = new THREE.BoxGeometry(
    layer.width,
    layer.height,
    layer.depth ?? 0.12,
    1,
    1,
    1,
  );
  const material = createStructureMaterial(THREE, layer.color, layer.opacity);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = layer.id;
  mesh.position.set(
    layer.offsetX ?? 0,
    layer.offsetY ?? 0,
    (layer.offsetZ ?? layerIndex * 0.18) + layerIndex * 0.03,
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({
      color: 0xffffff,
      opacity: 0.28,
      transparent: true,
    }),
  );
  edges.name = `${layer.id}-edges`;
  edges.position.copy(mesh.position);

  return { edges, mesh };
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
      renderer.domElement.setAttribute('role', 'img');
      renderer.domElement.className = 'h-full w-full';
      renderer.domElement.style.display = 'block';
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 80);
      camera.position.set(
        STRUCTURE_CAMERA_DISTANCE,
        STRUCTURE_CAMERA_DISTANCE * 0.72,
        STRUCTURE_CAMERA_DISTANCE,
      );
      camera.lookAt(0, 0, 0);

      const root = new THREE.Group();
      root.rotation.x = -0.18;
      scene.add(root);

      const ambientLight = new THREE.AmbientLight(0xffffff, 1.32);
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
      keyLight.position.set(4.5, 6.5, 5);
      const fillLight = new THREE.DirectionalLight(0x79b7ff, 0.92);
      fillLight.position.set(-5, 2, 3);
      scene.add(ambientLight, keyLight, fillLight);

      const ground = new THREE.GridHelper(6, 8, 0x2a3340, 0x202833);
      ground.position.y = -2.24;
      ground.position.z = -0.58;
      ground.rotation.x = Math.PI / 2;
      ground.material.opacity = 0.34;
      ground.material.transparent = true;
      root.add(ground);

      structure.layers.forEach((layer, layerIndex) => {
        const { edges, mesh } = createLayerMesh(THREE, layer, layerIndex);
        root.add(mesh, edges);
      });

      const resize = () => {
        const rect = container.getBoundingClientRect();
        const width = Math.max(1, Math.floor(rect.width));
        const height = Math.max(1, Math.floor(rect.height));
        renderer.setSize(width, height, false);
        fitCameraToContainer(camera, width, height);
      };

      let animationFrame = 0;
      const reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      const render = (time = 0) => {
        if (!reducedMotion) {
          root.rotation.y = Math.sin(time * 0.00034) * 0.14 - 0.18;
        }

        renderer.render(scene, camera);
        animationFrame = window.requestAnimationFrame(render);
      };

      resize();
      render();

      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);

      cleanupScene = () => {
        resizeObserver.disconnect();
        window.cancelAnimationFrame(animationFrame);
        disposeObject(THREE, root);
        ground.geometry.dispose();
        ground.material.dispose();
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
        className="relative min-h-[228px] overflow-hidden rounded-[16px] border border-white/8 bg-[radial-gradient(circle_at_50%_28%,rgba(255,255,255,0.08),rgba(255,255,255,0)_46%),linear-gradient(135deg,rgba(32,41,58,0.72),rgba(12,15,19,0.96))]"
        data-testid="lab-primitive-structure-render"
        ref={containerRef}
      >
        <div className="pointer-events-none absolute left-3 top-3 rounded-md border border-white/8 bg-black/18 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white/52">
          Orthographic
        </div>
      </div>
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
          {structure.layers.map((layer) => (
            <li
              className="grid min-w-0 grid-cols-[0.75rem_minmax(0,1fr)] gap-2 border-t border-white/8 pt-2"
              data-primitive-layer={layer.id}
              key={layer.id}
            >
              <span
                aria-hidden
                className="mt-1 size-3 rounded-[3px] border border-white/16"
                style={{ backgroundColor: layer.color }}
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
