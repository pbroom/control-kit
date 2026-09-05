import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { expect, it } from 'vitest';

it('typechecks the actual README Plane example against the public API', () => {
  const repoRoot = fileURLToPath(new URL('..', import.meta.url));
  const readme = readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
  const planeSection = readme.split('## Plane\n')[1]?.split('\n## ')[0];
  const example = planeSection?.match(/```tsx\n([\s\S]*?)\n```/)?.[1];
  expect(example).toBeDefined();

  const filename = path.join(repoRoot, '__tests__/readme-plane-example.tsx');
  const options: ts.CompilerOptions = {
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    paths: {
      '@color-kit/control-kit': [path.join(repoRoot, 'src/index.ts')],
    },
  };
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (
    file,
    languageVersion,
    onError,
    shouldCreateNewSourceFile,
  ) =>
    file === filename
      ? ts.createSourceFile(file, example!, languageVersion, true)
      : getSourceFile(
          file,
          languageVersion,
          onError,
          shouldCreateNewSourceFile,
        );

  const program = ts.createProgram([filename], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  expect(
    diagnostics.map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    ),
  ).toEqual([]);
}, 15_000);
