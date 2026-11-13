import { format, resolveConfig } from 'prettier';
import { describe, expect, it, vi } from 'vitest';
import packageJson from '../../../../package.json';
import { CheckboxDocsPage } from './checkbox-docs-page.js';
import { ControlFieldDocsPage } from './control-field-docs-page.js';
import { InputDocsPage } from './input-docs-page.js';
import { InputMultiDocsPage } from './input-multi-docs-page.js';
import {
  renderPackageDoc,
  renderPackageDocsIndex,
  type PackageDocPage,
} from './package-docs.js';
import { PlaneDocsPage } from './plane-docs-page.js';
import { SliderDocsPage } from './slider-docs-page.js';
import { TabsDocsPage } from './tabs-docs-page.js';
import { ToggleGroupDocsPage } from './toggle-group-docs-page.js';
import { TooltipDocsPage } from './tooltip-docs-page.js';

// Read page registrations without rendering examples or loading their lab-only
// aliases, built-package imports, and WebGL/WASM dependencies.
vi.mock('@pbroom/control-kit', () => ({}));
vi.mock('color-kit/react', () => ({}));
vi.mock('./highlighted-code.js', () => ({}));
vi.mock('./docs-example.js', () => ({ DocsExample: () => null }));
vi.mock('../lab/shared.js', () => ({}));
vi.mock('../lab/lab-menu.js', () => ({}));
vi.mock('../../components/ui/dropdown-menu.js', () => ({}));

// Snapshot paths resolve from this file; Prettier's from the repo root.
const DOCS = '../../../../docs';
const shipped = Object.keys(import.meta.glob('../../../../docs/*'));

// Pages for components `@pbroom/control-kit` exports. Lab prototypes and the
// Color Kit pages stay in the lab.
const PAGES = {
  checkbox: CheckboxDocsPage,
  'control-field': ControlFieldDocsPage,
  input: InputDocsPage,
  'input-multi': InputMultiDocsPage,
  plane: PlaneDocsPage,
  slider: SliderDocsPage,
  tabs: TabsDocsPage,
  'toggle-group': ToggleGroupDocsPage,
  tooltip: TooltipDocsPage,
};

// Lab routes the shipped pages link to.
const LINKS = {
  '/docs/control-field': './control-field.md',
  '/docs/input-primitive': './input.md',
  '/docs/plane-examples':
    'https://github.com/pbroom/control-kit/tree/main/lab/src/routes/docs/examples/plane-examples',
};

const pages: PackageDocPage[] = Object.entries(PAGES).map(([slug, page]) => {
  const { source, slots = {} } = page().props;
  return { slug, source, slots };
});

async function formatted(content: string, path: string) {
  return format(content, {
    ...(await resolveConfig(path)),
    filepath: path,
  });
}

// Run `pnpm docs:package` to rewrite these files after changing a docs page.
describe('docs shipped in the npm package', () => {
  it.each(pages)('docs/$slug.md matches its lab page', async (page) => {
    const file = `${page.slug}.md`;
    await expect(
      await formatted(renderPackageDoc(page, LINKS), `docs/${file}`),
    ).toMatchFileSnapshot(`${DOCS}/${file}`);
  });

  it('docs/llms.txt indexes every shipped page', async () => {
    await expect(
      renderPackageDocsIndex(pages, packageJson, LINKS),
    ).toMatchFileSnapshot(`${DOCS}/llms.txt`);
  });

  it('ships no page without a lab source', () => {
    expect(shipped.sort()).toEqual(
      ['llms.txt', ...pages.map((page) => `${page.slug}.md`)]
        .map((file) => `${DOCS}/${file}`)
        .sort(),
    );
  });

  it('publishes the docs and the skill', () => {
    expect(packageJson.files).toEqual(
      expect.arrayContaining(['docs', 'skills']),
    );
  });
});
