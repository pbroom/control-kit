import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  LabPrimitiveStructure,
  LabPrimitiveStructureNode,
  LabPrimitiveStructureNodeRelation,
  LabPrimitiveStructureNodeSlot,
  LabPrimitiveStructureNodeState,
  LabPrimitiveStructureNodeView,
} from './types.js';

type ThreeModule = typeof import('three');
type ThreeObject3D = InstanceType<ThreeModule['Object3D']>;
type ThreeOrthographicCamera = InstanceType<ThreeModule['OrthographicCamera']>;
type ThreeMesh = InstanceType<ThreeModule['Mesh']>;
type ThreeMeshBasicMaterial = InstanceType<ThreeModule['MeshBasicMaterial']>;
type ThreeLineBasicMaterial = InstanceType<ThreeModule['LineBasicMaterial']>;

const STRUCTURE_CAMERA_DISTANCE = 8.2;
const STRUCTURE_FRUSTUM_SIZE = 7.35;
const STRUCTURE_CAMERA_PADDING = 1.24;
const STRUCTURE_CAMERA_SCREEN_OFFSET_X = 0.1;
const STRUCTURE_LAYER_GAP_Y = 0.64;
// Authored spans use twelfths; the resolver maps them onto a 24-cell grid
// so odd spans still center cleanly inside a parent.
const STRUCTURE_GRID_SIZE = 24;
const STRUCTURE_GRID_SPAN_UNITS = 12;
const STRUCTURE_GRID_CELLS_PER_SPAN_UNIT =
  STRUCTURE_GRID_SIZE / STRUCTURE_GRID_SPAN_UNITS;
const STRUCTURE_ROOT_GRID_WORLD_SIZE = 4.8;
const STRUCTURE_DEFAULT_VISIBLE_DEPTH = 1;
const STRUCTURE_MAX_PIXEL_RATIO = 2;
const STRUCTURE_CALLOUT_LABEL_X = 68;
const STRUCTURE_CALLOUT_LABEL_MIN_Y = 18;
const STRUCTURE_CALLOUT_LABEL_MAX_Y = 84;
const STRUCTURE_CALLOUT_LABEL_MIN_GAP_PX = 28;

const STRUCTURE_LAYER_CALLOUTS = [
  {
    labelX: STRUCTURE_CALLOUT_LABEL_X,
    labelY: 78,
    targetX: 59,
    targetY: 78,
  },
  {
    labelX: STRUCTURE_CALLOUT_LABEL_X,
    labelY: 66,
    targetX: 58,
    targetY: 66,
  },
  {
    labelX: STRUCTURE_CALLOUT_LABEL_X,
    labelY: 56,
    targetX: 52,
    targetY: 56,
  },
  {
    labelX: STRUCTURE_CALLOUT_LABEL_X,
    labelY: 45,
    targetX: 58,
    targetY: 45,
  },
  {
    labelX: STRUCTURE_CALLOUT_LABEL_X,
    labelY: 36,
    targetX: 44,
    targetY: 36,
  },
] as const;

type StructureCalloutPosition = {
  labelX: number;
  labelY: number;
  targetX: number;
  targetY: number;
};

type StructureCalloutPositions = Record<string, StructureCalloutPosition>;

type StructureLayerFrame = {
  height: number;
  width: number;
  x: number;
  z: number;
};

type StructureRenderLayer = {
  color: string;
  component: string;
  detail: string;
  height: number;
  id: string;
  label: string;
  layerIndex: number;
  opacity: number;
  parentId: string | null;
  path: readonly string[];
  relation: LabPrimitiveStructureNodeRelation;
  slot?: LabPrimitiveStructureNodeSlot;
  state: LabPrimitiveStructureNodeState;
  treeDepth: number;
  width: number;
  x: number;
  y: number;
  z: number;
};

type StructureNodeEntry = {
  component: string;
  detail: string;
  id: string;
  label: string;
  parentId: string | null;
  path: readonly string[];
  relation: LabPrimitiveStructureNodeRelation;
  slot?: LabPrimitiveStructureNodeSlot;
  state: LabPrimitiveStructureNodeState;
  treeDepth: number;
  view?: LabPrimitiveStructureNodeView;
};

