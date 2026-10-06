import { describe, expect, it, vi } from 'vitest';
// The exact bytes on disk (the JSON import would already be parsed).
import fileText from '../../../../structure-overrides.json?raw';
import { LAB_PERFORMANCE_ANALYSIS } from './config.js';
import {
  createStructureOverridesSeed,
  resolveStructureOverrides,
  STRUCTURE_OVERRIDE_DEMOS,
  structureLayerOffsets,
} from './structure-overrides.js';
import {
  serializeStructureOverrides,
  validateStructureOverrides,
} from './structure-overrides-schema.js';
import { handleStructureOverridesWrite } from './structure-overrides-server.js';
import type { LabPrimitiveStructureNode } from './types.js';

const file = JSON.parse(fileText) as {
  demos: Record<string, { layers: Record<string, unknown> }>;
};

function nodeIds(node: LabPrimitiveStructureNode): string[] {
  return [node.id, ...(node.children ?? []).flatMap(nodeIds)];
}

describe('lab/structure-overrides.json', () => {
  it('lists every demo and every structure node, in config order', () => {
    expect(Object.keys(file.demos)).toEqual(
      Object.keys(LAB_PERFORMANCE_ANALYSIS),
    );

    for (const [key, analysis] of Object.entries(LAB_PERFORMANCE_ANALYSIS)) {
      expect(Object.keys(file.demos[key]!.layers), key).toEqual(
        nodeIds(analysis.primitiveStructure.root),
      );
    }
  });

  it('is valid and round-trips through the writer byte for byte', () => {
    expect(validateStructureOverrides(file)).toEqual([]);
    expect(serializeStructureOverrides(resolveStructureOverrides(file))).toBe(
      fileText,
    );
  });

  it('carries each demo route and label', () => {
    expect(file.demos.controlField).toMatchObject({
      label: 'Control Field',
      route: '/lab/control-field',
    });
    expect(STRUCTURE_OVERRIDE_DEMOS.map((demo) => demo.key)).toEqual(
      Object.keys(file.demos),
    );
  });

  it('orders each demo label, route, frame, explode, framing, layers', () => {
    for (const demo of Object.values(file.demos)) {
      expect(Object.keys(demo)).toEqual([
        'label',
        'route',
        'frame',
        'explode',
        'framing',
        'layers',
      ]);
      expect(typeof (demo as { frame?: unknown }).frame).toBe('boolean');
    }
  });
});

describe('explode', () => {
  it('defaults to 0.75, clamps on read, and is always written', () => {
    const resolved = resolveStructureOverrides({
      demos: {
        checkbox: { explode: 0.3 },
        plane: { framing: {}, layers: {} },
        slider: { explode: 7 },
        tabs: { explode: 'wide' },
      },
      version: 1,
    });

    expect(resolved.demos.plane!.explode).toBe(0.75);
    expect(resolved.demos.checkbox!.explode).toBe(0.3);
    expect(resolved.demos.slider!.explode).toBe(1);
    expect(resolved.demos.tabs!.explode).toBe(0.75);
    expect(serializeStructureOverrides(resolved)).toContain(
      '"frame": false,\n      "explode": 0.3,\n      "framing"',
    );
  });

  it('accepts numbers in 0..1 only', () => {
    const demo = (explode: unknown) => ({
      demos: {
        plane: {
          explode,
          frame: false,
          framing: { mode: 'auto', panX: 0, panY: 0, zoom: 1 },
          label: 'Plane',
          layers: {},
          route: '/lab/plane',
        },
      },
      version: 1,
    });
    const message = 'demos.plane.explode must be a number in 0..1';

    expect(validateStructureOverrides(demo(0))).toEqual([]);
    expect(validateStructureOverrides(demo(1))).toEqual([]);
    expect(validateStructureOverrides(demo(1.5))).toEqual([message]);
    expect(validateStructureOverrides(demo(-0.1))).toEqual([message]);
    expect(validateStructureOverrides(demo('0.5'))).toEqual([message]);
  });
});

