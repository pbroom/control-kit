import {
  serializeStructureOverrides,
  type StructureOverridesFile,
  validateStructureOverrides,
} from './structure-overrides-schema.js';

/** Dev-server route that saves `lab/structure-overrides.json`. */
export const STRUCTURE_OVERRIDES_ENDPOINT = '/__lab/structure-overrides';

export type StructureOverridesWriteResult = {
  body: string;
  status: number;
};

/**
 * Validates a POSTed file and writes it in canonical form. The writer is
 * injected so this stays free of Node imports (and testable).
 */
export async function handleStructureOverridesWrite(
  requestBody: string,
  write: (text: string) => Promise<void>,
): Promise<StructureOverridesWriteResult> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(requestBody);
  } catch {
    return {
      body: JSON.stringify({ errors: ['body is not valid JSON'], ok: false }),
      status: 400,
    };
  }

  const errors = validateStructureOverrides(parsed);

  if (errors.length > 0) {
    return { body: JSON.stringify({ errors, ok: false }), status: 422 };
  }

  await write(serializeStructureOverrides(parsed as StructureOverridesFile));

  return { body: JSON.stringify({ ok: true }), status: 200 };
}