type StructureLayerSceneBinding = {
  anchor: ThreeObject3D;
  baseColor: InstanceType<ThreeModule['Color']>;
  edgeColor: InstanceType<ThreeModule['Color']>;
  edgeMaterial: ThreeLineBasicMaterial;
  edgeOpacity: number;
  edges: ThreeObject3D;
  layerId: string;
  layerIndex: number;
  material: ThreeMeshBasicMaterial;
  mesh: ThreeMesh;
  mutedOpacity: number;
  opacity: number;
};

type StructureSceneControls = {
  resize: () => void;
  setActiveLayer: (layerId: string | null) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function gridSpanToCellSpan(span: number) {
  return (
    clamp(span, 1, STRUCTURE_GRID_SPAN_UNITS) *
    STRUCTURE_GRID_CELLS_PER_SPAN_UNIT
  );
}

function gridTrackStart(track: number | undefined, cellSpan: number) {
  return clamp(
    track ?? (STRUCTURE_GRID_SIZE - cellSpan) / 2,
    0,
    Math.max(0, STRUCTURE_GRID_SIZE - cellSpan),
  );
}

function resolveLayerFrame(
  view: LabPrimitiveStructureNodeView,
  parentFrame: StructureLayerFrame | null,
): StructureLayerFrame {
  if (view.layout) {
    const parent = parentFrame ?? {
      height: STRUCTURE_ROOT_GRID_WORLD_SIZE,
      width: STRUCTURE_ROOT_GRID_WORLD_SIZE,
      x: 0,
      z: 0,
    };
    const widthCellSpan = gridSpanToCellSpan(
      view.layout.width ?? STRUCTURE_GRID_SPAN_UNITS,
    );
    const heightCellSpan = gridSpanToCellSpan(
      view.layout.height ?? STRUCTURE_GRID_SPAN_UNITS,
    );
    const column = gridTrackStart(view.layout.column, widthCellSpan);
    const row = gridTrackStart(view.layout.row, heightCellSpan);
    const width = parent.width * (widthCellSpan / STRUCTURE_GRID_SIZE);
    const height = parent.height * (heightCellSpan / STRUCTURE_GRID_SIZE);
    const x =
      parent.x -
      parent.width / 2 +
      ((column + widthCellSpan / 2) / STRUCTURE_GRID_SIZE) * parent.width;
    const z =
      parent.z +
      parent.height / 2 -
      ((row + heightCellSpan / 2) / STRUCTURE_GRID_SIZE) * parent.height;

    return { height, width, x, z };
  }

  const parent = parentFrame ?? {
    height: STRUCTURE_ROOT_GRID_WORLD_SIZE,
    width: STRUCTURE_ROOT_GRID_WORLD_SIZE,
    x: 0,
    z: 0,
  };

  return {
    height: view.height ?? parent.height,
    width: view.width ?? parent.width,
    x: parent.x + (view.offsetX ?? 0),
    z: parent.z - (view.offsetY ?? 0),
  };
}

function createStructureNodeEntries(
  structure: LabPrimitiveStructure,
): readonly StructureNodeEntry[] {
  const entries: StructureNodeEntry[] = [];

  const visitNode = (
    node: LabPrimitiveStructureNode,
    treeDepth: number,
    parentId: string | null,
    parentPath: readonly string[],
  ) => {
    const path = [...parentPath, node.id];

    entries.push({
      component: node.component,
      detail: node.detail,
      id: node.id,
      label: node.label,
      parentId,
      path,
      relation: node.relation,
      slot: node.slot,
      state: node.state ?? 'default',
      treeDepth,
      view: node.view,
    });

    node.children?.forEach((childNode) => {
      visitNode(childNode, treeDepth + 1, node.id, path);
    });
  };

  visitNode(structure.root, 0, null, []);

  return entries;
}

function createStructureRenderLayers(
  structure: LabPrimitiveStructure,
): readonly StructureRenderLayer[] {
  const layers: StructureRenderLayer[] = [];
  const visibleDepth =
    structure.visibleDepth ?? STRUCTURE_DEFAULT_VISIBLE_DEPTH;
  const layerGap = structure.defaultLayerGap ?? STRUCTURE_LAYER_GAP_Y;

  const visitNode = (
    node: LabPrimitiveStructureNode,
    treeDepth: number,
    renderDepth: number,
    parentFrame: StructureLayerFrame | null,
    parentId: string | null,
    parentPath: readonly string[],
  ) => {
    const path = [...parentPath, node.id];
    const nextRenderDepth = node.view ? renderDepth + 1 : renderDepth;
    const frame = node.view
      ? resolveLayerFrame(node.view, parentFrame)
      : parentFrame;

    if (node.view && nextRenderDepth <= visibleDepth) {
      const layerIndex = layers.length;

      layers.push({
        color: node.view.color,
        component: node.component,
        detail: node.detail,
        height: frame?.height ?? STRUCTURE_ROOT_GRID_WORLD_SIZE,
        id: node.id,
        label: node.label,
        layerIndex,
        opacity: node.view.opacity ?? 0.82,
        parentId,
        path,
        relation: node.relation,
        slot: node.slot,
        state: node.state ?? 'default',
        treeDepth,
        width: frame?.width ?? STRUCTURE_ROOT_GRID_WORLD_SIZE,
        x: frame?.x ?? 0,
        y: layerIndex * layerGap + (node.view.offsetZ ?? 0) * 0.1,
        z: frame?.z ?? 0,
      });
    }

    node.children?.forEach((childNode) => {
      visitNode(
        childNode,
        treeDepth + 1,
        nextRenderDepth,
        frame,
        node.id,
        path,
      );
    });
  };

  visitNode(structure.root, 0, -1, null, null, []);

  return layers;
}

function structureLayerCallout(layerIndex: number) {
  return STRUCTURE_LAYER_CALLOUTS[
    Math.min(layerIndex, STRUCTURE_LAYER_CALLOUTS.length - 1)
  ];
}

function createStructureMaterial(
  THREE: ThreeModule,
  color: string,
  opacity: number,
) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    depthWrite: false,
    opacity,
    side: THREE.DoubleSide,
    transparent: true,
  });
}