describe('frame', () => {
  it('defaults to false when missing and is always written', () => {
    const resolved = resolveStructureOverrides({
      demos: { plane: { framing: {}, layers: {} } },
      version: 1,
    });

    expect(resolved.demos.plane!.frame).toBe(false);
    expect(resolveStructureOverrides({ demos: {} }).demos.tabs!.frame).toBe(
      false,
    );
    expect(
      resolveStructureOverrides({ demos: { plane: { frame: true } } }).demos
        .plane!.frame,
    ).toBe(true);
    expect(serializeStructureOverrides(resolved)).toContain(
      '"route": "/lab/plane",\n      "frame": false,\n      "explode"',
    );
  });

  it('accepts booleans only', () => {
    const demo = (frame: unknown) => ({
      demos: {
        plane: {
          frame,
          framing: { mode: 'auto', panX: 0, panY: 0, zoom: 1 },
          label: 'Plane',
          layers: {},
          route: '/lab/plane',
        },
      },
      version: 1,
    });

    expect(validateStructureOverrides(demo(false))).toEqual([]);
    expect(validateStructureOverrides(demo(undefined))).toEqual([]);
    expect(validateStructureOverrides(demo('no'))).toEqual([
      'demos.plane.frame must be a boolean',
    ]);
    expect(validateStructureOverrides(demo(0))).toEqual([
      'demos.plane.frame must be a boolean',
    ]);
  });
});

describe('structure overrides', () => {
  it('fills gaps with auto, clamps values and warns about unknown ids', () => {
    const warn = vi.fn();
    const resolved = resolveStructureOverrides(
      {
        demos: {
          controlField: {
            framing: { mode: 'manual', panX: 3, panY: -0.2, zoom: 9 },
            layers: {
              'control-field-input': { mode: 'manual', x: 5000, z: -12 },
              nope: { mode: 'manual', x: 1, z: 1 },
            },
          },
          missingDemo: {},
        },
        version: 1,
      },
      warn,
    );
    const demo = resolved.demos.controlField!;

    expect(demo.framing).toEqual({
      mode: 'manual',
      panX: 0.5,
      panY: -0.2,
      zoom: 4,
    });
    expect(demo.layers['control-field-input']).toEqual({
      label: 'Input',
      mode: 'manual',
      x: 2000,
      z: -12,
    });
    expect(demo.layers['control-field-root']).toEqual({
      label: 'Root',
      mode: 'auto',
      x: 0,
      z: 0,
    });
    expect(warn).toHaveBeenCalledWith(
      'unknown layer "nope" in demo "controlField" ignored',
    );
    expect(warn).toHaveBeenCalledWith('unknown demo "missingDemo" ignored');
  });

  it('moves children with their manual parent', () => {
    const seed = createStructureOverridesSeed();
    const demo = seed.demos.controlField!;
    demo.layers['control-field-group'] = {
      ...demo.layers['control-field-group']!,
      mode: 'manual',
      x: 10,
      z: 4,
    };
    demo.layers['control-field-input'] = {
      ...demo.layers['control-field-input']!,
      mode: 'manual',
      x: 3,
      z: 0,
    };
    // Auto layers keep their stored numbers but they do not apply.
    demo.layers['control-field-root'] = {
      ...demo.layers['control-field-root']!,
      x: 99,
    };
    const offsets = structureLayerOffsets('controlField', demo);

    expect(offsets.get('control-field-root')).toEqual({ x: 0, z: 0 });
    expect(offsets.get('control-field-group')).toEqual({ x: 10, z: 4 });
    expect(offsets.get('control-field-scrub-area')).toEqual({ x: 10, z: 4 });
    expect(offsets.get('control-field-input')).toEqual({ x: 13, z: 4 });
  });

  it('rejects malformed writes and writes canonical text', async () => {
    const written: string[] = [];
    const write = async (text: string) => {
      written.push(text);
    };

    expect(await handleStructureOverridesWrite('{', write)).toMatchObject({
      status: 400,
    });
    const invalid = await handleStructureOverridesWrite(
      JSON.stringify({
        demos: {
          plane: {
            framing: { mode: 'sideways', panX: 0, panY: 0, zoom: 1 },
            label: 'Plane',
            layers: {},
            route: '/lab/plane',
          },
        },
        version: 1,
      }),
      write,
    );
    expect(invalid.status).toBe(422);
    expect(invalid.body).toContain('framing.mode');
    expect(written).toEqual([]);

    const ok = await handleStructureOverridesWrite(
      JSON.stringify(JSON.parse(fileText)),
      write,
    );
    expect(ok.status).toBe(200);
    expect(written).toEqual([fileText]);
  });
});
