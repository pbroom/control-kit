import type { ReactNode } from 'react';
import type { LabPageKey, LabPanelTooltipProviderProps } from './shared.js';

export type LabPageRuntimeOutput = {
  preview: ReactNode;
  properties: ReactNode;
  panelTooltipProviderProps?: LabPanelTooltipProviderProps;
};

export type PrimitivePageView = 'docs' | 'lab';

export const DEFAULT_LAB_PANEL_TOOLTIP_PROPS: LabPanelTooltipProviderProps = {
  delayDuration: 1000,
  skipDelayDuration: 300,
};

export type LabPageNavigationItem = {
  value: LabPageKey;
  slug: string;
  label: string;
  section: LabPageNavigationSection;
};

export type LabPageNavigationSection = 'Primitives' | 'Components';

export const DEFAULT_LAB_PAGE: LabPageKey = 'plane';

type LabPageRouteMetadata = {
  slug: string;
  label: string;
  section: LabPageNavigationSection;
};

export const LAB_PAGE_ROUTE_REGISTRY = {
  plane: { slug: 'plane', label: 'Plane', section: 'Primitives' },
  input: {
    slug: 'input-primitive',
    label: 'Input Primitive',
    section: 'Primitives',
  },
  inputMulti: {
    slug: 'input-multi',
    label: 'Input Multi',
    section: 'Primitives',
  },
  checkbox: { slug: 'checkbox', label: 'Checkbox', section: 'Components' },
  colorPlane: {
    slug: 'color-plane',
    label: 'ColorPlane',
    section: 'Components',
  },
  menu: { slug: 'menu', label: 'Menu', section: 'Components' },
  select: { slug: 'select', label: 'Select', section: 'Components' },
  slider: { slug: 'slider', label: 'Slider', section: 'Components' },
  tabs: { slug: 'tabs', label: 'Tabs', section: 'Components' },
  toggleButton: {
    slug: 'toggle-button',
    label: 'Toggle Button',
    section: 'Components',
  },
  toggle: {
    slug: 'toggle-group',
    label: 'Toggle Group',
    section: 'Components',
  },
  tooltip: { slug: 'tooltip', label: 'Tooltip', section: 'Components' },
} as const satisfies Record<LabPageKey, LabPageRouteMetadata>;

type LabPageRouteRegistry = typeof LAB_PAGE_ROUTE_REGISTRY;
type LabPageRouteEntry = {
  [TKey in LabPageKey]: [TKey, LabPageRouteRegistry[TKey]];
}[LabPageKey];

const LAB_PAGE_ROUTE_ENTRIES = Object.entries(
  LAB_PAGE_ROUTE_REGISTRY,
) as LabPageRouteEntry[];

export const LAB_PAGE_NAVIGATION: readonly LabPageNavigationItem[] =
  LAB_PAGE_ROUTE_ENTRIES.map(([value, route]) => ({
    value,
    slug: route.slug,
    label: route.label,
    section: route.section,
  }));

const LAB_PAGE_BY_SLUG = new Map<string, LabPageKey>(
  LAB_PAGE_ROUTE_ENTRIES.map(([value, route]) => [route.slug, value]),
);

export function getLabPageFromSlug(slug: string | undefined) {
  return slug ? (LAB_PAGE_BY_SLUG.get(slug) ?? null) : null;
}

export function getLabPagePath(page: LabPageKey) {
  return `/lab/${LAB_PAGE_ROUTE_REGISTRY[page].slug}`;
}

export function getDocsPagePath(page: LabPageKey) {
  return `/docs/${LAB_PAGE_ROUTE_REGISTRY[page].slug}`;
}

export function getPrimitivePagePath(
  page: LabPageKey,
  view: PrimitivePageView,
) {
  return view === 'docs' ? getDocsPagePath(page) : getLabPagePath(page);
}