function createLayerGroup(THREE: ThreeModule, layer: StructureRenderLayer) {
  const group = new THREE.Group();
  const opacity = layer.opacity;
  const geometry = new THREE.PlaneGeometry(layer.width, layer.height);
  const baseColor = new THREE.Color(layer.color);
  const edgeColor = baseColor.clone().lerp(new THREE.Color('#ffffff'), 0.48);
  const material = createStructureMaterial(THREE, layer.color, opacity);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.name = layer.id;
  mesh.userData.component = layer.component;
  mesh.userData.layerId = layer.id;
  mesh.userData.layerIndex = layer.layerIndex;
  mesh.userData.parentId = layer.parentId;
  mesh.userData.path = layer.path.join('/');
  mesh.userData.relation = layer.relation;
  mesh.userData.slot = layer.slot;
  mesh.userData.state = layer.state;
  mesh.userData.treeDepth = layer.treeDepth;
  mesh.renderOrder = layer.layerIndex * 2;

  const edgeOpacity = layer.layerIndex === 0 ? 0.48 : 0.72;
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: edgeColor,
    depthWrite: false,
    opacity: edgeOpacity,
    transparent: true,
  });
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    edgeMaterial,
  );
  edges.rotation.x = -Math.PI / 2;
  edges.name = `${layer.id}-edges`;
  edges.renderOrder = mesh.renderOrder + 1;

  const anchor = new THREE.Object3D();
  anchor.name = `${layer.id}-callout-anchor`;
  anchor.position.set(layer.width * 0.3, 0, 0);

  group.name = `${layer.id}-assembly-layer`;
  group.position.set(layer.x, layer.y, layer.z);
  group.add(mesh, edges, anchor);

  return {
    anchor,
    baseColor,
    edgeColor,
    edgeMaterial,
    edgeOpacity,
    edges,
    group,
    layerId: layer.id,
    layerIndex: layer.layerIndex,
    material,
    mesh,
    mutedOpacity: Math.max(0.14, opacity * 0.38),
    opacity,
  };
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

