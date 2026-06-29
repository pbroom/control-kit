import type { ReactNode } from 'react';
import type { LabPageKey, LabPanelTooltipProviderProps } from './shared.js';

export type LabPageRuntimeOutput = {
  preview: ReactNode;
  properties: ReactNode;
  panelTooltipProviderProps?: LabPanelTooltipProviderProps;
};

export const DEFAULT_LAB_PANEL_TOOLTIP_PROPS: LabPanelTooltipProviderProps = {
  delayDuration: 1000,
  skipDelayDuration: 300,
};

export type LabPageNavigationItem = {
  value: LabPageKey;
  slug: string;
  label: string;
};

export const DEFAULT_LAB_PAGE: LabPageKey = 'plane';

type LabPageRouteMetadata = {
  slug: string;
  label: string;
};

export const LAB_PAGE_ROUTE_REGISTRY = {
  plane: { slug: 'color-plane', label: 'ColorPlane' },
  input: { slug: 'input-primitive', label: 'Input Primitive' },
  inputMulti: { slug: 'input-multi', label: 'Input Multi' },
  checkbox: { slug: 'checkbox', label: 'Checkbox' },
  slider: { slug: 'slider', label: 'Slider' },
  tooltip: { slug: 'tooltip', label: 'Tooltip' },
  menu: { slug: 'menu', label: 'Menu' },
  select: { slug: 'select', label: 'Select' },
  tabs: { slug: 'tabs', label: 'Tabs' },
  toggleButton: { slug: 'toggle-button', label: 'Toggle Button' },
  toggle: { slug: 'toggle-group', label: 'Toggle Group' },
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
