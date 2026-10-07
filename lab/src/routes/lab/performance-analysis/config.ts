import type { LabPageKey } from '../shared.js';
import type {
  LabPerformanceAnalysis,
  LabPrimitiveStructure,
  LabPrimitiveStructureNode,
  LabPrimitiveStructureNodeMeasure,
} from './types.js';

/*
 * Each structure node names the rendered element(s) it stands for. The
 * Structure tab measures those elements in the live preview (rects, radii,
 * fills, text, icons) and draws them as an exploded isometric figure, so
 * nothing here describes geometry.
 */

type NodeInput = Omit<LabPrimitiveStructureNode, 'children' | 'measure'> & {
  children?: readonly NodeInput[];
  measure?: LabPrimitiveStructureNodeMeasure | string;
};

function node(input: NodeInput): LabPrimitiveStructureNode {
  const { children, measure, ...rest } = input;

  return {
    ...rest,
    children: children?.map(node),
    measure: typeof measure === 'string' ? { selector: measure } : measure,
    state: rest.state ?? 'default',
  };
}

function structure(
  title: string,
  summary: string,
  root: NodeInput,
): LabPrimitiveStructure {
  return { root: node(root), summary, title };
}

const slot = (name: string) => `[data-slot="${name}"]`;

/** The popup a trigger in the preview controls (menus and selects portal it). */
function controlledBy(triggerSelector: string) {
  return (preview: Element): readonly Element[] => {
    const controls = preview
      .querySelector(triggerSelector)
      ?.getAttribute('aria-controls');
    const popup = controls ? document.getElementById(controls) : null;

    return popup ? [popup] : [];
  };
}

function withinControlled(triggerSelector: string, selector: string) {
  const findPopup = controlledBy(triggerSelector);

  return (preview: Element): readonly Element[] =>
    findPopup(preview).flatMap((popup) =>
      Array.from(popup.querySelectorAll(selector)),
    );
}

/** Submenu popups opened from rows of the trigger's popup. */
function openSubmenus(triggerSelector: string) {
  const findPopup = controlledBy(triggerSelector);

  return (preview: Element): readonly Element[] =>
    findPopup(preview).flatMap((popup) =>
      Array.from(popup.querySelectorAll(slot('dropdown-menu-sub-trigger')))
        .map((row) => row.getAttribute('aria-controls'))
        .map((id) => (id ? document.getElementById(id) : null))
        .filter((element): element is HTMLElement => element !== null),
    );
}

const MENU_TRIGGER = slot('dropdown-menu-trigger');
const MENU_ROWS = [
  slot('dropdown-menu-item'),
  slot('dropdown-menu-sub-trigger'),
  slot('dropdown-menu-checkbox-item'),
  slot('dropdown-menu-radio-item'),
].join(',');

/** Open tooltip popups near the preview (tooltips portal to the body). */
export function openTooltipContent(preview: Element): readonly Element[] {
  // Only the preview's own trigger counts: Base UI marks the trigger whose
  // tooltip is open with data-popup-open. A tooltip opened anywhere else
  // (e.g. in the properties panel) leaves it unmarked.
  const trigger = preview.querySelector(slot('tooltip-trigger'));

  if (!trigger?.hasAttribute('data-popup-open')) return [];

  const anchor = trigger.getBoundingClientRect();
  const cx = anchor.left + anchor.width / 2;
  const cy = anchor.top + anchor.height / 2;
  const distance = (popup: Element) => {
    const rect = popup.getBoundingClientRect();

    return Math.hypot(
      rect.left + rect.width / 2 - cx,
      rect.top + rect.height / 2 - cy,
    );
  };
  // Of the open popups, the one placed against that trigger.
  const nearest = Array.from(document.querySelectorAll(slot('tooltip-content')))
    .filter(
      (popup) =>
        popup.hasAttribute('data-open') &&
        popup.getBoundingClientRect().width > 0,
    )
    .sort((a, b) => distance(a) - distance(b))[0];

  return nearest ? [nearest] : [];
}

/** The ColorArea hides its DOM thumb; place it from its normalized value. */
function colorAreaThumbRect(element: Element, root: Element) {
  const x = Number(element.getAttribute('data-x'));
  const y = Number(element.getAttribute('data-y'));
  const area = element.closest('[data-color-area]') ?? root;
  const bounds = area.getBoundingClientRect();
  const rootBounds = root.getBoundingClientRect();

  if (!Number.isFinite(x) || !Number.isFinite(y) || bounds.width <= 0) {
    return null;
  }

  const size = 16;

  return {
    height: size,
    width: size,
    x: bounds.left - rootBounds.left + x * bounds.width - size / 2,
    y: bounds.top - rootBounds.top + y * bounds.height - size / 2,
  };
}

