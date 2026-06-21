import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const referenceRoot = path.resolve(
  repoRoot,
  process.env.COLOR_KIT_REFERENCE_ROOT ?? '../color-kit',
);

if (!existsSync(referenceRoot)) {
  console.error(
    `Missing color-kit reference checkout at ${referenceRoot}. Set COLOR_KIT_REFERENCE_ROOT to override.`,
  );
  process.exit(1);
}

const routeFiles = [
  'lab.tsx',
  'lab/create-active-lab-page.tsx',
  'lab/lab-menu.tsx',
  'lab/lab-page-runtime.ts',
  'lab/lab-page-slots.tsx',
  'lab/page-registry.tsx',
  'lab/pages/checkbox.tsx',
  'lab/pages/color-plane.tsx',
  'lab/pages/input-multi.tsx',
  'lab/pages/input.tsx',
  'lab/pages/menu.tsx',
  'lab/pages/select.tsx',
  'lab/pages/slider.tsx',
  'lab/pages/toggle-button.tsx',
  'lab/pages/toggle-group.tsx',
  'lab/pages/tooltip.tsx',
  'lab/types.ts',
];

const exactFilePairs = [
  ...routeFiles.map((file) => ({
    source: `apps/docs/src/routes/${file}`,
    target: `lab/src/routes/${file}`,
  })),
  {
    source: 'apps/docs/src/components/lucide-icon-picker.tsx',
    target: 'lab/src/components/lucide-icon-picker.tsx',
  },
  {
    source: 'apps/docs/src/components/theme-context.tsx',
    target: 'lab/src/components/theme-context.tsx',
  },
  {
    source: 'apps/docs/src/components/ui/button.tsx',
    target: 'lab/src/components/ui/button.tsx',
  },
  {
    source: 'apps/docs/src/components/ui/dropdown-menu.tsx',
    target: 'lab/src/components/ui/dropdown-menu.tsx',
  },
  {
    source: 'apps/docs/src/components/ui/scroll-area.tsx',
    target: 'lab/src/components/ui/scroll-area.tsx',
  },
  {
    source: 'apps/docs/src/components/ui/separator.tsx',
    target: 'lab/src/components/ui/separator.tsx',
  },
  {
    source: 'apps/docs/src/lib/utils.ts',
    target: 'lab/src/lib/utils.ts',
  },
  {
    source: 'apps/docs/src/styles/docs.css',
    target: 'lab/src/styles/docs.css',
  },
  {
    source: 'apps/docs/src/styles/legacy-docs.css',
    target: 'lab/src/styles/legacy-docs.css',
  },
];

const directoryPairs = [
  {
    source: 'packages/core/src',
    target: 'lab/src/vendor/color-kit/core',
  },
  {
    source: 'packages/react/src',
    target: 'lab/src/vendor/color-kit/react',
  },
  {
    source: 'packages/core-wasm/src',
    target: 'lab/src/vendor/color-kit/core-wasm',
    ignoreTarget: ['generated'],
  },
  {
    source: 'packages/core-wasm/dist/generated',
    target: 'lab/src/vendor/color-kit/core-wasm/generated',
  },
];

