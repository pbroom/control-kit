import overridesJson from '../../../../structure-overrides.json';
import { PAGE_ROUTE_REGISTRY } from '../lab-page-runtime.js';
import type { LabPageKey } from '../shared.js';
import { LAB_PERFORMANCE_ANALYSIS } from './config.js';
import {
  normalizeExplode,
  normalizeFraming,
  normalizeLayer,
  STRUCTURE_OVERRIDES_VERSION,
  type StructureDemoOverride,
  type StructureOverridesFile,
} from './structure-overrides-schema.js';
import type { LabPrimitiveStructureNode } from './types.js';

export type StructureOverrideNode = {
  id: string;
  label: string;
  parentId: string | null;
};

export type StructureOverrideDemo = {
  key: LabPageKey;
  label: string;
  nodes: readonly StructureOverrideNode[];
  route: string;
};

function flattenNodes(
  node: LabPrimitiveStructureNode,
  parentId: string | null,
  out: StructureOverrideNode[],
) {
  out.push({ id: node.id, label: node.label, parentId });
  node.children?.forEach((child) => flattenNodes(child, node.id, out));

  return out;
}

/** Every demo with a structure, and every node in it, in config order. */
export const STRUCTURE_OVERRIDE_DEMOS: readonly StructureOverrideDemo[] = (
  Object.keys(LAB_PERFORMANCE_ANALYSIS) as LabPageKey[]
).map((key) => {
  const analysis = LAB_PERFORMANCE_ANALYSIS[key];

  return {
    key,
    label: analysis.label,
    nodes: flattenNodes(analysis.primitiveStructure.root, null, []),
    route: `/lab/${PAGE_ROUTE_REGISTRY[key].slug}`,
  };
});

const DEMO_BY_KEY = new Map(
  STRUCTURE_OVERRIDE_DEMOS.map((demo) => [demo.key as string, demo]),
);

export function structureOverrideDemo(key: string) {
  return DEMO_BY_KEY.get(key);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** One demo's entry with every node, in config order, values clamped. */
function resolveDemo(
  demo: StructureOverrideDemo,
  raw: unknown,
  warn: (message: string) => void,
): StructureDemoOverride {
  const entry = isRecord(raw) ? raw : {};
  const rawLayers = isRecord(entry.layers) ? entry.layers : {};
  const known = new Set(demo.nodes.map((node) => node.id));

  for (const id of Object.keys(rawLayers)) {
    if (!known.has(id)) {
      warn(`unknown layer "${id}" in demo "${demo.key}" ignored`);
    }
  }

  return {
    explode: normalizeExplode(entry.explode),
    framing: normalizeFraming(
      isRecord(entry.framing) ? (entry.framing as never) : undefined,
    ),
    label: demo.label,
    layers: Object.fromEntries(
      demo.nodes.map((node) => [
        node.id,
        normalizeLayer(
          isRecord(rawLayers[node.id])
            ? (rawLayers[node.id] as never)
            : undefined,
          node.label,
        ),
      ]),
    ),
    route: demo.route,
  };
}

/**
 * The complete file for the current config: every demo and layer in config
 * order; values from `raw` where present (clamped), auto/zero otherwise.
 * Unknown demos and layers are dropped with a warning.
 */
export function resolveStructureOverrides(
  raw: unknown,
  warn: (message: string) => void = () => {},
): StructureOverridesFile {
  const rawDemos = isRecord(raw) && isRecord(raw.demos) ? raw.demos : {};

  for (const key of Object.keys(rawDemos)) {
    if (!DEMO_BY_KEY.has(key)) warn(`unknown demo "${key}" ignored`);
  }

  return {
    demos: Object.fromEntries(
      STRUCTURE_OVERRIDE_DEMOS.map((demo) => [
        demo.key,
        resolveDemo(demo, rawDemos[demo.key], warn),
      ]),
    ),
    version: STRUCTURE_OVERRIDES_VERSION,
  };
}

/** Every demo and layer on auto with zero offsets. */
export function createStructureOverridesSeed() {
  return resolveStructureOverrides({});
}

const devWarn = (message: string) => {
  if (import.meta.env?.DEV) {
    console.warn(`[structure-overrides] ${message}`);
  }
};

/**
 * The committed overrides. Imported (not fetched) so Vite HMR re-runs this
 * module and its importer when the file changes on disk.
 */
export const STRUCTURE_OVERRIDES: StructureOverridesFile =
  resolveStructureOverrides(overridesJson, devWarn);

export type StructureLayerOffset = { x: number; z: number };

/**
 * Manual layer offsets per node, accumulated down the tree so children move
 * with their parent. Nodes on auto contribute nothing.
 */
export function structureLayerOffsets(
  demoKey: string,
  demo: StructureDemoOverride | undefined,
) {
  const offsets = new Map<string, StructureLayerOffset>();
  const nodes = DEMO_BY_KEY.get(demoKey)?.nodes ?? [];

  for (const node of nodes) {
    const parent = node.parentId ? offsets.get(node.parentId) : undefined;
    const layer = demo?.layers[node.id];
    const own =
      layer?.mode === 'manual' ? { x: layer.x, z: layer.z } : { x: 0, z: 0 };

    offsets.set(node.id, {
      x: (parent?.x ?? 0) + own.x,
      z: (parent?.z ?? 0) + own.z,
    });
  }

  return offsets;
}
