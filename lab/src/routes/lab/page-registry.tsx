import {
  lazy,
  Suspense,
  type ComponentType,
  type LazyExoticComponent,
} from 'react';
import type { LabPageKey } from './shared.js';

export { LAB_PAGE_NAVIGATION } from './lab-page-runtime.js';

type ActiveLabPageComponent = ComponentType<{
  isActive?: boolean;
}>;

const LAB_PAGE_LOADERS = {
  plane: () =>
    import('./pages/color-plane.js').then((module) => ({
      default: module.PlaneLabActivePage,
    })),
  input: () =>
    import('./pages/input.js').then((module) => ({
      default: module.InputLabActivePage,
    })),
  inputMulti: () =>
    import('./pages/input-multi.js').then((module) => ({
      default: module.InputMultiLabActivePage,
    })),
  checkbox: () =>
    import('./pages/checkbox.js').then((module) => ({
      default: module.CheckboxLabActivePage,
    })),
  slider: () =>
    import('./pages/slider.js').then((module) => ({
      default: module.SliderLabActivePage,
    })),
  tooltip: () =>
    import('./pages/tooltip.js').then((module) => ({
      default: module.TooltipLabActivePage,
    })),
} satisfies Partial<
  Record<LabPageKey, () => Promise<{ default: ActiveLabPageComponent }>>
>;

const LAZY_LAB_PAGES = Object.fromEntries(
  Object.entries(LAB_PAGE_LOADERS).map(([key, loader]) => [key, lazy(loader)]),
) as Partial<Record<LabPageKey, LazyExoticComponent<ActiveLabPageComponent>>>;

export function LazyActiveLabPage({
  activePage,
  isActive = true,
}: {
  activePage: LabPageKey;
  isActive?: boolean;
}) {
  const ActiveLabPage = LAZY_LAB_PAGES[activePage];

  if (!ActiveLabPage) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <ActiveLabPage isActive={isActive} />
    </Suspense>
  );
}
