import { useSyncExternalStore } from 'react';
import { STRUCTURE_OVERRIDES } from './structure-overrides.js';
import {
  AUTO_FRAMING,
  normalizeExplode,
  normalizeFraming,
  STRUCTURE_DEFAULT_EXPLODE,
  normalizeLayer,
  serializeStructureOverrides,
  type StructureDemoOverride,
  type StructureFramingOverride,
  type StructureLayerOverride,
  type StructureOverridesFile,
} from './structure-overrides-schema.js';
import {
  STRUCTURE_OVERRIDES_COMMIT_ENDPOINT,
  STRUCTURE_OVERRIDES_STATUS_ENDPOINT,
} from './structure-overrides-git.js';
import { STRUCTURE_OVERRIDES_ENDPOINT } from './structure-overrides-server.js';

/*
 * Shared state for the structure overrides: the Structure tab (render, node
 * list) and the properties panel's Structure section read and edit the same
 * overrides and the same selected layer. A tiny external store keeps them in
 * sync without threading props through the lab frame.
 */

export type StructureEditorSaveState = 'idle' | 'saving' | 'saved' | 'error';

type StructureEditorState = {
  /** A commit request is in flight. */
  committing: boolean;
  /** Result of the last commit ("Committed abc1234", or git's error). */
  commitNote: string | null;
  /** The file differs from HEAD (null until the dev server answers). */
  dirty: boolean | null;
  /** The render's current (unsaved) explode gap per page. */
  liveExplode: Record<string, number>;
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
      committing: false,
      commitNote: null,
      dirty: null,
      liveExplode: {},
      overrides: STRUCTURE_OVERRIDES,
      rootSizes: {},
      saveState: 'idle',
      selectedLayerId: readStructureEditorParams().layer,
    };
let saveTimer: number | null = null;
let pendingDoc: StructureOverridesFile | null = null;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

import.meta.hot?.dispose((data: HotData) => {
  data.state = state;
  data.pending = saveTimer !== null || inFlight !== null;
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

/** Asks the dev server whether the file differs from HEAD. */
export function refreshStructureDirty() {
  if (!import.meta.env.DEV || typeof fetch === 'undefined') return;

  void fetch(STRUCTURE_OVERRIDES_STATUS_ENDPOINT)
    .then((response) => (response.ok ? response.json() : null))
    .then((body: unknown) => {
      if (
        typeof body === 'object' &&
        body !== null &&
        typeof (body as { dirty?: unknown }).dirty === 'boolean'
      ) {
        setState({ dirty: (body as { dirty: boolean }).dirty });
      }
    })
    .catch(() => {});
}

function postSave(doc: StructureOverridesFile) {
  const request: Promise<void> = fetch(STRUCTURE_OVERRIDES_ENDPOINT, {
    body: serializeStructureOverrides(doc),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })
    .then((response) =>
      setState({ saveState: response.ok ? 'saved' : 'error' }),
    )
    .catch(() => setState({ saveState: 'error' }))
    .finally(() => {
      if (inFlight === request) inFlight = null;
      if (saveTimer === null && inFlight === null) refreshStructureDirty();
    });

  inFlight = request;
  return request;
}

function scheduleSave(next: StructureOverridesFile) {
  pendingDoc = next;
  if (saveTimer !== null) window.clearTimeout(saveTimer);

  saveTimer = window.setTimeout(() => {
    saveTimer = null;
    const doc = pendingDoc;
    pendingDoc = null;
    if (doc) void postSave(doc);
  }, STRUCTURE_SAVE_DEBOUNCE_MS);
}

/** Sends a debounced save now and waits for any save in flight. */
async function flushSave() {
  if (saveTimer !== null) {
    window.clearTimeout(saveTimer);
    saveTimer = null;
    const doc = pendingDoc;
    pendingDoc = null;
    if (doc) await postSave(doc);
  }

  while (inFlight) await inFlight;
}

/**
 * Commits lab/structure-overrides.json (that path only) through the dev
 * server, after flushing any pending save. Never pushes.
 */
export async function commitStructureOverrides() {
  if (state.committing) return;

  setState({ commitNote: null, committing: true });

  try {
    await flushSave();
    const response = await fetch(STRUCTURE_OVERRIDES_COMMIT_ENDPOINT, {
      method: 'POST',
    });
    const body = (await response.json().catch(() => ({}))) as {
      commit?: string | null;
      error?: string;
      ok?: boolean;
    };

    setState({
      commitNote:
        response.ok && body.ok
          ? body.commit
            ? `Committed ${body.commit}`
            : 'Nothing to commit'
          : (body.error ?? `Commit failed (${response.status})`),
    });
  } catch (error) {
    setState({ commitNote: `Commit failed: ${String(error)}` });
  } finally {
    setState({ committing: false });
    refreshStructureDirty();
  }
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

  setState({ commitNote: null, dirty: true, overrides, saveState: 'saving' });
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

export function setStructureLiveExplode(pageKey: string, explode: number) {
  if (state.liveExplode[pageKey] === explode) return;

  setState({ liveExplode: { ...state.liveExplode, [pageKey]: explode } });
}

/** The demo's saved default gap (0..1). */
export function changeStructureExplode(pageKey: string, explode: number) {
  updateDemo(pageKey, (demo) => ({
    ...demo,
    explode: normalizeExplode(Math.round(explode * 100) / 100),
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
    explode: STRUCTURE_DEFAULT_EXPLODE,
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

// Dev: learn whether there is anything to commit (again after each HMR run).
if (import.meta.env.DEV && typeof window !== 'undefined') {
  refreshStructureDirty();
}
