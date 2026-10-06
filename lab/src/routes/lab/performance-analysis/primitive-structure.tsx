import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  type LabelBody,
  type LabelBounds,
  type LabelTarget,
  snapLabels,
  stepLabels,
} from './structure-labels.js';
import {
  selectStructureLayer,
  setStructureRootSize,
  useStructureEditorState,
} from './structure-editor-store.js';
import {
  buildStructureFigure,
  fitStructureCamera,
  frameStructureCamera,
  structureFrameOverlay,
  offsetStructureMeasurement,
  type StructureFigureRegion,
  type StructureRect,
  unionRects,
  type Vec2,
} from './structure-iso.js';
import {
  findLabPreviewHost,
  measurePrimitiveStructure,
  trackLiveSlabs,
  type StructureGhostCache,
  type StructureMeasurement,
} from './structure-measure.js';
import { structureLayerOffsets } from './structure-overrides.js';
import type { StructureDemoOverride } from './structure-overrides-schema.js';
import type {
  LabPrimitiveStructure,
  LabPrimitiveStructureNode,
  LabPrimitiveStructureNodeRelation,
  LabPrimitiveStructureNodeSlot,
  LabPrimitiveStructureNodeState,
} from './types.js';

/*
 * The Structure tab: the selected primitive, measured from the live preview
 * and drawn as an exploded isometric line figure in the manner of Hairline
 * (https://github.com/lucasmarkes/hairline, MIT). The figure is plain SVG:
 * filled plates painted back to front, 1-device-pixel non-scaling strokes,
 * DOM hit-testing for hover, and no frame loop unless the gap is animating.
 */

const STRUCTURE_CALLOUT_LABEL_X = 70;
const STRUCTURE_CALLOUT_LABEL_MIN_Y = 12;
const STRUCTURE_CALLOUT_LABEL_MAX_Y = 88;
/** Clear space between two label boxes. */
const STRUCTURE_CALLOUT_LABEL_GAP_PX = 4;
const STRUCTURE_FIGURE_RIGHT = 0.64;
const STRUCTURE_FIGURE_PADDING = 18;
const STRUCTURE_DEFAULT_EXPLODE = 0.75;
const STRUCTURE_EXPLODE_SMOOTHING_MS = 90;
/** Vertical drag distance, as a share of the render height, for the full range. */
const STRUCTURE_DRAG_RANGE = 0.6;
const STRUCTURE_KEY_STEP = 0.05;
const STRUCTURE_PAGE_STEP = 0.2;

const STRUCTURE_PALETTE = {
  // Lids are a lighter neutral than the panel (#171717), sides darker, so
  // painted parts read as solid plates; strokes step down edge > text > mid > lo.
  '--structure-accent': '#4ba3ff',
  '--structure-accent-top': 'color-mix(in srgb, #4ba3ff 22%, #26272b)',
  '--structure-edge': '#a6a9b1',
  '--structure-frame': '#5b5e66',
  '--structure-hi': '#eef0f3',
  '--structure-lo': '#4b4d54',
  '--structure-mid': '#7b7e88',
  '--structure-plate': '#26272b',
  '--structure-side': '#0e0e10',
  '--structure-text': '#b9bdc5',
  '--structure-text-fill': '#3a3c42',
} as CSSProperties;

type StructureCalloutPosition = {
  /** Horizontal slide (px) while passing another label. */
  dx: number;
  labelX: number;
  labelY: number;
  targetX: number;
  targetY: number;
};

type StructureNodeEntry = {
  component: string;
  detail: string;
  id: string;
  index: number;
  label: string;
  /** The config points this node at rendered element(s). */
  measurable: boolean;
  parentId: string | null;
  path: readonly string[];
  relation: LabPrimitiveStructureNodeRelation;
  slot?: LabPrimitiveStructureNodeSlot;
  state: LabPrimitiveStructureNodeState;
  treeDepth: number;
};

const STRUCTURE_CLICK_SLOP_PX = 4;

/** Popup extents seen per lab page, kept for the session. */
const FRAME_EXTENT_CACHE = new Map<string, StructureRect>();
/** Last measured rects per page and node, for ghost outlines. */
const GHOST_CACHE = new Map<string, StructureGhostCache>();

function ghostCacheFor(pageKey: string) {
  let cache = GHOST_CACHE.get(pageKey);

  if (!cache) {
    cache = new Map();
    GHOST_CACHE.set(pageKey, cache);
  }

  return cache;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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
      index: entries.length,
      label: node.label,
      measurable: node.measure !== undefined,
      parentId,
      path,
      relation: node.relation,
      slot: node.slot,
      state: node.state ?? 'default',
      treeDepth,
    });

    node.children?.forEach((childNode) => {
      visitNode(childNode, treeDepth + 1, node.id, path);
    });
  };

  visitNode(structure.root, 0, null, []);

  return entries;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true,
  );

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');

    if (!query) return;

    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);

    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

