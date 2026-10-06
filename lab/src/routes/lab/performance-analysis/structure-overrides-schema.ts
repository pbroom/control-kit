/*
 * `lab/structure-overrides.json`: per-demo framing and per-layer placement
 * for the Structure tab. This file is a fixed contract shared with external
 * editors (a Claude Code mod pane writes the same file), so the shape, key
 * order and formatting here must not drift:
 *
 * {
 *   "version": 1,
 *   "demos": {
 *     "<LabPageKey>": {
 *       "label": "Control Field",
 *       "route": "/lab/control-field",
 *       "frame": false,
 *       "explode": 0.75,
 *       "framing": { "mode": "auto", "panX": 0, "panY": 0, "zoom": 1 },
 *       "layers": {
 *         "<node id>": { "label": "Root", "mode": "auto", "x": 0, "z": 0 }
 *       }
 *     }
 *   }
 * }
 *
 * Written as 2-space JSON with a trailing newline, keys in config order.
 * No imports: the lab's Vite dev server validates writes with this module.
 */

export type StructureOverrideMode = 'auto' | 'manual';

export type StructureFramingOverride = {
  mode: StructureOverrideMode;
  /** Fraction of the render width, -0.5..0.5, positive = right. */
  panX: number;
  /** Fraction of the render height, -0.5..0.5, positive = down. */
  panY: number;
  /** Multiplier on the stable auto fit, 0.25..4. */
  zoom: number;
};

export type StructureLayerOverride = {
  label: string;
  mode: StructureOverrideMode;
  /** CSS px along the root's width. */
  x: number;
  /** CSS px along the root's depth (DOM y). */
  z: number;
};

export type StructureDemoOverride = {
  /** Default layer gap, 0..1 (the render's explode control). Missing = 0.75. */
  explode: number;
  /**
   * Dev builds: outline the fixed render area and the auto-fit area the
   * figure is framed within. Missing = false.
   */
  frame: boolean;
  framing: StructureFramingOverride;
  label: string;
  layers: Record<string, StructureLayerOverride>;
  route: string;
};

export type StructureOverridesFile = {
  demos: Record<string, StructureDemoOverride>;
  version: 1;
};

export const STRUCTURE_OVERRIDES_VERSION = 1;
export const STRUCTURE_PAN_LIMIT = 0.5;
export const STRUCTURE_ZOOM_MIN = 0.25;
export const STRUCTURE_ZOOM_MAX = 4;
export const STRUCTURE_OFFSET_LIMIT = 2000;
export const STRUCTURE_DEFAULT_EXPLODE = 0.75;

/** A stored explode value, clamped to 0..1; anything else is the default. */
export function normalizeExplode(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? clamp(value, 0, 1)
    : STRUCTURE_DEFAULT_EXPLODE;
}

