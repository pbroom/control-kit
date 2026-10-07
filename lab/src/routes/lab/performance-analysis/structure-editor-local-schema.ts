/*
 * `lab/structure-editor.local.json`: per-developer Structure editor view
 * preferences. Gitignored, never committed, never read by production builds.
 * A Claude Code mod pane may write the same file, so this is a contract:
 *
 * {
 *   "version": 1,
 *   "frame": { "<LabPageKey>": true }
 * }
 *
 * `frame` lists the demos whose render frame overlay is shown; only `true`
 * entries are stored (missing = off). Written as 2-space JSON with a trailing
 * newline, page keys sorted. No imports: the dev server validates with this.
 */

export type StructureEditorLocalFile = {
  frame: Record<string, true>;
  version: 1;
};

export const STRUCTURE_EDITOR_LOCAL_VERSION = 1;
export const STRUCTURE_EDITOR_LOCAL_ENDPOINT = '/__lab/structure-editor-local';

export const EMPTY_STRUCTURE_EDITOR_LOCAL: StructureEditorLocalFile = {
  frame: {},
  version: STRUCTURE_EDITOR_LOCAL_VERSION,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Strict check of a whole file, as the dev server receives it. */
export function validateStructureEditorLocal(value: unknown): string[] {
  if (!isRecord(value)) return ['root must be an object'];

  const errors: string[] = [];

  if (value.version !== STRUCTURE_EDITOR_LOCAL_VERSION) {
    errors.push(`version must be ${STRUCTURE_EDITOR_LOCAL_VERSION}`);
  }

  if (!isRecord(value.frame)) {
    errors.push('frame must be an object');
    return errors;
  }

  for (const [key, on] of Object.entries(value.frame)) {
    if (on !== true)
      errors.push(`frame.${key} must be true (omit to turn off)`);
  }

  return errors;
}

/**
 * Lenient read: anything malformed counts as "off". `known` page keys, when
 * given, drop entries for pages that no longer exist.
 */
export function readStructureEditorLocal(
  value: unknown,
  known?: ReadonlySet<string>,
): StructureEditorLocalFile {
  const frame: Record<string, true> = {};

  if (isRecord(value) && isRecord(value.frame)) {
    for (const [key, on] of Object.entries(value.frame)) {
      if (on === true && (!known || known.has(key))) frame[key] = true;
    }
  }

  return { frame, version: STRUCTURE_EDITOR_LOCAL_VERSION };
}

/** The file text: sorted keys, 2-space indent, trailing newline. */
export function serializeStructureEditorLocal(file: StructureEditorLocalFile) {
  const frame: Record<string, true> = {};

  for (const key of Object.keys(file.frame).sort()) {
    if (file.frame[key] === true) frame[key] = true;
  }

  return `${JSON.stringify({ version: STRUCTURE_EDITOR_LOCAL_VERSION, frame }, null, 2)}\n`;
}

/**
 * The lab's read of the file text: absent (`undefined`) or unparseable text
 * means no preferences; `error` describes a malformed file for a dev warning.
 */
export function parseStructureEditorLocalText(
  text: string | undefined,
  known?: ReadonlySet<string>,
): { error: string | null; file: StructureEditorLocalFile } {
  if (text === undefined) {
    return { error: null, file: EMPTY_STRUCTURE_EDITOR_LOCAL };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: 'not valid JSON', file: EMPTY_STRUCTURE_EDITOR_LOCAL };
  }

  const errors = validateStructureEditorLocal(parsed);

  return {
    error: errors.length > 0 ? errors.join('; ') : null,
    file: readStructureEditorLocal(parsed, known),
  };
}

/** Validates a POSTed file and writes it in canonical form. */
export async function handleStructureEditorLocalWrite(
  requestBody: string,
  write: (text: string) => Promise<void>,
): Promise<{ body: string; status: number }> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(requestBody);
  } catch {
    return {
      body: JSON.stringify({ errors: ['body is not valid JSON'], ok: false }),
      status: 400,
    };
  }

  const errors = validateStructureEditorLocal(parsed);

  if (errors.length > 0) {
    return { body: JSON.stringify({ errors, ok: false }), status: 422 };
  }

  await write(
    serializeStructureEditorLocal(parsed as StructureEditorLocalFile),
  );

  return { body: JSON.stringify({ ok: true }), status: 200 };
}