function fitCameraToStructure(
  THREE: ThreeModule,
  camera: ThreeOrthographicCamera,
  root: ThreeObject3D,
  width: number,
  height: number,
) {
  const aspect = width / height;
  const bounds = new THREE.Box3().setFromObject(root);

  if (bounds.isEmpty()) {
    fitCameraToContainer(camera, width, height);
    return;
  }

  const center = bounds.getCenter(new THREE.Vector3());
  camera.position.set(
    center.x + STRUCTURE_CAMERA_DISTANCE * 0.86,
    center.y + STRUCTURE_CAMERA_DISTANCE * 0.72,
    center.z + STRUCTURE_CAMERA_DISTANCE,
  );
  camera.lookAt(center);
  camera.updateMatrixWorld(true);

  const min = bounds.min;
  const max = bounds.max;
  const cameraSpaceCorners = [
    new THREE.Vector3(min.x, min.y, min.z),
    new THREE.Vector3(min.x, min.y, max.z),
    new THREE.Vector3(min.x, max.y, min.z),
    new THREE.Vector3(min.x, max.y, max.z),
    new THREE.Vector3(max.x, min.y, min.z),
    new THREE.Vector3(max.x, min.y, max.z),
    new THREE.Vector3(max.x, max.y, min.z),
    new THREE.Vector3(max.x, max.y, max.z),
  ].map((corner) => corner.applyMatrix4(camera.matrixWorldInverse));
  const viewBounds = cameraSpaceCorners.reduce(
    (result, corner) => ({
      maxX: Math.max(result.maxX, corner.x),
      maxY: Math.max(result.maxY, corner.y),
      minX: Math.min(result.minX, corner.x),
      minY: Math.min(result.minY, corner.y),
    }),
    {
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
    },
  );
  const viewWidth =
    (viewBounds.maxX - viewBounds.minX) * STRUCTURE_CAMERA_PADDING;
  const viewHeight =
    (viewBounds.maxY - viewBounds.minY) * STRUCTURE_CAMERA_PADDING;
  const frustumHeight = Math.max(viewHeight, viewWidth / aspect);
  const frustumWidth = frustumHeight * aspect;
  const centerX =
    (viewBounds.minX + viewBounds.maxX) / 2 +
    frustumWidth * STRUCTURE_CAMERA_SCREEN_OFFSET_X;
  const centerY = (viewBounds.minY + viewBounds.maxY) / 2;

  camera.left = centerX - frustumWidth / 2;
  camera.right = centerX + frustumWidth / 2;
  camera.top = centerY + frustumHeight / 2;
  camera.bottom = centerY - frustumHeight / 2;
  camera.updateProjectionMatrix();
}

function projectLayerAnchor(
  THREE: ThreeModule,
  anchor: ThreeObject3D,
  camera: ThreeOrthographicCamera,
) {
  const worldPosition = new THREE.Vector3();
  anchor.getWorldPosition(worldPosition);
  worldPosition.project(camera);

  return {
    x: (worldPosition.x * 0.5 + 0.5) * 100,
    y: (1 - (worldPosition.y * 0.5 + 0.5)) * 100,
  };
}

function createProjectedCallouts(
  THREE: ThreeModule,
  layerBindings: StructureLayerSceneBinding[],
  camera: ThreeOrthographicCamera,
  height: number,
) {
  const labelMinGap = clamp(
    (STRUCTURE_CALLOUT_LABEL_MIN_GAP_PX / height) * 100,
    6.4,
    11,
  );
  const projectedEntries = layerBindings
    .map((binding) => {
      const projected = projectLayerAnchor(THREE, binding.anchor, camera);

      return {
        binding,
        desiredLabelY: clamp(
          projected.y,
          STRUCTURE_CALLOUT_LABEL_MIN_Y,
          STRUCTURE_CALLOUT_LABEL_MAX_Y,
        ),
        targetX: clamp(projected.x, 4, STRUCTURE_CALLOUT_LABEL_X - 5),
        targetY: clamp(projected.y, 10, 90),
      };
    })
    .sort((left, right) => left.desiredLabelY - right.desiredLabelY);

  let previousY = STRUCTURE_CALLOUT_LABEL_MIN_Y - labelMinGap;
  const spacedEntries = projectedEntries.map((entry) => {
    const labelY = Math.max(entry.desiredLabelY, previousY + labelMinGap);
    previousY = labelY;

    return {
      ...entry,
      labelY,
    };
  });
  const overflow =
    (spacedEntries.at(-1)?.labelY ?? STRUCTURE_CALLOUT_LABEL_MAX_Y) -
    STRUCTURE_CALLOUT_LABEL_MAX_Y;

  if (overflow > 0) {
    spacedEntries.forEach((entry) => {
      entry.labelY -= overflow;
    });

    for (let index = spacedEntries.length - 2; index >= 0; index -= 1) {
      spacedEntries[index]!.labelY = Math.min(
        spacedEntries[index]!.labelY,
        spacedEntries[index + 1]!.labelY - labelMinGap,
      );
    }
  }

  return spacedEntries.reduce<StructureCalloutPositions>((callouts, entry) => {
    callouts[entry.binding.layerId] = {
      labelX: STRUCTURE_CALLOUT_LABEL_X,
      labelY: Number(
        clamp(
          entry.labelY,
          STRUCTURE_CALLOUT_LABEL_MIN_Y,
          STRUCTURE_CALLOUT_LABEL_MAX_Y,
        ).toFixed(2),
      ),
      targetX: Number(entry.targetX.toFixed(2)),
      targetY: Number(entry.targetY.toFixed(2)),
    };

    return callouts;
  }, {});
}