export const AUTO_FRAMING: StructureFramingOverride = {
  mode: 'auto',
  panX: 0,
  panY: 0,
  zoom: 1,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isMode(value: unknown): value is StructureOverrideMode {
  return value === 'auto' || value === 'manual';
}

/** Canonical key order for a framing entry, values clamped. */
export function normalizeFraming(
  value: Partial<StructureFramingOverride> | undefined,
): StructureFramingOverride {
  return {
    mode: isMode(value?.mode) ? value.mode : 'auto',
    panX: finite(value?.panX)
      ? clamp(value.panX, -STRUCTURE_PAN_LIMIT, STRUCTURE_PAN_LIMIT)
      : 0,
    panY: finite(value?.panY)
      ? clamp(value.panY, -STRUCTURE_PAN_LIMIT, STRUCTURE_PAN_LIMIT)
      : 0,
    zoom: finite(value?.zoom)
      ? clamp(value.zoom, STRUCTURE_ZOOM_MIN, STRUCTURE_ZOOM_MAX)
      : 1,
  };
}

/** Canonical key order for a layer entry, values clamped. */
export function normalizeLayer(
  value: Partial<StructureLayerOverride> | undefined,
  label: string,
): StructureLayerOverride {
  return {
    label,
    mode: isMode(value?.mode) ? value.mode : 'auto',
    x: finite(value?.x)
      ? clamp(value.x, -STRUCTURE_OFFSET_LIMIT, STRUCTURE_OFFSET_LIMIT)
      : 0,
    z: finite(value?.z)
      ? clamp(value.z, -STRUCTURE_OFFSET_LIMIT, STRUCTURE_OFFSET_LIMIT)
      : 0,
  };
}

/**
 * Strict check of a whole file, as the dev server receives it. Returns the
 * reasons it was rejected (empty when valid).
 */
export function validateStructureOverrides(value: unknown): string[] {
  const errors: string[] = [];

  if (!isRecord(value)) return ['root must be an object'];
  if (value.version !== STRUCTURE_OVERRIDES_VERSION) {
    errors.push(`version must be ${STRUCTURE_OVERRIDES_VERSION}`);
  }
  if (!isRecord(value.demos)) {
    errors.push('demos must be an object');
    return errors;
  }

  for (const [key, demo] of Object.entries(value.demos)) {
    const at = `demos.${key}`;

    if (!isRecord(demo)) {
      errors.push(`${at} must be an object`);
      continue;
    }
    if (typeof demo.label !== 'string')
      errors.push(`${at}.label must be a string`);
    if (
      demo.explode !== undefined &&
      (!finite(demo.explode) || demo.explode < 0 || demo.explode > 1)
    ) {
      errors.push(`${at}.explode must be a number in 0..1`);
    }
    if (demo.frame !== undefined && typeof demo.frame !== 'boolean') {
      errors.push(`${at}.frame must be a boolean`);
    }
    if (typeof demo.route !== 'string')
      errors.push(`${at}.route must be a string`);

    const framing = demo.framing;
    if (!isRecord(framing)) {
      errors.push(`${at}.framing must be an object`);
    } else {
      if (!isMode(framing.mode))
        errors.push(`${at}.framing.mode must be auto|manual`);
      for (const field of ['panX', 'panY'] as const) {
        const number = framing[field];
        if (!finite(number) || Math.abs(number) > STRUCTURE_PAN_LIMIT) {
          errors.push(`${at}.framing.${field} must be a number in -0.5..0.5`);
        }
      }
      if (
        !finite(framing.zoom) ||
        framing.zoom < STRUCTURE_ZOOM_MIN ||
        framing.zoom > STRUCTURE_ZOOM_MAX
      ) {
        errors.push(`${at}.framing.zoom must be a number in 0.25..4`);
      }
    }

    if (!isRecord(demo.layers)) {
      errors.push(`${at}.layers must be an object`);
      continue;
    }

    for (const [id, layer] of Object.entries(demo.layers)) {
      const layerAt = `${at}.layers.${id}`;

      if (!isRecord(layer)) {
        errors.push(`${layerAt} must be an object`);
        continue;
      }
      if (typeof layer.label !== 'string')
        errors.push(`${layerAt}.label must be a string`);
      if (!isMode(layer.mode))
        errors.push(`${layerAt}.mode must be auto|manual`);
      for (const field of ['x', 'z'] as const) {
        const number = layer[field];
        if (!finite(number) || Math.abs(number) > STRUCTURE_OFFSET_LIMIT) {
          errors.push(`${layerAt}.${field} must be a number in -2000..2000`);
        }
      }
    }
  }

  return errors;
}

/**
 * The file text: canonical key order inside each entry, demos and layers in
 * the order given, 2-space indent, trailing newline.
 */
export function serializeStructureOverrides(file: StructureOverridesFile) {
  const demos: Record<string, StructureDemoOverride> = {};

  for (const [key, demo] of Object.entries(file.demos)) {
    const layers: Record<string, StructureLayerOverride> = {};

    for (const [id, layer] of Object.entries(demo.layers)) {
      layers[id] = normalizeLayer(layer, layer.label);
    }

    demos[key] = {
      label: demo.label,
      route: demo.route,
      frame: demo.frame === true,
      explode: normalizeExplode(demo.explode),
      framing: normalizeFraming(demo.framing),
      layers,
    } as StructureDemoOverride;
  }

  return `${JSON.stringify({ version: STRUCTURE_OVERRIDES_VERSION, demos }, null, 2)}\n`;
}
