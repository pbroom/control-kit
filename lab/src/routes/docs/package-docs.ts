import { isValidElement, type ReactNode } from 'react';
import type { PropReference } from './prop-reference-table.js';

/**
 * Renders a lab docs page as the plain Markdown shipped in the npm package's
 * `docs/` folder. Demo slots become the example's source and prop slots become
 * tables, so the page reads the same without the lab.
 */

const DOCS_SLOT_PATTERN = /<!--\s*([a-z]+:[a-z0-9-]+)\s*-->/g;

export type PackageDocSlots = Readonly<Record<string, ReactNode>>;

export type PackageDocPage = {
  /** File name without extension, such as `control-field`. */
  slug: string;
  source: string;
  slots: PackageDocSlots;
};

/**
 * Where each lab route a page links to lives outside the lab: a shipped page
 * (`./input.md`) or a URL. A fragment is kept only for shipped pages.
 */
export type PackageDocLinks = Readonly<Record<string, string>>;

const LAB_LINK_PATTERN = /\]\((\/[^)#\s]*)(#[^)\s]*)?\)/g;

function rewriteLabLinks(markdown: string, links: PackageDocLinks) {
  return markdown.replace(LAB_LINK_PATTERN, (_match, route, hash = '') => {
    const target = links[route];
    if (!target) {
      throw new Error(`No shipped target for the lab link "${route}".`);
    }
    return `](${target}${target.startsWith('./') ? hash : ''})`;
  });
}

const cell = (text: string) => text.replace(/\|/g, '\\|').replace(/\n/g, ' ');

const code = (text: string) => `\`${cell(text)}\``;

function renderPropTable(name: string, props: readonly PropReference[]) {
  const rows = props.map((prop) =>
    [
      code(prop.name) + (prop.required ? ' (required)' : ''),
      code(prop.type),
      prop.defaultValue ? code(prop.defaultValue) : '—',
      cell(prop.description),
    ].join(' | '),
  );

  return [
    `Props for \`${name}\`:`,
    '',
    '| Prop | Type | Default | Description |',
    '| --- | --- | --- | --- |',
    ...rows.map((row) => `| ${row} |`),
  ].join('\n');
}

function renderSlot(key: string, slot: ReactNode) {
  if (!isValidElement<Record<string, unknown>>(slot)) {
    throw new Error(`No documentation slot registered for "${key}".`);
  }

  if (key.startsWith('demo:')) {
    const { code: example, label } = slot.props;
    if (typeof example !== 'string') {
      throw new Error(`"${key}" has no example source to ship.`);
    }
    const title = typeof label === 'string' ? `Example: ${label}` : 'Example';
    return `${title}\n\n\`\`\`tsx\n${example.trimEnd()}\n\`\`\``;
  }

  const { name, props } = slot.props;
  if (typeof name !== 'string' || !Array.isArray(props)) {
    throw new Error(`"${key}" has no prop rows to ship.`);
  }
  return renderPropTable(name, props as readonly PropReference[]);
}

export function renderPackageDoc(
  { source, slots }: PackageDocPage,
  links: PackageDocLinks = {},
) {
  return source
    .split(DOCS_SLOT_PATTERN)
    .map((section, index) =>
      index % 2 === 1
        ? renderSlot(section, slots[section])
        : rewriteLabLinks(section.trim(), links),
    )
    .filter(Boolean)
    .join('\n\n')
    .concat('\n');
}

/** The page's `# Title` and the first paragraph under it. */
export function describePackageDoc(source: string) {
  const [heading = '', ...rest] = source.trim().split('\n');
  const summary = rest
    .join('\n')
    .trim()
    .split(/\n\s*\n/)[0]
    ?.replace(/\s+/g, ' ');

  if (!heading.startsWith('# ') || !summary) {
    throw new Error('A shipped docs page needs a title and a summary.');
  }
  return { title: heading.slice(2).trim(), summary };
}

export function renderPackageDocsIndex(
  pages: readonly PackageDocPage[],
  { name, description }: { name: string; description: string },
  links: PackageDocLinks = {},
) {
  const entries = pages.map((page) => {
    const { title, summary } = describePackageDoc(page.source);
    return `- [${title}](./${page.slug}.md): ${rewriteLabLinks(summary, links)}`;
  });

  return [
    `# ${name}`,
    '',
    `> ${description}`,
    '',
    'These pages match the installed version. Read the page for the component',
    'you are using; each one has usage, examples, accessibility notes and an',
    'API reference. Installation, Tailwind setup and theming tokens are in the',
    'package `README.md`.',
    '',
    '## Components',
    '',
    ...entries,
    '',
  ].join('\n');
}
