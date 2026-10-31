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
      'Plane structure',
      'A normalized 2D input with one thumb.',
      {
        children: [
          {
            component: 'PlaneThumb',
            detail:
              'Positioned marker with two native range inputs, one per axis.',
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
          'Root that captures the pointer and maps it to normalized X and Y.',
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
      'ColorPlane structure',
      'A color area with a background, a gamut raster, optional overlays, and a thumb on top.',
      {
        children: [
          {
            component: 'Background',
            detail: 'Optional checkerboard rendered as a ColorArea child.',
            id: 'checkerboard-background',
            label: 'Background',
            measure: '[data-color-area-background]',
            relation: 'slot',
            slot: 'children',
            state: 'optional',
          },
          {
            component: 'ColorPlane',
            detail:
              'Canvas color field for the selected axes, drawn with WebGL or CPU.',
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
                detail: 'Optional Display P3 and sRGB boundary paths.',
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
                detail: 'Optional points that mark gamut-fallback colors.',
                id: 'fallback-points',
                label: 'Fallback points',
                measure: '[data-color-area-fallback-points-layer]',
                relation: 'child',
                slot: 'overlay',
                state: 'optional',
              },
            ],
            component: 'Layer',
            detail: 'Boundaries and points, drawn above the raster.',
            id: 'overlay-boundaries',
            label: 'Overlay paths',
            relation: 'slot',
            slot: 'overlay',
            state: 'optional',
          },
          {
            component: 'Thumb',
            detail: 'Focusable thumb for keyboard and pointer color changes.',
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
      'ControlInput structure',
      'A compact field with a value cell, a focus ring, and an optional scrub handle.',
      {
        children: [
          {
            children: [
              {
                component: 'ScrubArea',
                detail: 'Optional scrub handle; drag to change the value.',
                id: 'scrub-handle',
                label: 'Scrub handle',
                measure: slot('control-field-scrub-area'),
                relation: 'child',
                slot: 'children',
              },
              {
                component: 'Input',
                detail: 'Text input that parses numbers and expressions.',
                id: 'value-cell',
                label: 'Value cell',
                measure: slot('control-field-input'),
                relation: 'child',
                slot: 'children',
              },
            ],
            component: 'Group',
            detail: 'Rounded field surface and hit area.',
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
      'ControlField structure',
      'A compact Base UI number field with an inline scrub handle and an optional affix.',
      {
        children: [
          {
            children: [
              {
                component: 'ScrubArea',
                detail: 'Inline drag target that scrubs the value.',
                id: 'control-field-scrub-area',
                label: 'Scrub handle',
                measure: slot('control-field-scrub-area'),
                relation: 'child',
                slot: 'children',
              },
              {
                component: 'Input',
                detail:
                  'Locale-aware number entry that also accepts expressions.',
                id: 'control-field-input',
                label: 'Input',
                measure: slot('control-field-input'),
                relation: 'child',
                slot: 'children',
              },
              {
                component: 'Affix',
                detail: 'Optional unit or status text inside the group.',
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
        detail: 'Owns the value, formatting, validation, and stepping.',
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
      'MultiInputControl structure',
      'Several ControlInput segments in one shared group.',
      {
        children: [
          {
            children: [
              {
                component: 'ScrubArea',
                detail: 'Per-segment scrub handle: a letter or the unit.',
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
            detail: 'One ControlInput segment per field.',
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
        detail: 'Shared rounded container for the segments.',
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
      'Checkbox structure',
      'A row target with an indicator box, a check mark, and a label.',
      {
        children: [
          {
            children: [
              {
                component: 'CheckIcon',
                detail: 'Check mark drawn above the indicator when checked.',
                id: 'check-mark',
                label: 'State glyph',
                measure: `${slot('checkbox-indicator')} svg`,
                relation: 'child',
                slot: 'children',
              },
            ],
            component: 'Indicator',
            detail: 'The visible box that reflects the checked state.',
            id: 'indicator-box',
            label: 'Indicator',
            measure: slot('checkbox-indicator'),
            relation: 'child',
            slot: 'children',
          },
          {
            component: 'Label',
            detail: 'Label text beside the indicator.',
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
      'ColorSlider structure',
      'A rail with a gradient track, an active range, markers, and a draggable thumb.',
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
            detail: 'Draggable thumb over the rail.',
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
      'Tooltip structure',
      'A trigger and a floating content layer, portaled while open.',
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
        detail: 'Focusable element that opens the tooltip on hover or focus.',
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
      'Menu structure',
      'A trigger and a floating menu of grouped items, with an optional submenu.',
      {
        children: [
          {
            children: [
              {
                component: 'MenuItem',
                detail: 'Command rows inside the menu.',
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
            detail: 'Portaled menu popup; measured while open.',
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
        detail: 'Button that opens the menu.',
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
      'Select structure',
      'A trigger that shows the selected value, and a floating option list.',
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
            detail: 'Floating menu of options; measured while open.',
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
      'Tabs structure',
      'A tab list of triggers with roving focus, and one panel per value.',
      {
        children: [
          {
            children: [
              {
                component: 'TabsTrigger',
                detail: 'Inactive trigger in the roving focus order.',
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
                detail: 'Active trigger.',
                id: 'active-tab',
                label: 'TabsTrigger',
                measure: `${slot('tabs-trigger')}[data-active]`,
                relation: 'child',
                slot: 'trigger',
              },
            ],
            component: 'TabsList',
            detail: 'Container that groups the triggers.',
            id: 'tabs-list',
            label: 'TabsList',
            measure: slot('tabs-list'),
            relation: 'child',
            slot: 'children',
          },
          {
            component: 'TabsContent',
            detail: 'Panel for the active tab.',
            id: 'tab-content',
            label: 'TabsContent',
            measure: `${slot('tabs-content')}:not([hidden])`,
            relation: 'sibling',
            slot: 'content',
          },
          {
            component: 'TabsContent',
            detail: 'Panel for an inactive tab, a sibling of the active panel.',
            id: 'inactive-tab-content',
            label: 'TabsContent',
            relation: 'sibling',
            slot: 'content',
          },
        ],
        component: 'Tabs',
        detail: 'Owns the active tab value.',
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
      'ToggleButton structure',
      'A two-state button with icon and label content and an on/off fill.',
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
        detail: 'Button target, focus ring, and on/off fill.',
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
      'ToggleGroup structure',
      'A group of toggle buttons with roving focus and shared selection.',
      {
        children: [
          {
            component: 'ToggleGroupItem',
            detail: 'The toggle buttons.',
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
            detail: 'The pressed item.',
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
        detail: 'Container that groups the items.',
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