function normalizeStandaloneLabShell(content) {
  return content
    .replace("import { Link } from 'react-router';\n", '')
    .replace(
      /  const \[isSiteNavOpen, setIsSiteNavOpen\] = useState\(false\);\n\n  return \(\n    <div className="absolute left-4 top-4 z-20 w-\[190px\]">\n      <div className="flex items-center gap-2">[\s\S]*?      <div className="mt-3 space-y-0\.5">/,
      `  return (
    <div className="absolute left-4 top-4 z-20 w-[190px]">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 items-center rounded-lg px-1 py-1 font-[var(--font-brand)] text-[15px] font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-[#5288db]">
          <span className="truncate">control-kit</span>
        </div>
        <div className="ml-auto [&_[data-slot=button]]:size-8 [&_[data-slot=button]]:min-h-8 [&_[data-slot=button]]:rounded-xl [&_[data-slot=button]]:text-white/65 [&_[data-slot=button]]:hover:bg-white/8 [&_[data-slot=button]]:hover:text-white">
          <ThemeSwitcher />
        </div>
      </div>
      <div className="mt-3 space-y-0.5">`,
    )
    .replace('          Color Kit', '          control-kit');
}

function normalizeStandaloneThemeSwitcher(content) {
  return content
    .replace("import { Menu } from '@base-ui/react/menu';\n", '')
    .replace(
      "import { Circle, Moon, Sun } from 'lucide-react';",
      "import { Moon, Sun } from 'lucide-react';",
    )
    .replace(
      "import { cn } from '@/lib/utils';\n",
      `import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SelectList, SelectListItem } from '@/routes/lab/lab-menu';
`,
    )
    .replace(
      /  return \(\n    <Menu\.Root>[\s\S]*?    <\/Menu\.Root>\n  \);/,
      `  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
        >
          {resolvedTheme === 'dark' ? (
            <Moon className="size-4" />
          ) : (
            <Sun className="size-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        aria-label="Theme"
        align="start"
        collisionPadding={8}
        side="right"
        sideOffset={8}
        variant="ui3"
        className="z-[80] w-[150px]"
      >
        <SelectList
          openAlignment="none"
          value={preference}
          onValueChange={(value) => setPreference(value as ThemePreference)}
        >
          {options.map((option) => (
            <SelectListItem key={option.value} value={option.value}>
              {option.label}
            </SelectListItem>
          ))}
        </SelectList>
      </DropdownMenuContent>
    </DropdownMenu>
  );`,
    );
}

const normalizedFilePairs = [
  {
    source: 'apps/docs/src/routes/lab/shared.tsx',
    target: 'lab/src/routes/lab/shared.tsx',
    normalizeSource: normalizeStandaloneLabShell,
    normalizeTarget: (content) =>
      content.replaceAll(
        'useSubmenuHoverTimer<SelectOptionId>({\n    enabled: showSubmenus,\n  });',
        'useSubmenuHoverTimer({\n    enabled: showSubmenus,\n  });',
      ),
  },
  {
    source: 'apps/docs/src/components/theme-switcher.tsx',
    target: 'lab/src/components/theme-switcher.tsx',
    normalizeSource: normalizeStandaloneThemeSwitcher,
  },
  {
    source: 'apps/docs/src/app.css',
    target: 'lab/src/styles.css',
    normalizeTarget: (content) =>
      content.replaceAll(
        "@source './**/*.{ts,tsx}';\n@source '../../src/**/*.{ts,tsx}';",
        "/* @color-kit/control-kit intentionally ships src/ so Tailwind v4 can scan package-authored utilities. */\n@source '../node_modules/@color-kit/control-kit/src';",
      ),
  },
];

function hash(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function readText(root, relativePath) {
  return readFile(path.join(root, relativePath), 'utf8');
}

async function compareTextPair({
  source,
  target,
  normalizeSource,
  normalizeTarget,
}) {
  const sourceText = normalizeSource
    ? normalizeSource(await readText(referenceRoot, source))
    : await readText(referenceRoot, source);
  const targetText = normalizeTarget
    ? normalizeTarget(await readText(repoRoot, target))
    : await readText(repoRoot, target);

  if (sourceText !== targetText) {
    return {
      ok: false,
      message: `${target} differs from ${source}`,
    };
  }

  return { ok: true };
}

function shouldIgnore(relativePath, ignoredPaths) {
  return ignoredPaths.some(
    (ignoredPath) =>
      relativePath === ignoredPath ||
      relativePath.startsWith(`${ignoredPath}/`),
  );
}

async function listFiles(root, relativeDir, ignoredPaths = []) {
  const baseDir = path.join(root, relativeDir);
  const files = [];

  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);
      if (shouldIgnore(relativePath, ignoredPaths)) {
        continue;
      }
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (entry.isFile()) {
        files.push(relativePath);
      }
    }
  }

  await walk(baseDir);
  return files;
}

async function compareDirectoryPair({ source, target, ignoreTarget = [] }) {
  const sourceFiles = await listFiles(referenceRoot, source);
  const targetFiles = await listFiles(repoRoot, target, ignoreTarget);

  if (sourceFiles.join('\n') !== targetFiles.join('\n')) {
    return {
      ok: false,
      message: `${target} file list differs from ${source}`,
    };
  }

  for (const file of sourceFiles) {
    const sourceBuffer = await readFile(path.join(referenceRoot, source, file));
    const targetBuffer = await readFile(path.join(repoRoot, target, file));
    if (hash(sourceBuffer) !== hash(targetBuffer)) {
      return {
        ok: false,
        message: `${path.join(target, file)} differs from ${path.join(source, file)}`,
      };
    }
  }

  return { ok: true, fileCount: sourceFiles.length };
}

async function main() {
  const failures = [];
  let exactFiles = 0;
  let normalizedFiles = 0;
  let directoryFiles = 0;

  for (const pair of exactFilePairs) {
    const result = await compareTextPair(pair);
    if (!result.ok) {
      failures.push(result.message);
      continue;
    }
    exactFiles += 1;
  }

  for (const pair of normalizedFilePairs) {
    const result = await compareTextPair(pair);
    if (!result.ok) {
      failures.push(result.message);
      continue;
    }
    normalizedFiles += 1;
  }

  for (const pair of directoryPairs) {
    const result = await compareDirectoryPair(pair);
    if (!result.ok) {
      failures.push(result.message);
      continue;
    }
    directoryFiles += result.fileCount;
  }

  if (failures.length > 0) {
    console.error('Color-kit lab parity check failed:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  const labPages = await listFiles(repoRoot, 'lab/src/routes/lab/pages');

  const coreWasmGenerated = await stat(
    path.join(repoRoot, 'lab/src/vendor/color-kit/core-wasm/generated'),
  );

  console.log(
    [
      'Color-kit lab parity check passed.',
      `Reference root: ${referenceRoot}`,
      `Lab pages: ${labPages.length} (${labPages.join(', ')})`,
      `Exact source files: ${exactFiles}`,
      `Normalized source files: ${normalizedFiles}`,
      `Vendor source/generated files: ${directoryFiles}`,
      `WASM generated directory copied: ${coreWasmGenerated.isDirectory()}`,
    ].join('\n'),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
