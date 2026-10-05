import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Slider } from '@pbroom/control-kit';
import {
  buildStructureFigure,
  type StructureFigureRegion,
  type Vec2,
} from './structure-iso.js';
import {
  findLabPreviewHost,
  measurePrimitiveStructure,
  type StructureMeasurement,
} from './structure-measure.js';
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
const STRUCTURE_CALLOUT_LABEL_MIN_GAP_PX = 24;
const STRUCTURE_FIGURE_RIGHT = 0.64;
const STRUCTURE_FIGURE_PADDING = 18;
const STRUCTURE_DEFAULT_EXPLODE = 0.75;
const STRUCTURE_EXPLODE_SMOOTHING_MS = 90;

const STRUCTURE_PALETTE = {
  // Lids are a lighter neutral than the panel (#171717), sides darker, so
  // painted parts read as solid plates; strokes step down edge > text > mid > lo.
  '--structure-accent': '#4ba3ff',
  '--structure-accent-top': 'color-mix(in srgb, #4ba3ff 22%, #26272b)',
  '--structure-edge': '#a6a9b1',
  '--structure-hi': '#eef0f3',
  '--structure-lo': '#4b4d54',
  '--structure-mid': '#7b7e88',
  '--structure-plate': '#26272b',
  '--structure-side': '#0e0e10',
  '--structure-text': '#b9bdc5',
  '--structure-text-fill': '#3a3c42',
} as CSSProperties;