export const LAB_PERFORMANCE_ANALYSIS: Record<
  LabPageKey,
  LabPerformanceAnalysis
> = {
  plane: {
    label: 'Plane',
    primitiveStructure: structure(
      'Plane primitive',
      'A normalized two-dimensional input surface with an accessible marker.',
      {
        children: [
          {
            component: 'PlaneThumb',
            detail:
              'Positioned marker with two native range axes for keyboard and assistive input.',
            id: 'plane-thumb',
            label: 'Thumb',
            measure: {
              all: true,
              crosshair: true,
              selector: slot('plane-thumb'),
            },
            relation: 'child',
            slot: 'children',
          },
        ],
        component: 'Plane',
        detail:
          'Pointer-capturing normalized XY interaction surface and composition root.',
        id: 'plane-root',
        label: 'Plane',
        measure: slot('plane'),
        relation: 'root',
      },
    ),
  },
  colorPlane: {
    label: 'ColorPlane',
    primitiveStructure: structure(
      'ColorPlane primitive',
      'A bounded interactive plane composed from a base surface, gamut raster, overlay helpers, and an input thumb anchored above the render layer.',
      {
        children: [
          {
            component: 'Background',
            detail:
              'Optional checkerboard fill rendered in the ColorArea children slot.',
            id: 'checkerboard-background',
            label: 'Background',
            measure: '[data-color-area-background]',
            relation: 'slot',
            slot: 'children',
            state: 'optional',
          },
          {
            component: 'ColorPlane',
            detail: 'Canvas/WebGL color field for the selected axes.',
            id: 'gamut-raster',
            label: 'Gamut raster',
            measure: '[data-color-area-plane]',
            relation: 'child',
            slot: 'children',
          },
          {
            children: [
              {
                component: 'GamutBoundaryLayer',
                detail:
                  'Optional Display P3 / sRGB boundary path inside the overlay slot.',
                id: 'gamut-boundaries',
                label: 'Gamut boundaries',
                measure: {
                  all: true,
                  selector: '[data-color-area-gamut-boundary-layer]',
                },
                relation: 'child',
                slot: 'overlay',
                state: 'optional',
              },
              {
                component: 'FallbackPointsLayer',
                detail:
                  'Optional point samples that annotate fallback geometry.',
                id: 'fallback-points',
                label: 'Fallback points',
                measure: '[data-color-area-fallback-points-layer]',
                relation: 'child',
                slot: 'overlay',
                state: 'optional',
              },
            ],
            component: 'Layer',
            detail:
              'Overlay slot for boundaries and helper points, drawn above the raster.',
            id: 'overlay-boundaries',
            label: 'Overlay paths',
            relation: 'slot',
            slot: 'overlay',
            state: 'optional',
          },
          {
            component: 'Thumb',
            detail: 'Keyboard and pointer handle that commits color changes.',
            id: 'active-thumb',
            label: 'Thumb',
            measure: {
              crosshair: true,
              resolveRect: colorAreaThumbRect,
              selector: '[data-color-area-thumb]',
            },
            relation: 'implicit',
            slot: 'thumb',
            state: 'implicit',
          },
        ],
        component: 'ColorArea',
        detail: 'Rounded pointer target that clips the color field.',
        id: 'plane-frame',
        label: 'Frame',
        measure: '[data-color-area]',
        relation: 'root',
      },
    ),
  },
  input: {
    label: 'Control Input',
    primitiveStructure: structure(
      'ControlInput primitive',
      'A compact field shell with a value cell, focus ring, and optional scrub handle arranged on one horizontal control plane.',
      {
        children: [
          {
            children: [
              {
                component: 'ScrubArea',
                detail: 'Optional drag affordance for coarse/fine stepping.',
                id: 'scrub-handle',
                label: 'Scrub handle',
                measure: slot('control-field-scrub-area'),
                relation: 'child',
                slot: 'children',
              },
              {
                component: 'Input',
                detail: 'Editable text/input region with numeric parsing.',
                id: 'value-cell',
                label: 'Value cell',
                measure: slot('control-field-input'),
                relation: 'child',
                slot: 'children',
              },
            ],
            component: 'Group',
            detail: 'Stable rounded field surface and hit area.',
            id: 'input-shell',
            label: 'Shell',
            measure: slot('control-field-group'),
            relation: 'child',
            slot: 'children',
          },
        ],
        component: 'ControlInput',
        detail: 'Layout wrapper that owns the field variant.',
        id: 'control-input-root',
        label: 'Root',
        measure: slot('control-input'),
        relation: 'root',
      },
    ),
  },
  controlField: {
    label: 'Control Field',
    primitiveStructure: structure(
      'ControlField',
      'A compact Base UI number field composition with an inline scrub handle and optional affix.',
      {
        children: [
          {
            children: [
              {
                component: 'ScrubArea',
                detail:
                  'Inline pointer drag target for direct value adjustment.',
                id: 'control-field-scrub-area',
                label: 'Scrub handle',
                measure: slot('control-field-scrub-area'),
                relation: 'child',
                slot: 'children',
              },
              {
                component: 'Input',
                detail:
                  'Locale-aware numeric entry and expression draft surface.',
                id: 'control-field-input',
                label: 'Input',
                measure: slot('control-field-input'),
                relation: 'child',
                slot: 'children',
              },
              {
                component: 'Affix',
                detail:
                  'Optional prefix/suffix unit rendered inside the group.',
                id: 'control-field-affix',
                label: 'Affix',
                measure: { all: true, selector: slot('control-field-affix') },
                relation: 'child',
                slot: 'children',
                state: 'optional',
              },
              {
                component: 'Stepper',
                detail: 'Optional increment and decrement buttons.',
                id: 'control-field-steppers',
                label: 'Steppers',
                measure: {
                  all: true,
                  selector: `${slot('control-field-increment')},${slot('control-field-decrement')}`,
                },
                relation: 'child',
                slot: 'children',
                state: 'optional',
              },
            ],
            component: 'Group',
            detail: 'Bordered field surface that hosts the input parts.',
            id: 'control-field-group',
            label: 'Group',
            measure: slot('control-field-group'),
            relation: 'child',
            slot: 'children',
          },
        ],
        component: 'ControlField',
        detail: 'Value, formatting, validation, and Control Kit behavior.',
        id: 'control-field-root',
        label: 'Root',
        measure: slot('control-field'),
        relation: 'root',
      },
    ),
  },
  inputMulti: {
    label: 'Input Multi',
    primitiveStructure: structure(
      'MultiInputControl',
      'A segmented value editor made from repeated primitive inputs inside a shared channel group.',
      {
        children: [
          {
            children: [
              {
                component: 'ScrubArea',
                detail: 'Per-channel drag handle (letter or unit affix).',
                id: 'channel-scrub',
                label: 'Scrub handles',
                measure: {
                  all: true,
                  selector: `[data-multi-input-segment] ${slot('control-field-scrub-area')}`,
                },
                relation: 'child',
                slot: 'children',
              },
            ],
            component: 'ControlInput',
            detail: 'Repeated primitive input segment, one per channel.',
            id: 'channel-fields',
            label: 'Channel fields',
            measure: {
              all: true,
              selector: `[data-multi-input-segment] ${slot('control-field-group')}`,
            },
            relation: 'child',
            slot: 'children',
          },
        ],
        component: 'MultiInput',
        detail: 'Shared rounded container for channel fields.',
        id: 'group-shell',
        label: 'Group shell',
        measure: ':scope > div > div',
        relation: 'root',
      },
    ),
  },
  checkbox: {
    label: 'Checkbox',
    primitiveStructure: structure(
      'Checkbox primitive',
      'A row target with an independent indicator box, check glyph layer, and label surface.',
      {
        children: [
          {
            children: [
              {
                component: 'CheckIcon',
                detail: 'Pressed/checked mark drawn above the indicator.',
                id: 'check-mark',
                label: 'State glyph',
                measure: `${slot('checkbox-indicator')} svg`,
                relation: 'child',
                slot: 'children',
              },
            ],
            component: 'Indicator',
            detail: 'Visual checkbox box and state surface.',
            id: 'indicator-box',
            label: 'Indicator',
            measure: slot('checkbox-indicator'),
            relation: 'child',
            slot: 'children',
          },
          {
            component: 'Label',
            detail: 'Text alignment layer beside the indicator.',
            id: 'label-copy',
            label: 'Label',
            measure: slot('checkbox-label'),
            relation: 'child',
            slot: 'children',
          },
        ],
        component: 'Checkbox',
        detail: 'Full click and focus target for the checkbox row.',
        id: 'row-target',
        label: 'Row target',
        measure: slot('checkbox'),
        relation: 'root',
      },
    ),
  },
  slider: {
    label: 'Slider',
    primitiveStructure: structure(
      'ColorSlider primitive',
      'A rail-driven value control with gradient track, active range, markers, and a draggable thumb on top.',
      {
        children: [
          {
            children: [
              {
                component: 'Indicator',
                detail: 'Selected value span clipped to the current track.',
                id: 'slider-range',
                label: 'Active range',
                measure: slot('slider-indicator'),
                relation: 'child',
                slot: 'children',
                state: 'optional',
              },
            ],
            component: 'Control',
            detail: 'Pointer interaction zone inset by the thumb radius.',
            id: 'slider-control',
            label: 'Control',
            measure: slot('slider-control'),
            relation: 'child',
            slot: 'children',
          },
          {
            component: 'Thumb',
            detail: 'Draggable value handle over the rail.',
            id: 'slider-thumb',
            label: 'Thumb',
            measure: slot('slider-thumb'),
            relation: 'child',
            slot: 'thumb',
          },
        ],
        component: 'ColorSlider',
        detail: 'Root with the gradient rail and value markers.',
        id: 'slider-target',
        label: 'Rail',
        measure: slot('slider'),
        relation: 'root',
      },
    ),
  },
  tooltip: {
    label: 'Tooltip',
    primitiveStructure: structure(
      'Tooltip primitive',
      'A trigger element paired with a floating content layer that portals above it when open.',
      {
        children: [
          {
            component: 'TooltipPopup',
            detail: 'Tooltip panel; measured while the tooltip is open.',
            id: 'content',
            label: 'Content',
            measure: {
              // A one-line popup centred above the trigger.
              estimate: [{ height: 32, width: 122, x: -24, y: -38 }],
              find: openTooltipContent,
            },
            relation: 'slot',
            slot: 'content',
            state: 'optional',
          },
        ],
        component: 'TooltipTrigger',
        detail: 'Focusable control that owns tooltip intent.',
        id: 'trigger',
        label: 'Trigger',
        measure: slot('tooltip-trigger'),
        relation: 'root',
        slot: 'trigger',
      },
    ),
  },
  menu: {
    label: 'Menu',
    primitiveStructure: structure(
      'Menu primitive',
      'A trigger connected to a floating menu surface with grouped item rows and optional nested submenu layers.',
      {
        children: [
          {
            children: [
              {
                component: 'MenuItem',
                detail: 'Repeated command rows inside the content surface.',
                id: 'menu-items',
                label: 'Item rows',
                measure: {
                  // Lab menu defaults: five 192x24 rows in the popup.
                  estimate: [36, 60, 101, 125, 166].map((y) => ({
                    height: 24,
                    width: 192,
                    x: 8,
                    y,
                  })),
                  find: withinControlled(MENU_TRIGGER, MENU_ROWS),
                },
                relation: 'child',
                slot: 'item',
              },
              {
                component: 'SubmenuPopup',
                detail: 'Nested flyout opened from a submenu row.',
                id: 'submenu-content',
                label: 'Submenu',
                measure: {
                  // Lab menu defaults: 176px flyout beside its row.
                  estimate: [{ height: 112, width: 176, x: 208, y: 52 }],
                  find: openSubmenus(MENU_TRIGGER),
                },
                relation: 'slot',
                slot: 'portal',
                state: 'optional',
              },
            ],
            component: 'MenuPopup',
            detail: 'Portal-mounted menu surface; measured while open.',
            id: 'menu-content',
            label: 'Menu content',
            measure: {
              // Lab menu defaults: bottom/start, 4px offset, 208x170.
              estimate: [{ height: 170, width: 208, x: 0, y: 28 }],
              find: controlledBy(MENU_TRIGGER),
            },
            relation: 'slot',
            slot: 'portal',
            state: 'optional',
          },
        ],
        component: 'MenuTrigger',
        detail: 'Button that opens the floating menu layer.',
        id: 'menu-trigger',
        label: 'Trigger',
        measure: MENU_TRIGGER,
        relation: 'root',
        slot: 'trigger',
      },
    ),
  },
  select: {
    label: 'Select',
    primitiveStructure: structure(
      'Select primitive',
      'A closed trigger surface and floating option list with active item, icon, and value text layers.',
      {
        children: [
          {
            children: [
              {
                component: 'SelectItem',
                detail: 'Option rows inside the scrollable list.',
                id: 'active-option',
                label: 'Options',
                measure: {
                  find: withinControlled(MENU_TRIGGER, MENU_ROWS),
                },
                relation: 'child',
                slot: 'item',
              },
            ],
            component: 'SelectPopup',
            detail: 'Floating listbox surface; measured while open.',
            id: 'select-content',
            label: 'Option list',
            measure: {
              // A 208px list aligned over the trigger at the selected item.
              estimate: [{ height: 420, width: 208, x: 0, y: -8 }],
              find: controlledBy(MENU_TRIGGER),
            },
            relation: 'slot',
            slot: 'portal',
            state: 'optional',
          },
        ],
        component: 'SelectTrigger',
        detail: 'Compact button that displays the selected value.',
        id: 'select-trigger',
        label: 'Trigger',
        measure: MENU_TRIGGER,
        relation: 'root',
        slot: 'trigger',
      },
    ),
  },
  tabs: {
    label: 'Tabs',
    primitiveStructure: structure(
      'Tabs primitive',
      'A tablist shell containing repeated tab triggers, active-state feedback, optional icon/label content, and a roving selection model.',
      {
        children: [
          {
            children: [
              {
                component: 'TabsTrigger',
                detail:
                  'Peer trigger surface that participates in roving focus.',
                id: 'inactive-tabs',
                label: 'TabsTrigger',
                measure: {
                  all: true,
                  selector: `${slot('tabs-trigger')}:not([data-active])`,
                },
                relation: 'child',
                slot: 'trigger',
              },
              {
                component: 'TabsTrigger',
                detail: 'Selected trigger surface with active-state styling.',
                id: 'active-tab',
                label: 'TabsTrigger',
                measure: `${slot('tabs-trigger')}[data-active]`,
                relation: 'child',
                slot: 'trigger',
              },
            ],
            component: 'TabsList',
            detail: 'Shared segmented shell that groups the tab triggers.',
            id: 'tabs-list',
            label: 'TabsList',
            measure: slot('tabs-list'),
            relation: 'child',
            slot: 'children',
          },
          {
            component: 'TabsContent',
            detail:
              'Selected panel content associated with the active tab value.',
            id: 'tab-content',
            label: 'TabsContent',
            measure: `${slot('tabs-content')}:not([hidden])`,
            relation: 'sibling',
            slot: 'content',
          },
          {
            component: 'TabsContent',
            detail:
              'Inactive panel content kept as a sibling in the Tabs composition.',
            id: 'inactive-tab-content',
            label: 'TabsContent',
            relation: 'sibling',
            slot: 'content',
          },
        ],
        component: 'Tabs',
        detail: 'State owner for the active tab value.',
        id: 'tabs-root',
        label: 'Tabs',
        measure: slot('tabs'),
        relation: 'root',
      },
    ),
  },
  toggleButton: {
    label: 'Toggle Button',
    primitiveStructure: structure(
      'ToggleButton primitive',
      'A single pressable state container with icon/text content and layered selection feedback.',
      {
        children: [
          {
            component: 'Icon',
            detail: 'Icon and label composition.',
            id: 'content-layer',
            label: 'Content',
            measure: 'button > span',
            relation: 'child',
            slot: 'children',
          },
        ],
        component: 'ToggleButton',
        detail: 'Button target, focus boundary and on/off fill.',
        id: 'toggle-hit-area',
        label: 'Hit area',
        measure: 'button',
        relation: 'root',
      },
    ),
  },
  toggle: {
    label: 'Toggle Group',
    primitiveStructure: structure(
      'ToggleGroup primitive',
      'A roving group surface containing repeated toggle buttons and one shared selection model.',
      {
        children: [
          {
            component: 'ToggleGroupItem',
            detail: 'Repeated button primitives.',
            id: 'toggle-items',
            label: 'Toggle items',
            measure: {
              all: true,
              selector: `${slot('toggle-group-item')}:not([data-pressed])`,
            },
            relation: 'child',
            slot: 'item',
          },
          {
            component: 'ToggleGroupItem',
            detail: 'Pressed item layer and active state.',
            id: 'toggle-item-selected',
            label: 'Selected item',
            measure: {
              all: true,
              selector: `${slot('toggle-group-item')}[data-pressed]`,
            },
            relation: 'child',
            slot: 'item',
          },
        ],
        component: 'ToggleGroup',
        detail: 'Shared segmented-control container.',
        id: 'toggle-group-shell',
        label: 'Group shell',
        measure: slot('toggle-group'),
        relation: 'root',
      },
    ),
  },
};

export const LAB_PAGE_RESOURCE_HINTS: Record<LabPageKey, readonly string[]> = {
  plane: ['pages/plane', '/src/plane'],
  colorPlane: ['color-plane'],
  input: ['pages/input', 'input-'],
  controlField: ['control-field'],
  inputMulti: ['input-multi'],
  checkbox: ['checkbox'],
  slider: ['slider'],
  tooltip: ['tooltip'],
  menu: ['menu'],
  select: ['select'],
  tabs: ['tabs'],
  toggleButton: ['toggle-button'],
  toggle: ['toggle-group'],
};
