import { describe, expect, it } from 'vitest';
import {
  buildStructureCommitMessage,
  type GitRunner,
  handleStructureOverridesCommit,
  handleStructureOverridesStatus,
  sanitizeCommitLabel,
  STRUCTURE_OVERRIDES_PATH,
} from './structure-overrides-git.js';
import { createStructureOverridesSeed } from './structure-overrides.js';
import { serializeStructureOverrides } from './structure-overrides-schema.js';

const head = serializeStructureOverrides(createStructureOverridesSeed());

function edited(
  change: (file: ReturnType<typeof createStructureOverridesSeed>) => void,
) {
  const file = createStructureOverridesSeed();
  change(file);
  return serializeStructureOverrides(file);
}

const working = edited((file) => {
  file.demos.plane!.framing = { mode: 'manual', panX: 0.1, panY: 0, zoom: 1.2 };
  file.demos.checkbox!.frame = true;
});

/** A fake git that records calls and answers from a script. */
function fakeGit(answers: Record<string, string | Error> = {}): {
  calls: string[][];
  git: GitRunner;
} {
  const calls: string[][] = [];

  return {
    calls,
    git: async (args) => {
      calls.push([...args]);
      const answer = answers[args[0]!];

      if (answer instanceof Error) throw answer;

      if (args[0] === 'show') return { stderr: '', stdout: head };
      if (args[0] === 'rev-parse') return { stderr: '', stdout: 'abc1234\n' };

      return { stderr: '', stdout: answer ?? '' };
    },
  };
}

describe('structure overrides commit message', () => {
  it('names the changed demos by label, in file order', () => {
    expect(buildStructureCommitMessage(head, working)).toBe(
      'Update structure framing (Plane, Checkbox)',
    );
  });

  it('counts an explode-only change', () => {
    const explodeOnly = edited((file) => {
      file.demos.slider!.explode = 0.4;
    });

    expect(buildStructureCommitMessage(head, explodeOnly)).toBe(
      'Update structure framing (Slider)',
    );
  });

  it('is null when nothing changed', () => {
    expect(buildStructureCommitMessage(head, head)).toBeNull();
  });

  it('keeps labels to plain text', () => {
    expect(sanitizeCommitLabel('Menu `$(rm -rf /)`; "x"\n')).toBe(
      'Menu rm -rf / x',
    );
    const hostile = edited((file) => {
      file.demos.menu!.label = 'Menu $(touch x)';
      file.demos.menu!.frame = true;
    });
    expect(buildStructureCommitMessage(head, hostile)).toBe(
      'Update structure framing (Menu touch x)',
    );
  });
});

describe('structure overrides commit handler', () => {
  it('commits only the overrides file, with fixed args', async () => {
    const { calls, git } = fakeGit();
    const result = await handleStructureOverridesCommit({
      git,
      readWorking: async () => working,
    });

    expect(result.status).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      commit: 'abc1234',
      message: 'Update structure framing (Plane, Checkbox)',
      ok: true,
    });
    expect(calls).toContainEqual(['add', '--', STRUCTURE_OVERRIDES_PATH]);
    expect(calls).toContainEqual([
      'commit',
      '-m',
      'Update structure framing (Plane, Checkbox)',
      '--',
      STRUCTURE_OVERRIDES_PATH,
    ]);
    expect(calls.some((args) => args.includes('push'))).toBe(false);
  });

  it('reports nothing to commit without touching the index', async () => {
    const { calls, git } = fakeGit();
    const result = await handleStructureOverridesCommit({
      git,
      readWorking: async () => head,
    });

    expect(JSON.parse(result.body)).toEqual({ commit: null, ok: true });
    expect(calls.some(([command]) => command === 'add')).toBe(false);
    expect(calls.some(([command]) => command === 'commit')).toBe(false);
  });

  it('refuses a detached HEAD or conflicts with 409', async () => {
    const detached = await handleStructureOverridesCommit({
      git: fakeGit({ 'symbolic-ref': new Error('not a branch') }).git,
      readWorking: async () => working,
    });
    expect(detached.status).toBe(409);

    const unmerged = await handleStructureOverridesCommit({
      git: fakeGit({
        'ls-files': `100644 abc 1\t${STRUCTURE_OVERRIDES_PATH}\n`,
      }).git,
      readWorking: async () => working,
    });
    expect(unmerged.status).toBe(409);

    const markers = await handleStructureOverridesCommit({
      git: fakeGit().git,
      readWorking: async () => `<<<<<<< HEAD\n${working}=======\n>>>>>>> x\n`,
    });
    expect(markers.status).toBe(409);
  });

  it("returns git's stderr with 500 when the commit fails", async () => {
    const failure = Object.assign(new Error('git failed'), {
      stderr: '  fatal: unable to write index  \n',
    });
    const result = await handleStructureOverridesCommit({
      git: fakeGit({ commit: failure }).git,
      readWorking: async () => working,
    });

    expect(result.status).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: 'fatal: unable to write index',
      ok: false,
    });
  });

  it('reports whether the file differs from HEAD', async () => {
    const clean = await handleStructureOverridesStatus({
      git: fakeGit().git,
      readWorking: async () => head,
    });
    const dirty = await handleStructureOverridesStatus({
      git: fakeGit().git,
      readWorking: async () => working,
    });

    expect(JSON.parse(clean.body)).toEqual({ dirty: false });
    expect(JSON.parse(dirty.body)).toEqual({ dirty: true });
  });
});