/**
 * Measures the primitive in the preview and keeps the result current. All
 * triggers (resize, DOM/attribute changes, portals opening, focus, transitions)
 * coalesce into at most one read pass per frame, and an unchanged snapshot
 * does not re-render.
 */
function useStructureMeasurement(
  structure: LabPrimitiveStructure,
  pageKey: string,
) {
  const [measurement, setMeasurement] = useState<StructureMeasurement | null>(
    null,
  );

  useEffect(() => {
    let frame = 0;
    let retryTimer = 0;
    let observedHost: Element | null = null;
    let signature = '';
    // A drag in the preview mutates it every frame. While it lasts, only the
    // percentage-positioned parts (thumbs) are moved, from their inline
    // style/data values (no layout reads); a full measure follows release.
    let pointerActive = false;
    let deferred = false;
    let latest: StructureMeasurement | null = null;
    const resizeObserver = new ResizeObserver(() => schedule());
    const mutationObserver = new MutationObserver(() => schedule());
    const portalObserver = new MutationObserver(() => schedule());

    const observeHost = (host: Element | null) => {
      if (host === observedHost) return;

      resizeObserver.disconnect();
      mutationObserver.disconnect();
      observedHost = host;

      if (!host) return;

      resizeObserver.observe(host);
      for (const child of Array.from(host.querySelectorAll('*')).slice(0, 8)) {
        resizeObserver.observe(child);
      }
      mutationObserver.observe(host, {
        attributes: true,
        characterData: true,
        childList: true,
        subtree: true,
      });
    };

    const measure = () => {
      frame = 0;

      if (pointerActive) {
        deferred = true;

        if (latest) {
          const tracked = trackLiveSlabs(latest);

          if (tracked !== latest) {
            latest = tracked;
            setMeasurement(tracked);
          }
        }

        return;
      }

      const host = findLabPreviewHost(pageKey);
      observeHost(host);

      if (!host) {
        window.clearTimeout(retryTimer);
        retryTimer = window.setTimeout(schedule, 200);
        return;
      }

      const next = measurePrimitiveStructure(
        structure,
        host,
        ghostCacheFor(pageKey),
      );
      const nextSignature = next?.signature ?? '';

      if (nextSignature !== signature) {
        signature = nextSignature;
        latest = next;
        setMeasurement(next);
      }
    };

    function schedule() {
      if (frame === 0) {
        frame = window.requestAnimationFrame(measure);
      }
    }

    const documentEvents = [
      'focusin',
      'focusout',
      'input',
      'transitionend',
      'animationend',
    ] as const;

    const onPointerDown = () => {
      pointerActive = true;
    };
    const onPointerEnd = () => {
      pointerActive = false;

      if (deferred) {
        deferred = false;
        schedule();
      }
    };

    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointerup', onPointerEnd, true);
    window.addEventListener('pointercancel', onPointerEnd, true);
    portalObserver.observe(document.body, { childList: true });
    documentEvents.forEach((type) =>
      document.addEventListener(type, schedule, true),
    );
    window.addEventListener('resize', schedule);
    setMeasurement(null);
    measure();

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(retryTimer);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      portalObserver.disconnect();
      documentEvents.forEach((type) =>
        document.removeEventListener(type, schedule, true),
      );
      window.removeEventListener('resize', schedule);
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('pointerup', onPointerEnd, true);
      window.removeEventListener('pointercancel', onPointerEnd, true);
    };
  }, [pageKey, structure]);

  return measurement;
}

/** Follows `target` with a short exponential ease, or jumps when `immediate`. */
function useEasedValue(target: number, immediate: boolean) {
  const [value, setValue] = useState(target);
  const valueRef = useRef(target);

  useEffect(() => {
    if (immediate) {
      valueRef.current = target;
      setValue(target);
      return;
    }

    let frame = 0;
    let last = performance.now();

    const step = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const current = valueRef.current;
      const next =
        current +
        (target - current) *
          (1 - Math.exp(-dt / STRUCTURE_EXPLODE_SMOOTHING_MS));
      const done = Math.abs(target - next) < 0.002;
      valueRef.current = done ? target : next;
      setValue(valueRef.current);

      if (!done) {
        frame = window.requestAnimationFrame(step);
      }
    };

    if (valueRef.current !== target) {
      frame = window.requestAnimationFrame(step);
    }

    return () => window.cancelAnimationFrame(frame);
  }, [immediate, target]);

  return value;
}

function useElementSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ height: 0, width: 0 });

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    const update = () => {
      const width = Math.floor(element.clientWidth);
      const height = Math.floor(element.clientHeight);
      setSize((current) =>
        current.width === width && current.height === height
          ? current
          : { height, width },
      );
    };
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();

    return () => observer.disconnect();
  }, [ref]);

  return size;
}

function useDevicePixelRatio() {
  const [ratio, setRatio] = useState(() =>
    typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1,
  );

  useEffect(() => {
    const query = window.matchMedia?.(
      `(resolution: ${window.devicePixelRatio || 1}dppx)`,
    );

    if (!query) return;

    const onChange = () => setRatio(window.devicePixelRatio || 1);
    query.addEventListener('change', onChange);

    return () => query.removeEventListener('change', onChange);
  }, [ratio]);

  return ratio;
}

/**
 * Runs the label springs only while they are moving: a frame loop starts
 * when targets change and stops once everything has settled.
 */
function useLabelSprings(
  targets: readonly LabelTarget[],
  bounds: LabelBounds,
  reducedMotion: boolean,
) {
  const [bodies, setBodies] = useState<LabelBody[]>([]);
  const bodiesRef = useRef<LabelBody[]>([]);
  const targetsRef = useRef(targets);
  const boundsRef = useRef(bounds);
  const frameRef = useRef(0);
  const key = JSON.stringify([
    bounds,
    targets.map((target) => [
      target.id,
      Math.round(target.targetY * 10) / 10,
      target.height,
      target.width,
    ]),
  ]);

  useEffect(() => {
    targetsRef.current = targets;
    boundsRef.current = bounds;

    const known = new Set(bodiesRef.current.map((body) => body.id));
    const fresh =
      bodiesRef.current.length === 0 ||
      targets.every((target) => !known.has(target.id));

    if (reducedMotion || fresh) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
      bodiesRef.current = snapLabels(targets, bounds);
      setBodies(bodiesRef.current);
      return;
    }

    if (frameRef.current !== 0) return;

    let last = performance.now();
    const tick = (now: number) => {
      const result = stepLabels(
        bodiesRef.current,
        targetsRef.current,
        boundsRef.current,
        Math.max(0, now - last) / 1000,
      );
      last = now;
      bodiesRef.current = result.bodies;
      setBodies(result.bodies);
      frameRef.current = result.settled
        ? 0
        : window.requestAnimationFrame(tick);
    };

    frameRef.current = window.requestAnimationFrame(tick);
  }, [key, reducedMotion]);

  useEffect(
    () => () => {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    },
    [],
  );

  return bodies;
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

function formatComponentTag(component: string) {
  return `<${component.toLowerCase()}>`;
}