function areCalloutPositionsEqual(
  left: StructureCalloutPositions,
  right: StructureCalloutPositions,
) {
  const leftEntries = Object.entries(left);

  if (leftEntries.length !== Object.keys(right).length) {
    return false;
  }

  return leftEntries.every(([layerId, leftCallout]) => {
    const rightCallout = right[layerId];

    return (
      rightCallout !== undefined &&
      leftCallout.labelX === rightCallout.labelX &&
      leftCallout.labelY === rightCallout.labelY &&
      leftCallout.targetX === rightCallout.targetX &&
      leftCallout.targetY === rightCallout.targetY
    );
  });
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
  structureTitle: string,
  layers: readonly StructureRenderLayer[],
  containerRef: RefObject<HTMLDivElement | null>,
  isActive: boolean,
  activeLayerId: string | null,
  setActiveLayerId: Dispatch<SetStateAction<string | null>>,
  setProjectedCallouts: Dispatch<SetStateAction<StructureCalloutPositions>>,
) {
  const sceneControlsRef = useRef<StructureSceneControls | null>(null);
  const activeLayerIdRef = useRef(activeLayerId);

  useEffect(() => {
    activeLayerIdRef.current = activeLayerId;
    sceneControlsRef.current?.setActiveLayer(activeLayerId);
  }, [activeLayerId]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let firstFrame = 0;
    let secondFrame = 0;

    firstFrame = requestAnimationFrame(() => {
      sceneControlsRef.current?.resize();
      secondFrame = requestAnimationFrame(() => {
        sceneControlsRef.current?.resize();
      });
    });

    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [isActive]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    let cleanupScene: (() => void) | null = null;
    let isDisposed = false;

    setProjectedCallouts({});

    void import('three')
      .then((THREE) => {
        if (isDisposed) {
          return;
        }

        let renderer: InstanceType<ThreeModule['WebGLRenderer']>;

        try {
          renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            preserveDrawingBuffer: true,
          });
        } catch {
          container.setAttribute(
            'data-primitive-structure-renderer',
            'fallback',
          );
          return;
        }

        container.setAttribute('data-primitive-structure-renderer', 'webgl');
        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(
          Math.min(window.devicePixelRatio || 1, STRUCTURE_MAX_PIXEL_RATIO),
        );
        renderer.domElement.setAttribute('aria-label', structureTitle);
        renderer.domElement.setAttribute(
          'data-testid',
          'lab-primitive-structure-canvas',
        );
        renderer.domElement.setAttribute('data-primitive-structure-axis', 'y');
        renderer.domElement.setAttribute(
          'data-primitive-structure-geometry',
          'plane-grid',
        );
        renderer.domElement.setAttribute(
          'data-primitive-structure-layout',
          '24-grid',
        );
        renderer.domElement.setAttribute(
          'data-primitive-structure-layer-gap',
          'uniform',
        );
        renderer.domElement.setAttribute(
          'data-primitive-structure-guides',
          'callouts',
        );
        renderer.domElement.setAttribute(
          'data-primitive-structure-interaction',
          'raycast',
        );
        renderer.domElement.setAttribute(
          'data-primitive-structure-motion',
          'static',
        );
        renderer.domElement.setAttribute(
          'data-primitive-structure-palette',
          'layer-colors',
        );
        renderer.domElement.setAttribute('role', 'img');
        renderer.domElement.className = 'h-full w-full';
        renderer.domElement.style.display = 'block';
        container.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 80);

        const root = new THREE.Group();
        root.rotation.y = -0.12;
        scene.add(root);

        const layerBindings = layers.map((layer) => {
          const binding = createLayerGroup(THREE, layer);
          root.add(binding.group);

          return binding;
        });
        const pickableMeshes = layerBindings.map((binding) => binding.mesh);
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        let canvasHoverLayerId: string | null = null;
        const previousCursor = renderer.domElement.style.cursor;

        const renderScene = () => {
          renderer.render(scene, camera);
        };

        const setActiveLayer = (nextActiveLayerId: string | null) => {
          layerBindings.forEach((binding) => {
            const isActive = nextActiveLayerId === binding.layerId;
            const isMuted =
              nextActiveLayerId !== null &&
              nextActiveLayerId !== binding.layerId;
            const activeColor = binding.baseColor
              .clone()
              .lerp(new THREE.Color('#ffffff'), 0.16);

            binding.material.color.copy(
              isActive ? activeColor : binding.baseColor,
            );
            binding.material.opacity = isActive
              ? Math.min(0.98, binding.opacity + 0.16)
              : isMuted
                ? binding.mutedOpacity
                : binding.opacity;
            binding.edgeMaterial.color.copy(
              isActive
                ? new THREE.Color('#ffffff')
                : isMuted
                  ? binding.edgeColor
                      .clone()
                      .lerp(new THREE.Color('#0b0f14'), 0.2)
                  : binding.edgeColor,
            );
            binding.edgeMaterial.opacity = isActive
              ? 0.92
              : isMuted
                ? 0.24
                : binding.edgeOpacity;
          });

          renderScene();
        };

        const commitProjectedCallouts = (height: number) => {
          const nextCallouts = createProjectedCallouts(
            THREE,
            layerBindings,
            camera,
            height,
          );
          setProjectedCallouts((currentCallouts) =>
            areCalloutPositionsEqual(currentCallouts, nextCallouts)
              ? currentCallouts
              : nextCallouts,
          );
        };

        const pickLayerAtPointer = (event: PointerEvent) => {
          const rect = renderer.domElement.getBoundingClientRect();

          if (rect.width <= 0 || rect.height <= 0) {
            return null;
          }

          pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointer, camera);

          const [intersection] = raycaster.intersectObjects(
            pickableMeshes,
            false,
          );

          return typeof intersection?.object.userData.layerId === 'string'
            ? intersection.object.userData.layerId
            : null;
        };

        const onCanvasPointerMove = (event: PointerEvent) => {
          const nextLayerId = pickLayerAtPointer(event);

          if (nextLayerId === canvasHoverLayerId) {
            return;
          }

          canvasHoverLayerId = nextLayerId;
          renderer.domElement.style.cursor = nextLayerId
            ? 'pointer'
            : previousCursor;
          setActiveLayerId(nextLayerId);
        };

        const onCanvasPointerLeave = () => {
          canvasHoverLayerId = null;
          renderer.domElement.style.cursor = previousCursor;
          setActiveLayerId(null);
        };

        renderer.domElement.addEventListener(
          'pointermove',
          onCanvasPointerMove,
        );
        renderer.domElement.addEventListener(
          'pointerleave',
          onCanvasPointerLeave,
        );

        const resize = () => {
          const rect = container.getBoundingClientRect();
          const width = Math.floor(rect.width);
          const height = Math.floor(rect.height);

          if (width < 2 || height < 2) {
            return;
          }

          renderer.setPixelRatio(
            Math.min(window.devicePixelRatio || 1, STRUCTURE_MAX_PIXEL_RATIO),
          );
          renderer.setSize(width, height, false);
          fitCameraToStructure(THREE, camera, root, width, height);
          commitProjectedCallouts(height);
          renderScene();
        };

        resize();
        setActiveLayer(activeLayerIdRef.current);
        sceneControlsRef.current = {
          resize,
          setActiveLayer,
        };

        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);

        cleanupScene = () => {
          sceneControlsRef.current = null;
          renderer.domElement.removeEventListener(
            'pointermove',
            onCanvasPointerMove,
          );
          renderer.domElement.removeEventListener(
            'pointerleave',
            onCanvasPointerLeave,
          );
          resizeObserver.disconnect();
          disposeObject(THREE, root);
          renderer.dispose();
          renderer.domElement.remove();
          container.removeAttribute('data-primitive-structure-renderer');
        };
      })
      .catch(() => {
        if (!isDisposed) {
          container.setAttribute(
            'data-primitive-structure-renderer',
            'fallback',
          );
        }
      });

    return () => {
      isDisposed = true;
      cleanupScene?.();
    };
  }, [
    containerRef,
    layers,
    setActiveLayerId,
    setProjectedCallouts,
    structureTitle,
  ]);
}

