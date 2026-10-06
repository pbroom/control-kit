import { useSyncExternalStore } from 'react';
import { STRUCTURE_OVERRIDES } from './structure-overrides.js';
import {
  AUTO_FRAMING,
  normalizeFraming,
  normalizeLayer,
  serializeStructureOverrides,
  type StructureDemoOverride,
  type StructureFramingOverride,
  type StructureLayerOverride,
  type StructureOverridesFile,
} from './structure-overrides-schema.js';
import { STRUCTURE_OVERRIDES_ENDPOINT } from './structure-overrides-server.js';

/*
 * Shared state for the structure overrides: the Structure tab (render, node
 * list) and the properties panel's Structure section read and edit the same
 * overrides and the same selected layer. A tiny external store keeps them in
 * sync without threading props through the lab frame.
 */

export type StructureEditorSaveState = 'idle' | 'saving' | 'saved' | 'error';

type StructureEditorState = {
  overrides: StructureOverridesFile;
  /** Measured root size per page, for the layer pad's range. */
  rootSizes: Record<string, { height: number; width: number }>;
  saveState: StructureEditorSaveState;
  selectedLayerId: string | null;
};

const STRUCTURE_SAVE_DEBOUNCE_MS = 300;

/** `?structureEdit=1&structureLayer=<node id>`, read once (dev only). */
export function readStructureEditorParams() {
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return { edit: false, layer: null as string | null };
  }

  const params = new URLSearchParams(window.location.search);

  return {
    edit: params.get('structureEdit') === '1',
    layer: params.get('structureLayer'),
  };
}

type HotData = { pending?: boolean; state?: StructureEditorState };
const hotData = import.meta.hot?.data as HotData | undefined;

// Across HMR re-runs (the JSON changed on disk) keep the selection, and keep
// local edits only while one of our saves is still pending.
let state: StructureEditorState = hotData?.state
  ? {
      ...hotData.state,
      overrides: hotData.pending
        ? hotData.state.overrides
        : STRUCTURE_OVERRIDES,
    }
  : {
      overrides: STRUCTURE_OVERRIDES,
      rootSizes: {},
      saveState: 'idle',
      selectedLayerId: readStructureEditorParams().layer,
    };
let saveTimer: number | null = null;
const listeners = new Set<() => void>();

import.meta.hot?.dispose((data: HotData) => {
  data.state = state;
  data.pending = saveTimer !== null;
});

function setState(patch: Partial<StructureEditorState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function useStructureEditorState() {
  return useSyncExternalStore(subscribe, () => state);
}

export function setStructureRootSize(
  pageKey: string,
  size: { height: number; width: number },
) {
  const current = state.rootSizes[pageKey];

  if (current?.width === size.width && current.height === size.height) return;

  setState({ rootSizes: { ...state.rootSizes, [pageKey]: size } });
}

export function selectStructureLayer(layerId: string | null) {
  if (state.selectedLayerId !== layerId) setState({ selectedLayerId: layerId });
}

function scheduleSave(next: StructureOverridesFile) {
  if (saveTimer !== null) window.clearTimeout(saveTimer);

  saveTimer = window.setTimeout(() => {
    void fetch(STRUCTURE_OVERRIDES_ENDPOINT, {
      body: serializeStructureOverrides(next),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    })
      .then((response) =>
        setState({ saveState: response.ok ? 'saved' : 'error' }),
      )
      .catch(() => setState({ saveState: 'error' }))
      .finally(() => {
        saveTimer = null;
      });
  }, STRUCTURE_SAVE_DEBOUNCE_MS);
}

function updateDemo(
  pageKey: string,
  update: (demo: StructureDemoOverride) => StructureDemoOverride,
) {
  const demo = state.overrides.demos[pageKey];

  if (!demo) return;

  const overrides: StructureOverridesFile = {
    ...state.overrides,
    demos: { ...state.overrides.demos, [pageKey]: update(demo) },
  };

  setState({ overrides, saveState: 'saving' });
  scheduleSave(overrides);
}

export function changeStructureFraming(
  pageKey: string,
  patch: Partial<StructureFramingOverride>,
) {
  updateDemo(pageKey, (demo) => ({
    ...demo,
    framing: normalizeFraming({ ...demo.framing, ...patch }),
  }));
}

export function changeStructureFrame(pageKey: string, frame: boolean) {
  updateDemo(pageKey, (demo) => ({ ...demo, frame }));
}

export function changeStructureLayer(
  pageKey: string,
  layerId: string,
  patch: Partial<StructureLayerOverride>,
) {
  updateDemo(pageKey, (demo) => {
    const layer = demo.layers[layerId];

    return layer
      ? {
          ...demo,
          layers: {
            ...demo.layers,
            [layerId]: normalizeLayer({ ...layer, ...patch }, layer.label),
          },
        }
      : demo;
  });
}

export function resetStructureDemo(pageKey: string) {
  updateDemo(pageKey, (demo) => ({
    ...demo,
    frame: false,
    framing: AUTO_FRAMING,
    layers: Object.fromEntries(
      Object.entries(demo.layers).map(([id, layer]) => [
        id,
        normalizeLayer(undefined, layer.label),
      ]),
    ),
  }));
}