export function LabPrimitiveStructureView({
  isActive,
  pageKey,
  structure,
}: {
  isActive: boolean;
  pageKey: string;
  structure: LabPrimitiveStructure;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    pressedNode: string | null;
    startExplode: number;
    startX: number;
    startY: number;
  } | null>(null);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  // Overrides and the selected layer are shared with the properties panel's
  // Structure section (dev builds edit them there).
  const editorState = useStructureEditorState();
  const isEditing = import.meta.env.DEV;
  const selectedLayerId = editorState.selectedLayerId;
  const demoOverride: StructureDemoOverride | undefined =
    editorState.overrides.demos[pageKey];
  const [explode, setExplode] = useState(STRUCTURE_DEFAULT_EXPLODE);
  const [isDragging, setIsDragging] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  // A drag follows the pointer directly; keys ease unless motion is reduced.
  const displayedExplode = useEasedValue(explode, reducedMotion || isDragging);
  const measurement = useStructureMeasurement(structure, pageKey);
  const size = useElementSize(containerRef);
  const devicePixelRatio = useDevicePixelRatio();
  const nodeEntries = useMemo(
    () => createStructureNodeEntries(structure),
    [structure],
  );
  const visibleNodeEntries = useMemo(
    () => nodeEntries.filter((node) => node.parentId !== null),
    [nodeEntries],
  );
  const region = useMemo<StructureFigureRegion>(
    () => ({
      x0: STRUCTURE_FIGURE_PADDING,
      x1: Math.max(
        STRUCTURE_FIGURE_PADDING + 1,
        size.width * STRUCTURE_FIGURE_RIGHT,
      ),
      y0: STRUCTURE_FIGURE_PADDING,
      y1: Math.max(
        STRUCTURE_FIGURE_PADDING + 1,
        size.height - STRUCTURE_FIGURE_PADDING,
      ),
    }),
    [size.height, size.width],
  );
  // The camera depends only on the root part's size, the structure's level
  // budget and the panel size, so moving or appearing parts never refit it.
  const rootWidth = measurement?.width ?? 0;
  const rootHeight = measurement?.height ?? 0;

  useEffect(() => {
    if (rootWidth > 0 && rootHeight > 0) {
      setStructureRootSize(pageKey, { height: rootHeight, width: rootWidth });
    }
  }, [pageKey, rootHeight, rootWidth]);
  const fitLevels = measurement?.fitLevels ?? 1;
  // Popups are framed from the start (config reserve plus anything seen
  // before for this page), so opening one never moves or rescales the figure.
  const [frameExtent, setFrameExtent] = useState<StructureRect | null>(
    () => FRAME_EXTENT_CACHE.get(pageKey) ?? null,
  );

  useEffect(() => {
    setFrameExtent(FRAME_EXTENT_CACHE.get(pageKey) ?? null);
  }, [pageKey, structure]);

  useEffect(() => {
    // Ghosts are present from the first measurement, so this normally only
    // grows when a popup opens somewhere other than where it was expected.
    const popups = (measurement?.slabs ?? []).filter(
      (slab) => slab.portal || slab.ghost,
    );

    if (popups.length === 0) return;

    setFrameExtent((current) => {
      const next = unionRects([current, ...popups]);

      if (
        !next ||
        (current &&
          next.x >= current.x - 0.5 &&
          next.y >= current.y - 0.5 &&
          next.width <= current.width + 0.5 &&
          next.height <= current.height + 0.5)
      ) {
        return current;
      }

      FRAME_EXTENT_CACHE.set(pageKey, next);
      return next;
    });
  }, [measurement, pageKey]);

  const camera = useMemo(
    () =>
      rootWidth > 0 && rootHeight > 0
        ? fitStructureCamera(
            { fitLevels, height: rootHeight, width: rootWidth },
            region,
            frameExtent,
          )
        : null,
    [fitLevels, frameExtent, region, rootHeight, rootWidth],
  );
  // Overrides: manual framing only moves/zooms the stable fit; manual layer
  // offsets only move their own part (and its children).
  const framedCamera = useMemo(
    () =>
      camera
        ? frameStructureCamera(
            camera,
            region,
            size,
            demoOverride?.framing.mode === 'manual'
              ? demoOverride.framing
              : null,
          )
        : null,
    [camera, demoOverride?.framing, region, size],
  );
  const layerOffsets = useMemo(
    () => structureLayerOffsets(pageKey, demoOverride),
    [demoOverride, pageKey],
  );
  const placedMeasurement = useMemo(
    () =>
      measurement
        ? offsetStructureMeasurement(measurement, layerOffsets)
        : null,
    [layerOffsets, measurement],
  );
  const figure = useMemo(
    () =>
      placedMeasurement && framedCamera && size.width > 0
        ? buildStructureFigure(
            placedMeasurement,
            displayedExplode,
            framedCamera,
          )
        : null,
    [displayedExplode, framedCamera, placedMeasurement, size.width],
  );
  const renderedNodeIds = useMemo(
    () =>
      new Set(
        (measurement?.slabs ?? [])
          .filter((slab) => !slab.ghost)
          .map((slab) => slab.nodeId),
      ),
    [measurement],
  );
  // Each node's leader lands on the rightmost lid point of its slabs.
  const anchors = useMemo(() => {
    const result = new Map<string, Vec2>();

    for (const slab of figure?.slabs ?? []) {
      const current = result.get(slab.nodeId);
      if (!current || slab.anchor[0] > current[0]) {
        result.set(slab.nodeId, slab.anchor);
      }
    }

    return result;
  }, [figure]);
  const calloutLayers = useMemo(
    () =>
      nodeEntries
        .filter((node) => anchors.has(node.id))
        .map((node) => ({ node })),
    [anchors, nodeEntries],
  );
  // Labels trail their parts on a spring (and jump under reduced motion):
  // each targets its leader anchor's height, neighbours keep their spacing,
  // and a label trading places with another slides aside to pass it.
  const labelElementsRef = useRef(new Map<string, HTMLElement>());
  const [labelSizes, setLabelSizes] = useState<
    Record<string, { height: number; width: number }>
  >({});
  const calloutIdsKey = calloutLayers.map(({ node }) => node.id).join(',');

  const labelTargets = useMemo<LabelTarget[]>(
    () =>
      calloutLayers.map(({ node }) => ({
        height: labelSizes[node.id]?.height ?? 20,
        id: node.id,
        targetY: anchors.get(node.id)![1],
        width: labelSizes[node.id]?.width ?? 100,
      })),
    [anchors, calloutLayers, labelSizes],
  );
  const labelBounds = useMemo<LabelBounds>(
    () => ({
      gap: STRUCTURE_CALLOUT_LABEL_GAP_PX,
      maxY: (size.height * STRUCTURE_CALLOUT_LABEL_MAX_Y) / 100,
      minY: (size.height * STRUCTURE_CALLOUT_LABEL_MIN_Y) / 100,
    }),
    [size.height],
  );
  const labelBodies = useLabelSprings(labelTargets, labelBounds, reducedMotion);
  const callouts: Record<string, StructureCalloutPosition> = {};

  if (size.width > 0 && size.height > 0) {
    for (const body of labelBodies) {
      const anchor = anchors.get(body.id);

      if (!anchor) continue;

      callouts[body.id] = {
        dx: body.dx,
        labelX: Number(
          (STRUCTURE_CALLOUT_LABEL_X + (body.dx / size.width) * 100).toFixed(2),
        ),
        labelY: Number(((body.y / size.height) * 100).toFixed(2)),
        targetX: Number(
          clamp((anchor[0] / size.width) * 100, 0, 100).toFixed(2),
        ),
        targetY: Number(
          clamp((anchor[1] / size.height) * 100, 0, 100).toFixed(2),
        ),
      };
    }
  }
  const labelsShown = labelBodies.length > 0;

  useLayoutEffect(() => {
    // Our own label elements only, once per label set or panel width.
    const next: Record<string, { height: number; width: number }> = {};

    for (const [id, element] of labelElementsRef.current) {
      next[id] = {
        height: element.offsetHeight || 20,
        width: element.offsetWidth || 100,
      };
    }

    setLabelSizes((current) =>
      JSON.stringify(current) === JSON.stringify(next) ? current : next,
    );
  }, [calloutIdsKey, labelsShown, size.width]);

  // Hover wins; in the editor the selected layer stays highlighted.
  const highlightId = activeLayerId ?? (isEditing ? selectedLayerId : null);
  const activePath = useMemo(() => {
    if (highlightId === null) {
      return null;
    }

    return (
      nodeEntries.find((node) => node.id === highlightId)?.path ?? [highlightId]
    );
  }, [highlightId, nodeEntries]);

  useEffect(() => {
    setActiveLayerId(null);
  }, [structure]);

  useEffect(() => {
    if (!isActive) setActiveLayerId(null);
  }, [isActive]);

  const onFigurePointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      // While dragging the gap, keep the highlight where the drag began.
      if (dragRef.current) return;

      const target = (event.target as Element).closest('[data-structure-node]');
      const nextLayerId = target?.getAttribute('data-structure-node') ?? null;
      setActiveLayerId((current) =>
        current === nextLayerId ? current : nextLayerId,
      );
    },
    [],
  );
  const onFigurePointerLeave = useCallback(() => {
    if (!dragRef.current) setActiveLayerId(null);
  }, []);

  // Drag up opens the stack, drag down closes it. Touch is ignored so the
  // page keeps scrolling on phones.
  const onRenderPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'touch' || event.button !== 0) return;

      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = {
        pointerId: event.pointerId,
        pressedNode:
          (event.target as Element)
            .closest('[data-structure-node]')
            ?.getAttribute('data-structure-node') ?? null,
        startExplode: explode,
        startX: event.clientX,
        startY: event.clientY,
      };
      setIsDragging(true);
    },
    [explode],
  );
  const onRenderPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;

      if (!drag || drag.pointerId !== event.pointerId) return;

      const range = Math.max(
        80,
        event.currentTarget.clientHeight * STRUCTURE_DRAG_RANGE,
      );
      setExplode(
        clamp(drag.startExplode + (drag.startY - event.clientY) / range, 0, 1),
      );
    },
    [],
  );
  const onRenderPointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;

      if (!drag || drag.pointerId !== event.pointerId) return;

      dragRef.current = null;
      setIsDragging(false);

      // In the editor a click (no real drag) on a slab selects that layer.
      if (
        isEditing &&
        drag.pressedNode &&
        event.type === 'pointerup' &&
        Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) <
          STRUCTURE_CLICK_SLOP_PX
      ) {
        selectStructureLayer(drag.pressedNode);
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [isEditing],
  );
  const onRenderKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const steps: Record<string, (value: number) => number> = {
        ArrowDown: (value) => value - STRUCTURE_KEY_STEP,
        ArrowUp: (value) => value + STRUCTURE_KEY_STEP,
        End: () => 1,
        Home: () => 0,
        PageDown: (value) => value - STRUCTURE_PAGE_STEP,
        PageUp: (value) => value + STRUCTURE_PAGE_STEP,
      };
      const step = steps[event.key];

      if (!step) return;

      event.preventDefault();
      setExplode((value) => Math.round(clamp(step(value), 0, 1) * 100) / 100);
    },
    [],
  );

  const stroke = Math.max(0.5, 1 / devicePixelRatio);
  // Dev only: outline the fixed render area and the auto-fit area within it.
  const frameOverlay =
    import.meta.env.DEV && demoOverride?.frame === true && size.width > 0
      ? structureFrameOverlay(size, region)
      : null;
  const explodePercent = Math.round(explode * 100);

  return (
    <div
      className="relative grid min-h-0 min-w-0 gap-4 lg:grid-cols-[minmax(320px,1fr)_minmax(260px,0.62fr)] lg:items-stretch"
      data-primitive-structure-hover-layer={activeLayerId ?? undefined}
      data-primitive-structure-selected-layer={
        isEditing ? (selectedLayerId ?? undefined) : undefined
      }
      data-primitive-structure-label-renderer="svg-callouts"
      data-primitive-structure-schema="node-tree"
      data-testid="lab-primitive-structure-shell"
    >
      <div className={['flex min-h-0 min-w-0 flex-col'].join(' ')}>
        <div
          aria-label="Exploded structure; use Up/Down arrows to adjust spacing"
          aria-orientation="vertical"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={explodePercent}
          aria-valuetext={`Layer spacing ${explodePercent}%`}
          className={[
            'relative min-h-[320px] flex-1 touch-pan-y overflow-hidden rounded-md outline-none select-none',
            'focus-visible:ring-1 focus-visible:ring-white/30',
            'pointer-fine:cursor-ns-resize',
          ].join(' ')}
          data-primitive-structure-dragging={isDragging ? 'true' : undefined}
          data-primitive-structure-explode={explode.toFixed(2)}
          data-primitive-structure-renderer="svg"
          data-primitive-structure-surface="transparent"
          data-testid="lab-primitive-structure-render"
          onKeyDown={onRenderKeyDown}
          onLostPointerCapture={onRenderPointerEnd}
          onPointerCancel={onRenderPointerEnd}
          onPointerDown={onRenderPointerDown}
          onPointerMove={onRenderPointerMove}
          onPointerUp={onRenderPointerEnd}
          ref={containerRef}
          role="slider"
          style={STRUCTURE_PALETTE}
          tabIndex={0}
        >
          <svg
            aria-label={structure.title}
            className="absolute inset-0 h-full w-full"
            data-primitive-structure-axis="z"
            data-primitive-structure-geometry="measured-dom"
            data-primitive-structure-guides="callouts"
            data-primitive-structure-interaction="hit-test"
            data-primitive-structure-layer-gap="adjustable"
            data-primitive-structure-layout="dom-rects"
            data-primitive-structure-motion={
              reducedMotion ? 'reduced' : 'on-demand'
            }
            data-primitive-structure-palette="hairline"
            data-primitive-structure-slabs={figure?.slabs.length ?? 0}
            data-testid="lab-primitive-structure-canvas"
            onPointerLeave={onFigurePointerLeave}
            onPointerMove={onFigurePointerMove}
            role="img"
            shapeRendering="geometricPrecision"
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox={`0 0 ${Math.max(1, size.width)} ${Math.max(1, size.height)}`}
          >
            {figure?.slabs.map((slab) => {
              const isLayerActive = highlightId === slab.nodeId;
              const isMuted = highlightId !== null && !isLayerActive;
              const markStroke = isLayerActive
                ? 'var(--structure-hi)'
                : isMuted
                  ? 'var(--structure-lo)'
                  : 'var(--structure-mid)';
              const textStroke = isLayerActive
                ? 'var(--structure-hi)'
                : isMuted
                  ? 'var(--structure-mid)'
                  : 'var(--structure-text)';
              const edgeStroke = isLayerActive
                ? 'var(--structure-accent)'
                : isMuted
                  ? 'var(--structure-mid)'
                  : 'var(--structure-edge)';
              const strokeProps = {
                fill: 'none',
                pointerEvents: 'none' as const,
                strokeWidth: stroke,
                vectorEffect: 'non-scaling-stroke' as const,
              };

              return (
                <g
                  data-structure-ghost={slab.ghost ? 'true' : undefined}
                  data-structure-level={slab.level}
                  data-structure-origin={`${slab.origin[0].toFixed(2)},${slab.origin[1].toFixed(2)}`}
                  data-structure-node={slab.nodeId}
                  data-structure-painted={slab.painted ? 'true' : 'false'}
                  data-structure-slab={slab.key}
                  key={slab.key}
                >
                  {slab.footprint && !slab.ghost ? (
                    <path
                      {...strokeProps}
                      d={slab.footprint}
                      data-structure-footprint=""
                      stroke={
                        isLayerActive
                          ? 'var(--structure-accent)'
                          : 'var(--structure-lo)'
                      }
                      strokeDasharray="2 3"
                    />
                  ) : null}
                  {slab.guide ? (
                    <path
                      {...strokeProps}
                      d={slab.guide}
                      data-structure-guide=""
                      stroke={
                        isLayerActive
                          ? 'var(--structure-mid)'
                          : 'var(--structure-lo)'
                      }
                      strokeDasharray="1 3"
                    />
                  ) : null}
                  {slab.side ? (
                    <path d={slab.side} fill="var(--structure-side)" />
                  ) : null}
                  <path
                    d={slab.top}
                    data-structure-top=""
                    fill={
                      slab.ghost
                        ? 'none'
                        : slab.painted
                          ? isLayerActive
                            ? 'var(--structure-accent-top)'
                            : 'var(--structure-plate)'
                          : 'transparent'
                    }
                    pointerEvents={slab.ghost ? 'none' : undefined}
                    stroke={
                      slab.ghost
                        ? isLayerActive
                          ? 'var(--structure-accent)'
                          : 'var(--structure-lo)'
                        : slab.painted
                          ? 'none'
                          : isLayerActive
                            ? 'var(--structure-accent)'
                            : markStroke
                    }
                    strokeDasharray={
                      slab.ghost ? '1 3' : slab.painted ? undefined : '2 3'
                    }
                    strokeWidth={stroke}
                    vectorEffect="non-scaling-stroke"
                  />
                  {slab.hatch ? (
                    <path
                      {...strokeProps}
                      d={slab.hatch}
                      stroke={
                        isLayerActive
                          ? 'var(--structure-mid)'
                          : 'var(--structure-lo)'
                      }
                    />
                  ) : null}
                  {slab.dashes ? (
                    <path
                      {...strokeProps}
                      d={slab.dashes}
                      data-structure-crosshair=""
                      stroke={
                        isMuted ? 'var(--structure-lo)' : 'var(--structure-mid)'
                      }
                      strokeDasharray="3 3"
                    />
                  ) : null}
                  {slab.rings ? (
                    <path {...strokeProps} d={slab.rings} stroke={markStroke} />
                  ) : null}
                  {slab.text ? (
                    <path
                      {...strokeProps}
                      d={slab.text}
                      data-structure-text=""
                      fill="var(--structure-text-fill)"
                      stroke={textStroke}
                    />
                  ) : null}
                  {slab.lines ? (
                    <path
                      {...strokeProps}
                      d={slab.lines}
                      data-structure-icon=""
                      stroke={
                        isMuted ? 'var(--structure-lo)' : 'var(--structure-hi)'
                      }
                    />
                  ) : null}
                  {slab.crease ? (
                    <path
                      {...strokeProps}
                      d={slab.crease}
                      stroke={markStroke}
                    />
                  ) : null}
                  {slab.side ? (
                    <path
                      {...strokeProps}
                      d={slab.side}
                      data-structure-silhouette=""
                      stroke={edgeStroke}
                    />
                  ) : null}
                  {slab.focus ? (
                    <path
                      {...strokeProps}
                      d={slab.focus}
                      stroke="var(--structure-accent)"
                      strokeDasharray="3 2"
                    />
                  ) : null}
                </g>
              );
            })}
            {frameOverlay ? (
              <g
                aria-hidden
                data-structure-frame=""
                fill="none"
                pointerEvents="none"
                stroke="var(--structure-frame)"
                strokeWidth={stroke}
                vectorEffect="non-scaling-stroke"
              >
                <path
                  d={frameOverlay.edge}
                  data-structure-frame-edge=""
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d={frameOverlay.fit}
                  data-structure-frame-fit=""
                  strokeDasharray="4 4"
                  strokeOpacity={0.7}
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d={frameOverlay.crosshair}
                  data-structure-frame-center=""
                  strokeOpacity={0.7}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            ) : null}
          </svg>
          {figure === null ? (
            <p
              className="absolute inset-0 flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.08em] text-white/30"
              data-testid="lab-primitive-structure-empty"
            >
              Waiting for the preview to render
            </p>
          ) : null}
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[1] h-full w-full"
            data-testid="lab-primitive-structure-callouts"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            {calloutLayers.map(({ node }) => {
              const callout = callouts[node.id];

              if (!callout) return null;

              const isMuted = highlightId !== null && highlightId !== node.id;
              const isCalloutActive = highlightId === node.id;
              const d = `M ${callout.targetX} ${callout.targetY} L ${callout.labelX} ${callout.labelY}`;

              return (
                <g
                  className={[
                    'transition-opacity duration-300',
                    isMuted ? 'opacity-30' : 'opacity-100',
                  ].join(' ')}
                  data-primitive-callout={node.id}
                  key={node.id}
                >
                  <path
                    d={d}
                    data-primitive-callout-hit={node.id}
                    fill="none"
                    stroke="rgba(255,255,255,0.001)"
                    strokeWidth="8"
                    vectorEffect="non-scaling-stroke"
                  />
                  <path
                    d={d}
                    data-primitive-callout-line={node.id}
                    fill="none"
                    stroke={
                      isCalloutActive
                        ? 'var(--structure-accent)'
                        : 'var(--structure-edge)'
                    }
                    strokeWidth={stroke}
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              );
            })}
          </svg>
          {calloutLayers.map(({ node }) => {
            const callout = callouts[node.id];

            if (!callout) return null;

            const isMuted = highlightId !== null && highlightId !== node.id;
            const isCalloutActive = highlightId === node.id;

            return (
              <span
                aria-hidden
                className={[
                  'pointer-events-none absolute z-[2] size-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full border bg-[var(--structure-plate)]',
                  'transition-[border-color,opacity] duration-300',
                  isCalloutActive
                    ? 'border-[var(--structure-accent)]'
                    : 'border-[var(--structure-hi)]',
                  isMuted ? 'opacity-35' : 'opacity-100',
                ].join(' ')}
                data-primitive-callout-dot={node.id}
                key={node.id}
                style={{
                  left: `${callout.targetX}%`,
                  top: `${callout.targetY}%`,
                }}
              />
            );
          })}
          {calloutLayers.map(({ node }) => {
            const callout = callouts[node.id];

            if (!callout) return null;

            const isMuted = highlightId !== null && highlightId !== node.id;
            const isCalloutActive = highlightId === node.id;

            return (
              <div
                className={[
                  'absolute z-[2] flex min-h-5 max-w-[31%] -translate-y-1/2 items-baseline gap-2 rounded-none py-0 pl-1.5',
                  'font-mono text-[10px] leading-3 transition-[color,opacity] duration-300',
                  isCalloutActive ? 'text-white/92' : 'text-white/62',
                  isMuted ? 'opacity-30' : 'opacity-100',
                ].join(' ')}
                data-primitive-callout-label={node.id}
                ref={(element) => {
                  if (element) labelElementsRef.current.set(node.id, element);
                  else labelElementsRef.current.delete(node.id);
                }}
                data-primitive-callout-label-text={node.id}
                key={node.id}
                style={{
                  left: `${callout.labelX}%`,
                  top: `${callout.labelY}%`,
                }}
              >
                <span className="min-w-0 truncate">{node.label}</span>
              </div>
            );
          })}
        </div>
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
          {visibleNodeEntries.map((node) => {
            const isMuted = isStructureNodeMuted(node, activePath);
            const isNodeActive = highlightId === node.id;
            const measured = renderedNodeIds.has(node.id);
            const firstSlab = measured
              ? measurement?.slabs.find(
                  (slab) => !slab.ghost && slab.nodeId === node.id,
                )
              : undefined;
            const displayDepth = Math.max(0, node.treeDepth - 1);

            return (
              <li
                className={[
                  'min-w-0 border-t border-white/8 pt-1.5 transition-opacity duration-300 first:border-t-0 first:pt-0',
                  isNodeActive ? 'text-white' : null,
                  isMuted ? 'opacity-35' : 'opacity-100',
                ]
                  .filter(Boolean)
                  .join(' ')}
                data-primitive-callout-layer={measured ? 'true' : undefined}
                data-primitive-component={node.component}
                data-primitive-depth={node.treeDepth}
                data-primitive-layer={node.id}
                data-primitive-measured={
                  firstSlab
                    ? `${firstSlab.width}x${firstSlab.height}`
                    : undefined
                }
                data-primitive-node={node.id}
                onClick={
                  isEditing ? () => selectStructureLayer(node.id) : undefined
                }
                data-primitive-parent={node.parentId ?? undefined}
                data-primitive-relation={node.relation}
                data-primitive-slot={node.slot}
                key={node.id}
                style={{
                  paddingLeft: `${Math.min(displayDepth, 4) * 12}px`,
                }}
              >
                <span className="min-w-0">
                  <span className="block min-w-0 truncate text-xs font-semibold text-white/86">
                    {node.label}
                  </span>
                  <code className="block truncate font-mono text-[9px] font-medium leading-3 text-white/34">
                    {formatComponentTag(node.component)}
                    {!measured && node.measurable ? ' · not rendered' : ''}
                  </code>
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
