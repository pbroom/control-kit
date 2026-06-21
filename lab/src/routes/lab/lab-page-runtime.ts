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

export const LAB_PAGE_NAVIGATION: readonly LabPageNavigationItem[] = [
  { value: 'plane', slug: 'color-plane', label: 'ColorPlane' },
  { value: 'input', slug: 'input-primitive', label: 'Input Primitive' },
  { value: 'inputMulti', slug: 'input-multi', label: 'Input Multi' },
  { value: 'checkbox', slug: 'checkbox', label: 'Checkbox' },
  { value: 'slider', slug: 'slider', label: 'Slider' },
  { value: 'tooltip', slug: 'tooltip', label: 'Tooltip' },
  { value: 'menu', slug: 'menu', label: 'Menu' },
  { value: 'select', slug: 'select', label: 'Select' },
  { value: 'toggleButton', slug: 'toggle-button', label: 'Toggle Button' },
  { value: 'toggle', slug: 'toggle-group', label: 'Toggle Group' },
] as const;

const LAB_PAGE_BY_SLUG = new Map(
  LAB_PAGE_NAVIGATION.map((page) => [page.slug, page.value]),
);

const LAB_PAGE_SLUG_BY_VALUE = new Map(
  LAB_PAGE_NAVIGATION.map((page) => [page.value, page.slug]),
);

export function getLabPageFromSlug(slug: string | undefined) {
  return slug ? (LAB_PAGE_BY_SLUG.get(slug) ?? null) : null;
}

export function getLabPagePath(page: LabPageKey) {
  const slug = LAB_PAGE_SLUG_BY_VALUE.get(page);
  if (!slug) {
    throw new Error(`Missing lab page route slug for "${page}".`);
  }

  return `/lab/${slug}`;
}
