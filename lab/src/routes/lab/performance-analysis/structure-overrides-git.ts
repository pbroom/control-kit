/*
 * Dev-server helpers behind the Structure section's Commit button. They run
 * git through an injected `git(args)` (execFile with fixed args, no shell)
 * and only ever stage and commit `lab/structure-overrides.json`.
 */

export const STRUCTURE_OVERRIDES_PATH = 'lab/structure-overrides.json';
export const STRUCTURE_OVERRIDES_COMMIT_ENDPOINT =
  '/__lab/structure-overrides/commit';
export const STRUCTURE_OVERRIDES_STATUS_ENDPOINT =
  '/__lab/structure-overrides/status';

export type GitResult = { stderr: string; stdout: string };
/** Runs git; rejects with an error carrying `stderr` on a non-zero exit. */
export type GitRunner = (args: readonly string[]) => Promise<GitResult>;

export type StructureGitDeps = {
  git: GitRunner;
  readWorking: () => Promise<string>;
};

export type StructureGitResponse = { body: string; status: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function demosOf(text: string | null): Record<string, unknown> {
  if (text === null) return {};

  try {
    const parsed: unknown = JSON.parse(text);

    return isRecord(parsed) && isRecord(parsed.demos) ? parsed.demos : {};
  } catch {
    return {};
  }
}

/** Letters, digits, spaces and a little punctuation; nothing else. */
export function sanitizeCommitLabel(label: string) {
  return label
    .replace(/[^\p{L}\p{N} ._/-]+/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

/**
 * The commit message for the demos whose entries differ between HEAD and the
 * working file, or null when nothing changed.
 */
export function buildStructureCommitMessage(
  headText: string | null,
  workingText: string,
) {
  const head = demosOf(headText);
  const working = demosOf(workingText);
  const labels: string[] = [];

  for (const key of new Set([...Object.keys(working), ...Object.keys(head)])) {
    if (JSON.stringify(working[key]) === JSON.stringify(head[key])) continue;

    const entry = (working[key] ?? head[key]) as
      | { label?: unknown }
      | undefined;
    const label = sanitizeCommitLabel(
      typeof entry?.label === 'string' ? entry.label : key,
    );
    labels.push(label || sanitizeCommitLabel(key));
  }

  // Formatting-only differences still count as a change to commit.
  if (labels.length === 0) {
    return headText === workingText
      ? null
      : 'Update structure framing (formatting)';
  }

  return `Update structure framing (${labels.join(', ')})`;
}

function json(status: number, value: unknown): StructureGitResponse {
  return { body: JSON.stringify(value), status };
}

function stderrOf(error: unknown) {
  const stderr =
    isRecord(error) && typeof error.stderr === 'string' ? error.stderr : '';
  const message = error instanceof Error ? error.message : String(error);

  return (stderr.trim() || message).slice(0, 2000);
}

async function headText(git: GitRunner) {
  try {
    return (await git(['show', `HEAD:${STRUCTURE_OVERRIDES_PATH}`])).stdout;
  } catch {
    return null;
  }
}

/** `{ dirty }`: whether the working file differs from HEAD. */
export async function handleStructureOverridesStatus({
  git,
  readWorking,
}: StructureGitDeps): Promise<StructureGitResponse> {
  try {
    const [head, working] = await Promise.all([headText(git), readWorking()]);

    return json(200, { dirty: head !== working });
  } catch (error) {
    return json(500, { error: stderrOf(error), ok: false });
  }
}

/** Stages and commits only the overrides file. Never pushes. */
export async function handleStructureOverridesCommit({
  git,
  readWorking,
}: StructureGitDeps): Promise<StructureGitResponse> {
  try {
    try {
      await git(['symbolic-ref', '-q', 'HEAD']);
    } catch {
      return json(409, { error: 'HEAD is detached', ok: false });
    }

    const [unmerged, working] = await Promise.all([
      git(['ls-files', '--unmerged', '--', STRUCTURE_OVERRIDES_PATH]),
      readWorking(),
    ]);

    if (unmerged.stdout.trim() || /^(<{7}|>{7}|={7})( |$)/m.test(working)) {
      return json(409, {
        error: `${STRUCTURE_OVERRIDES_PATH} has merge conflicts`,
        ok: false,
      });
    }

    const message = buildStructureCommitMessage(await headText(git), working);

    if (message === null) {
      return json(200, { commit: null, ok: true });
    }

    await git(['add', '--', STRUCTURE_OVERRIDES_PATH]);
    await git(['commit', '-m', message, '--', STRUCTURE_OVERRIDES_PATH]);
    const commit = (await git(['rev-parse', '--short', 'HEAD'])).stdout.trim();

    return json(200, { commit, message, ok: true });
  } catch (error) {
    return json(500, { error: stderrOf(error), ok: false });
  }
}
