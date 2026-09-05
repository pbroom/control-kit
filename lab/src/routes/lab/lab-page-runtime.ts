import type { ReactNode } from 'react';
import type { LabPageKey, LabPanelTooltipProviderProps } from './shared.js';

export type LabPageRuntimeOutput = {
  preview: ReactNode;
  properties: ReactNode;
  panelTooltipProviderProps?: LabPanelTooltipProviderProps;
};

export type PrimitivePageView = 'docs' | 'lab';

export type NavigationPageKey = LabPageKey | 'planeExamples';

export const DEFAULT_LAB_PANEL_TOOLTIP_PROPS: LabPanelTooltipProviderProps = {
  delayDuration: 1000,
  skipDelayDuration: 300,
};

export type LabPageNavigationItem = {
  value: NavigationPageKey;
  slug: string;
  label: string;
  section: LabPageNavigationSection;
};

export type LabPageNavigationSection = 'Examples' | 'Primitives' | 'Components';

export const DEFAULT_LAB_PAGE: LabPageKey = 'plane';

type PageRouteMetadata = {
  slug: string;
  label: string;
  section: LabPageNavigationSection;
};

export const PAGE_ROUTE_REGISTRY = {
  planeExamples: {
    slug: 'plane-examples',
    label: 'Plane Examples',
    section: 'Examples',
  },
  plane: { slug: 'plane', label: 'Plane', section: 'Primitives' },
  input: {
    slug: 'input-primitive',
    label: 'Input Primitive (Legacy)',
    section: 'Primitives',
  },
  inputMulti: {
    slug: 'input-multi',
    label: 'Input Multi',
    section: 'Primitives',
  },
  controlField: {
    slug: 'control-field',
    label: 'Control Field',
    section: 'Components',
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
} as const satisfies Record<NavigationPageKey, PageRouteMetadata>;

type PageRouteRegistry = typeof PAGE_ROUTE_REGISTRY;
type PageRouteEntry = {
  [TKey in NavigationPageKey]: [TKey, PageRouteRegistry[TKey]];
}[NavigationPageKey];

const PAGE_ROUTE_ENTRIES = Object.entries(
  PAGE_ROUTE_REGISTRY,
) as PageRouteEntry[];

export const PAGE_NAVIGATION: readonly LabPageNavigationItem[] =
  PAGE_ROUTE_ENTRIES.map(([value, route]) => ({
    value,
    slug: route.slug,
    label: route.label,
    section: route.section,
  }));

export function hasLabPage(page: NavigationPageKey): page is LabPageKey {
  return page !== 'planeExamples';
}

export const LAB_PAGE_NAVIGATION = PAGE_NAVIGATION.filter(
  (
    page,
  ): page is LabPageNavigationItem & {
    value: LabPageKey;
  } => hasLabPage(page.value),
);

const PAGE_BY_SLUG = new Map<string, NavigationPageKey>(
  PAGE_ROUTE_ENTRIES.map(([value, route]) => [route.slug, value]),
);

export function getPageFromSlug(slug: string | undefined) {
  return slug ? (PAGE_BY_SLUG.get(slug) ?? null) : null;
}

export function getLabPageFromSlug(slug: string | undefined) {
  const page = getPageFromSlug(slug);
  return page && hasLabPage(page) ? page : null;
}

export function getLabPagePath(page: LabPageKey) {
  return `/lab/${PAGE_ROUTE_REGISTRY[page].slug}`;
}

export function getDocsPagePath(page: NavigationPageKey) {
  return `/docs/${PAGE_ROUTE_REGISTRY[page].slug}`;
}

export function getPrimitivePagePath(
  page: NavigationPageKey,
  view: PrimitivePageView,
) {
  return view === 'docs' || !hasLabPage(page)
    ? getDocsPagePath(page)
    : `/lab/${PAGE_ROUTE_REGISTRY[page].slug}`;
}