type StructureCalloutPosition = {
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
  parentId: string | null;
  path: readonly string[];
  relation: LabPrimitiveStructureNodeRelation;
  slot?: LabPrimitiveStructureNodeSlot;
  state: LabPrimitiveStructureNodeState;
  treeDepth: number;
};

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
    // A drag in the preview mutates it every frame; measure once it ends.
    let pointerActive = false;
    let deferred = false;
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
        return;
      }

      const host = findLabPreviewHost(pageKey);
      observeHost(host);

      if (!host) {
        window.clearTimeout(retryTimer);
        retryTimer = window.setTimeout(schedule, 200);
        return;
      }

      const next = measurePrimitiveStructure(structure, host);
      const nextSignature = next?.signature ?? '';

      if (nextSignature !== signature) {
        signature = nextSignature;
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

/** Follows `target` with a short exponential ease; jumps under reduced motion. */
function useEasedValue(target: number, reducedMotion: boolean) {
  const [value, setValue] = useState(target);
  const valueRef = useRef(target);

  useEffect(() => {
    if (reducedMotion) {
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
  }, [reducedMotion, target]);

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

function layoutCallouts(
  anchors: ReadonlyArray<{ anchor: Vec2; nodeId: string }>,
  width: number,
  height: number,
): Record<string, StructureCalloutPosition> {
  if (width <= 0 || height <= 0) return {};

  const labelMinGap = clamp(
    (STRUCTURE_CALLOUT_LABEL_MIN_GAP_PX / height) * 100,
    5,
    12,
  );
  const entries = anchors
    .map(({ anchor, nodeId }) => {
      const targetX = clamp((anchor[0] / width) * 100, 2, 66);
      const targetY = clamp((anchor[1] / height) * 100, 2, 98);

      return {
        desiredLabelY: clamp(
          targetY,
          STRUCTURE_CALLOUT_LABEL_MIN_Y,
          STRUCTURE_CALLOUT_LABEL_MAX_Y,
        ),
        labelY: 0,
        nodeId,
        targetX,
        targetY,
      };
    })
    .sort((left, right) => left.desiredLabelY - right.desiredLabelY);

  let previous = STRUCTURE_CALLOUT_LABEL_MIN_Y - labelMinGap;
  for (const entry of entries) {
    entry.labelY = Math.max(entry.desiredLabelY, previous + labelMinGap);
    previous = entry.labelY;
  }

  const overflow =
    (entries.at(-1)?.labelY ?? STRUCTURE_CALLOUT_LABEL_MAX_Y) -
    STRUCTURE_CALLOUT_LABEL_MAX_Y;

  if (overflow > 0) {
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const next = entries[index + 1];
      entries[index]!.labelY = Math.min(
        entries[index]!.labelY - overflow,
        next ? next.labelY - labelMinGap : Infinity,
      );
    }
  }

  return Object.fromEntries(
    entries.map((entry) => [
      entry.nodeId,
      {
        labelX: STRUCTURE_CALLOUT_LABEL_X,
        labelY: Number(entry.labelY.toFixed(2)),
        targetX: Number(entry.targetX.toFixed(2)),
        targetY: Number(entry.targetY.toFixed(2)),
      },
    ]),
  );
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

function formatSize(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
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
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [explode, setExplode] = useState(STRUCTURE_DEFAULT_EXPLODE);
  const reducedMotion = usePrefersReducedMotion();
  const displayedExplode = useEasedValue(explode, reducedMotion);
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
  const figure = useMemo(
    () =>
      measurement && size.width > 0
        ? buildStructureFigure(measurement, displayedExplode, region)
        : null,
    [displayedExplode, measurement, region, size.width],
  );
  const measuredNodes = useMemo(() => {
    const nodes = new Map<
      string,
      { count: number; height: number; radius: number; width: number }
    >();

    for (const slab of measurement?.slabs ?? []) {
      const current = nodes.get(slab.nodeId);
      nodes.set(slab.nodeId, {
        count: (current?.count ?? 0) + 1,
        height: current?.height ?? slab.height,
        radius: current?.radius ?? slab.radius,
        width: current?.width ?? slab.width,
      });
    }

    return nodes;
  }, [measurement]);
  // One callout per node, in tree order, leading to its first slab.
  const calloutLayers = useMemo(() => {
    if (!figure) return [];

    const firstSlab = new Map<string, Vec2>();
    for (const slab of figure.slabs) {
      const current = firstSlab.get(slab.nodeId);
      if (!current || slab.anchor[0] > current[0]) {
        firstSlab.set(slab.nodeId, slab.anchor);
      }
    }

    return nodeEntries
      .filter((node) => firstSlab.has(node.id))
      .map((node) => ({ anchor: firstSlab.get(node.id)!, node }));
  }, [figure, nodeEntries]);
  const callouts = useMemo(
    () =>
      layoutCallouts(
        calloutLayers.map(({ anchor, node }) => ({ anchor, nodeId: node.id })),
        size.width,
        size.height,
      ),
    [calloutLayers, size.height, size.width],
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

  useEffect(() => {
    setActiveLayerId(null);
  }, [structure]);

  useEffect(() => {
    if (!isActive) setActiveLayerId(null);
  }, [isActive]);

  const onFigurePointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      const target = (event.target as Element).closest('[data-structure-node]');
      const nextLayerId = target?.getAttribute('data-structure-node') ?? null;
      setActiveLayerId((current) =>
        current === nextLayerId ? current : nextLayerId,
      );
    },
    [],
  );
  const onFigurePointerLeave = useCallback(() => setActiveLayerId(null), []);

  const stroke = Math.max(0.5, 1 / devicePixelRatio);
  const layerOrder = new Map(
    calloutLayers.map(({ node }, index) => [node.id, index]),
  );

  return (
    <div
      className="relative grid min-h-0 min-w-0 gap-4 lg:grid-cols-[minmax(320px,1fr)_minmax(260px,0.62fr)] lg:items-stretch"
      data-primitive-structure-hover-layer={activeLayerId ?? undefined}
      data-primitive-structure-label-renderer="svg-callouts"
      data-primitive-structure-schema="node-tree"
      data-testid="lab-primitive-structure-shell"
    >
      <div className="flex min-h-0 min-w-0 flex-col gap-1">
        <div
          className="flex h-6 items-center gap-3 px-3 font-mono text-[10px] uppercase tracking-[0.08em] text-white/40"
          data-testid="lab-primitive-structure-gap-control"
        >
          <span id="lab-primitive-structure-gap-label">Explode</span>
          <Slider
            aria-labelledby="lab-primitive-structure-gap-label"
            className="w-32"
            data-testid="lab-primitive-structure-gap-slider"
            max={1}
            min={0}
            onValueChange={(value) => setExplode(value as number)}
            step={0.01}
            value={explode}
          />
          <span
            className="tabular-nums normal-case tracking-normal text-white/50"
            data-testid="lab-primitive-structure-gap-readout"
          >
            gap {figure ? figure.gap.toFixed(1) : '0.0'}px
          </span>
        </div>
        <div
          aria-label={`${structure.title} isometric render`}
          className="relative min-h-[320px] flex-1 overflow-hidden"
          data-primitive-structure-renderer="svg"
          data-primitive-structure-surface="transparent"
          data-testid="lab-primitive-structure-render"
          ref={containerRef}
          style={STRUCTURE_PALETTE}
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
              const isLayerActive = activeLayerId === slab.nodeId;
              const isMuted = activeLayerId !== null && !isLayerActive;
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
                  data-structure-level={slab.level}
                  data-structure-node={slab.nodeId}
                  data-structure-painted={slab.painted ? 'true' : 'false'}
                  data-structure-slab={slab.key}
                  key={slab.key}
                >
                  {slab.footprint ? (
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
                      slab.painted
                        ? isLayerActive
                          ? 'var(--structure-accent-top)'
                          : 'var(--structure-plate)'
                        : 'transparent'
                    }
                    stroke={
                      slab.painted
                        ? 'none'
                        : isLayerActive
                          ? 'var(--structure-accent)'
                          : markStroke
                    }
                    strokeDasharray={slab.painted ? undefined : '2 3'}
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

              const isMuted =
                activeLayerId !== null && activeLayerId !== node.id;
              const isCalloutActive = activeLayerId === node.id;
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

            const isMuted = activeLayerId !== null && activeLayerId !== node.id;
            const isCalloutActive = activeLayerId === node.id;

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

            const isMuted = activeLayerId !== null && activeLayerId !== node.id;
            const isCalloutActive = activeLayerId === node.id;
            const measured = measuredNodes.get(node.id);

            return (
              <div
                className={[
                  'absolute z-[2] flex min-h-5 max-w-[31%] -translate-y-1/2 items-baseline gap-2 rounded-none py-0 pl-1.5',
                  'font-mono text-[10px] leading-3 transition-[color,opacity] duration-300',
                  isCalloutActive ? 'text-white/92' : 'text-white/62',
                  isMuted ? 'opacity-30' : 'opacity-100',
                ].join(' ')}
                data-primitive-callout-label={node.id}
                data-primitive-callout-label-text={node.id}
                key={node.id}
                style={{
                  left: `${callout.labelX}%`,
                  top: `${callout.labelY}%`,
                }}
              >
                <span className="text-white/28">
                  {String((layerOrder.get(node.id) ?? 0) + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0 truncate">{node.label}</span>
                {measured ? (
                  <span className="hidden shrink-0 text-white/28 xl:inline">
                    {formatSize(measured.width)}×{formatSize(measured.height)}
                    {measured.count > 1 ? ` ×${measured.count}` : ''}
                  </span>
                ) : null}
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
            const isNodeActive = activeLayerId === node.id;
            const measured = measuredNodes.get(node.id);
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
                  measured
                    ? `${formatSize(measured.width)}x${formatSize(measured.height)}`
                    : undefined
                }
                data-primitive-node={node.id}
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
                    {measured
                      ? ` · ${formatSize(measured.width)}×${formatSize(measured.height)}${measured.radius > 0 ? ` r${formatSize(measured.radius)}` : ''}${measured.count > 1 ? ` ×${measured.count}` : ''}`
                      : node.state === 'optional'
                        ? ' · not rendered'
                        : ''}
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