function nodeMatchesActivePath(
  node: StructureNodeEntry,
  activePath: readonly string[] | null,
) {
  return activePath !== null && activePath.includes(node.id);
}

function nodeContainsActiveLayer(
  node: StructureNodeEntry,
  activePath: readonly string[] | null,
) {
  return (
    activePath !== null &&
    node.path.every((id, index) => activePath[index] === id)
  );
}

function isStructureNodeMuted(
  node: StructureNodeEntry,
  activePath: readonly string[] | null,
) {
  if (activePath === null) {
    return false;
  }

  return (
    !nodeMatchesActivePath(node, activePath) &&
    !nodeContainsActiveLayer(node, activePath)
  );
}

function formatNodeMeta(node: StructureNodeEntry) {
  return [
    node.component,
    node.slot,
    node.state !== 'default' ? node.state : null,
  ]
    .filter(Boolean)
    .join(' / ');
}

export function LabPrimitiveStructureView({
  isActive,
  structure,
}: {
  isActive: boolean;
  structure: LabPrimitiveStructure;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [projectedCallouts, setProjectedCallouts] =
    useState<StructureCalloutPositions>({});
  const nodeEntries = useMemo(
    () => createStructureNodeEntries(structure),
    [structure],
  );
  const layers = useMemo(
    () => createStructureRenderLayers(structure),
    [structure],
  );
  const activePath = useMemo(() => {
    if (activeLayerId === null) {
      return null;
    }

    return (
      nodeEntries.find((node) => node.id === activeLayerId)?.path ?? [
        activeLayerId,
      ]
    );
  }, [activeLayerId, nodeEntries]);
  usePrimitiveStructureScene(
    structure.title,
    layers,
    containerRef,
    isActive,
    activeLayerId,
    setActiveLayerId,
    setProjectedCallouts,
  );
  const calloutEntries = useMemo(
    () =>
      layers
        .map((layer, layerIndex) => ({
          callout:
            projectedCallouts[layer.id] ?? structureLayerCallout(layerIndex),
          layer,
          layerIndex,
        }))
        .reverse(),
    [layers, projectedCallouts],
  );

  return (
    <div
      className="relative grid min-h-0 min-w-0 gap-4 lg:grid-cols-[minmax(320px,1fr)_minmax(260px,0.62fr)] lg:items-stretch"
      data-primitive-structure-hover-layer={activeLayerId ?? undefined}
      data-primitive-structure-label-renderer="svg-callouts"
      data-primitive-structure-schema="node-tree"
      data-testid="lab-primitive-structure-shell"
    >
      <div
        aria-label={`${structure.title} orthographic render`}
        className="relative min-h-[320px] overflow-hidden"
        data-primitive-structure-surface="transparent"
        data-testid="lab-primitive-structure-render"
        ref={containerRef}
      >
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1] h-full w-full"
          data-testid="lab-primitive-structure-callouts"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          {calloutEntries.map(({ callout, layer }) => {
            const isMuted =
              activeLayerId !== null && activeLayerId !== layer.id;
            const isActive = activeLayerId === layer.id;

            return (
              <g
                className={[
                  'transition-opacity duration-300',
                  isMuted ? 'opacity-30' : 'opacity-100',
                ]
                  .filter(Boolean)
                  .join(' ')}
                data-primitive-callout={layer.id}
                key={layer.id}
              >
                <path
                  d={`M ${callout.targetX} ${callout.targetY} L ${callout.labelX} ${callout.labelY}`}
                  data-primitive-callout-hit={layer.id}
                  fill="none"
                  stroke="rgba(255,255,255,0.001)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="8"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  className={isActive ? 'stroke-white/72' : 'stroke-white/42'}
                  d={`M ${callout.targetX} ${callout.targetY} L ${callout.labelX} ${callout.labelY}`}
                  data-primitive-callout-line={layer.id}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  className="fill-transparent"
                  cx={callout.targetX}
                  cy={callout.targetY}
                  data-primitive-callout-target={layer.id}
                  r="3.2"
                />
              </g>
            );
          })}
        </svg>
        {calloutEntries.map(({ callout, layer }) => {
          const isMuted = activeLayerId !== null && activeLayerId !== layer.id;
          const isActive = activeLayerId === layer.id;

          return (
            <span
              aria-hidden
              className={[
                'pointer-events-none absolute z-[2] size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border bg-[#111827]',
                'shadow-[0_0_0_1px_rgba(0,0,0,0.28)] transition-[border-color,opacity] duration-300',
                isActive ? 'border-white/90' : 'border-white/60',
                isMuted ? 'opacity-35' : 'opacity-100',
              ]
                .filter(Boolean)
                .join(' ')}
              data-primitive-callout-dot={layer.id}
              key={layer.id}
              style={{
                left: `${callout.targetX}%`,
                top: `${callout.targetY}%`,
              }}
            />
          );
        })}
        {calloutEntries.map(({ callout, layer }) => {
          const isMuted = activeLayerId !== null && activeLayerId !== layer.id;
          const isActive = activeLayerId === layer.id;

          return (
            <div
              className={[
                'absolute z-[2] flex min-h-5 w-[min(128px,29%)] -translate-y-1/2 items-center rounded-none px-2 py-0',
                'bg-[#151515]/86 text-[10px] font-medium leading-3 text-white/78',
                'transition-[color,opacity] duration-300',
                isActive ? 'text-white/92' : null,
                isMuted ? 'opacity-30' : 'opacity-100',
              ]
                .filter(Boolean)
                .join(' ')}
              data-primitive-callout-label={layer.id}
              data-primitive-callout-label-text={layer.id}
              key={layer.id}
              style={{
                left: `${callout.labelX}%`,
                top: `${callout.labelY}%`,
              }}
            >
              <span className="min-w-0 truncate">{layer.label}</span>
            </div>
          );
        })}
      </div>
      <div className="relative z-[2] min-h-0 min-w-0 space-y-3">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold leading-5 text-white/92">
            {structure.title}
          </h2>
          <p className="max-w-[52ch] text-xs leading-5 text-white/50">
            {structure.summary}
          </p>
        </div>
        <ul
          className="relative grid min-w-0 gap-1.5"
          data-testid="lab-primitive-structure-callout-labels"
        >
          {nodeEntries.map((node) => {
            const isMuted = isStructureNodeMuted(node, activePath);
            const isActive = activeLayerId === node.id;
            const hasRenderLayer = layers.some((layer) => layer.id === node.id);
            const meta = formatNodeMeta(node);

            return (
              <li
                className={[
                  'min-w-0 border-t border-white/8 pt-1.5 transition-opacity duration-300 first:border-t-0 first:pt-0',
                  isActive ? 'text-white' : null,
                  isMuted ? 'opacity-35' : 'opacity-100',
                ]
                  .filter(Boolean)
                  .join(' ')}
                data-primitive-callout-layer={
                  hasRenderLayer ? 'true' : undefined
                }
                data-primitive-component={node.component}
                data-primitive-depth={node.treeDepth}
                data-primitive-layer={node.id}
                data-primitive-node={node.id}
                data-primitive-parent={node.parentId ?? undefined}
                data-primitive-relation={node.relation}
                data-primitive-slot={node.slot}
                key={node.id}
                style={{
                  paddingLeft: `${Math.min(node.treeDepth, 4) * 12}px`,
                }}
              >
                <span className="min-w-0">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="block min-w-0 truncate text-xs font-semibold text-white/86">
                      {node.label}
                    </span>
                    {node.relation !== 'root' ? (
                      <span className="shrink-0 rounded-[4px] border border-white/8 px-1 py-0 text-[9px] font-medium uppercase leading-3 text-white/38">
                        {node.relation}
                      </span>
                    ) : null}
                  </span>
                  {meta ? (
                    <span className="block truncate text-[9px] font-medium uppercase leading-3 text-white/34">
                      {meta}
                    </span>
                  ) : null}
                  <span className="block text-[11px] leading-4 text-white/46">
                    {node.detail}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
