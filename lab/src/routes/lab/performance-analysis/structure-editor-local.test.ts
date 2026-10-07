import { describe, expect, it } from 'vitest';
import {
  handleStructureEditorLocalWrite,
  parseStructureEditorLocalText,
  readStructureEditorLocal,
  serializeStructureEditorLocal,
  validateStructureEditorLocal,
} from './structure-editor-local-schema.js';

describe('lab/structure-editor.local.json', () => {
  it('writes only true entries, keys sorted, 2-space JSON + newline', () => {
    expect(
      serializeStructureEditorLocal({
        frame: { slider: true, checkbox: true, plane: true },
        version: 1,
      }),
    ).toBe(
      '{\n  "version": 1,\n  "frame": {\n    "checkbox": true,\n    "plane": true,\n    "slider": true\n  }\n}\n',
    );
    expect(serializeStructureEditorLocal({ frame: {}, version: 1 })).toBe(
      '{\n  "version": 1,\n  "frame": {}\n}\n',
    );
  });

  it('validates strictly: version 1, frame entries true only', () => {
    expect(
      validateStructureEditorLocal({ frame: { plane: true }, version: 1 }),
    ).toEqual([]);
    expect(validateStructureEditorLocal({ frame: {}, version: 2 })).toEqual([
      'version must be 1',
    ]);
    expect(
      validateStructureEditorLocal({ frame: { plane: false }, version: 1 }),
    ).toEqual(['frame.plane must be true (omit to turn off)']);
    expect(validateStructureEditorLocal({ version: 1 })).toEqual([
      'frame must be an object',
    ]);
  });

  it('reads leniently: missing or malformed means off', () => {
    const known = new Set(['plane', 'slider']);

    expect(readStructureEditorLocal(undefined, known).frame).toEqual({});
    expect(readStructureEditorLocal('nope', known).frame).toEqual({});
    expect(
      readStructureEditorLocal(
        { frame: { gone: true, plane: true, slider: 'yes' }, version: 1 },
        known,
      ).frame,
    ).toEqual({ plane: true });
  });

  it('loads an absent, present or invalid file without throwing', () => {
    const known = new Set(['plane', 'slider']);

    // Absent: no preferences, no warning.
    expect(parseStructureEditorLocalText(undefined, known)).toEqual({
      error: null,
      file: { frame: {}, version: 1 },
    });
    // Present.
    expect(
      parseStructureEditorLocalText(
        '{\n  "version": 1,\n  "frame": {\n    "plane": true\n  }\n}\n',
        known,
      ),
    ).toEqual({ error: null, file: { frame: { plane: true }, version: 1 } });
    // Invalid JSON: ignored, with a reason for the dev warning.
    expect(parseStructureEditorLocalText('{"frame":', known)).toEqual({
      error: 'not valid JSON',
      file: { frame: {}, version: 1 },
    });
    // Invalid entries: the valid ones still apply.
    expect(
      parseStructureEditorLocalText(
        '{"version":1,"frame":{"plane":true,"slider":false}}',
        known,
      ),
    ).toEqual({
      error: 'frame.slider must be true (omit to turn off)',
      file: { frame: { plane: true }, version: 1 },
    });
  });

  it('rejects malformed writes and writes canonical text', async () => {
    const written: string[] = [];
    const write = async (text: string) => {
      written.push(text);
    };

    expect((await handleStructureEditorLocalWrite('{', write)).status).toBe(
      400,
    );
    expect(
      (
        await handleStructureEditorLocalWrite(
          JSON.stringify({ frame: { plane: 1 }, version: 1 }),
          write,
        )
      ).status,
    ).toBe(422);
    expect(written).toEqual([]);

    expect(
      (
        await handleStructureEditorLocalWrite(
          '{"frame":{"slider":true,"plane":true},"version":1}',
          write,
        )
      ).status,
    ).toBe(200);
    expect(written).toEqual([
      '{\n  "version": 1,\n  "frame": {\n    "plane": true,\n    "slider": true\n  }\n}\n',
    ]);
  });
});
