import {
  EMPTY_STRUCTURE_EDITOR_LOCAL,
  parseStructureEditorLocalText,
  type StructureEditorLocalFile,
} from './structure-editor-local-schema.js';
import { STRUCTURE_OVERRIDE_DEMOS } from './structure-overrides.js';

/*
 * The developer's local Structure editor preferences
 * (lab/structure-editor.local.json, gitignored). Read through a glob so a
 * missing file is simply "no preferences", as raw text so a malformed one
 * is ignored (with a dev warning) instead of breaking the lab, and only in
 * dev builds so production never bundles it. Vite re-runs this module when
 * the file is created, edited or removed.
 */

function loadLocalPreferences(): StructureEditorLocalFile {
  if (!import.meta.env.DEV) return EMPTY_STRUCTURE_EDITOR_LOCAL;

  const files = import.meta.glob<string>(
    '../../../../structure-editor.local.json',
    { eager: true, import: 'default', query: '?raw' },
  );
  const { error, file } = parseStructureEditorLocalText(
    Object.values(files)[0],
    new Set(STRUCTURE_OVERRIDE_DEMOS.map((demo) => demo.key as string)),
  );

  if (error) {
    console.warn(
      `[structure-editor] lab/structure-editor.local.json: ${error}; ignoring the invalid parts`,
    );
  }

  return file;
}

export const STRUCTURE_EDITOR_LOCAL = loadLocalPreferences();
