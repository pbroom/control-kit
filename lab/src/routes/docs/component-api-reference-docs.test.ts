import { createElement, isValidElement, type ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MarkdownDocsPage } from './markdown-docs-page.js';
import { PropReferenceTable } from './prop-reference-table.js';
import checkboxDocs from './checkbox.md?raw';
import { CheckboxDocsPage } from './checkbox-docs-page.js';
import colorPlaneDocs from './color-plane.md?raw';
import { ColorPlaneDocsPage } from './color-plane-docs-page.js';
import controlFieldDocs from './control-field.md?raw';
import { ControlFieldDocsPage } from './control-field-docs-page.js';
import { InputDocsPage } from './input-docs-page.js';
import inputDocs from './input.md?raw';
import { InputMultiDocsPage } from './input-multi-docs-page.js';
import inputMultiDocs from './input-multi.md?raw';
import menuDocs from './menu.md?raw';
import { MenuDocsPage } from './menu-docs-page.js';
import { PlaneDocsPage } from './plane-docs-page.js';
import planeDocs from './plane.md?raw';
import propReferenceTableSource from './prop-reference-table.tsx?raw';
import selectDocs from './select.md?raw';
import { SelectDocsPage } from './select-docs-page.js';
import sliderDocs from './slider.md?raw';
import { SliderDocsPage } from './slider-docs-page.js';
import tabsDocs from './tabs.md?raw';
import { TabsDocsPage } from './tabs-docs-page.js';
import tabsDocsPageSource from './tabs-docs-page.tsx?raw';
import toggleButtonDocs from './toggle-button.md?raw';
import { ToggleButtonDocsPage } from './toggle-button-docs-page.js';
import toggleGroupDocs from './toggle-group.md?raw';
import { ToggleGroupDocsPage } from './toggle-group-docs-page.js';
import tooltipDocs from './tooltip.md?raw';
import { TooltipDocsPage } from './tooltip-docs-page.js';

const PROP_TABLE_DOCS = {
  checkbox: { docs: checkboxDocs, page: CheckboxDocsPage },
  colorPlane: { docs: colorPlaneDocs, page: ColorPlaneDocsPage },
  controlField: { docs: controlFieldDocs, page: ControlFieldDocsPage },
  input: { docs: inputDocs, page: InputDocsPage },
  inputMulti: { docs: inputMultiDocs, page: InputMultiDocsPage },
  menu: { docs: menuDocs, page: MenuDocsPage },
  plane: { docs: planeDocs, page: PlaneDocsPage },
  select: { docs: selectDocs, page: SelectDocsPage },
  slider: { docs: sliderDocs, page: SliderDocsPage },
  tabs: { docs: tabsDocs, page: TabsDocsPage },
  toggleButton: {
    docs: toggleButtonDocs,
    page: ToggleButtonDocsPage,
  },
  toggleGroup: { docs: toggleGroupDocs, page: ToggleGroupDocsPage },
  tooltip: { docs: tooltipDocs, page: TooltipDocsPage },
};

// Inspect page registrations without rendering examples or loading their lab-only
// aliases, built-package imports, and WebGL/WASM dependencies.
vi.mock('@color-kit/control-kit', () => ({}));
vi.mock('color-kit/react', () => ({}));
vi.mock('./highlighted-code.js', () => ({}));
vi.mock('./docs-example.js', () => ({ DocsExample: () => null }));
vi.mock('../lab/shared.js', () => ({}));
vi.mock('../lab/lab-menu.js', () => ({}));
vi.mock('../../components/ui/dropdown-menu.js', () => ({}));

type PropSlots = NonNullable<ComponentProps<typeof MarkdownDocsPage>['slots']>;

function expectPropSlotContract(docs: string, slots: PropSlots) {
  const keys = Array.from(
    docs.matchAll(/<!--\s*(props:[a-z0-9-]+)\s*-->/g),
    (match) => match[1],
  );

  expect(keys.length).toBeGreaterThan(0);
  expect(new Set(keys).size).toBe(keys.length);
  expect(
    Object.keys(slots)
      .filter((key) => key.startsWith('props:'))
      .sort(),
  ).toEqual([...keys].sort());

  for (const key of keys) {
    const table = slots[key];
    expect(isValidElement(table), `${key} must render a prop table`).toBe(true);
    if (!isValidElement<ComponentProps<typeof PropReferenceTable>>(table)) {
      throw new Error(`${key} must render a prop table`);
    }
    expect(table.type, `${key} must use the shared prop table`).toBe(
      PropReferenceTable,
    );
    expect(
      Array.isArray(table.props.props),
      `${key} must provide prop rows`,
    ).toBe(true);
    expect(
      table.props.props.length,
      `${key} must document at least one prop`,
    ).toBeGreaterThan(0);
    for (const prop of table.props.props) {
      expect(
        typeof prop.description === 'string' &&
          prop.description.trim().length > 0,
        `${key}: ${prop.name} must have a description`,
      ).toBe(true);
    }
  }
}

describe('component API reference documentation', () => {
  it.each(Object.entries(PROP_TABLE_DOCS))(
    'registers a shared table with descriptions for every %s prop slot',
    (_name, { docs, page }) => {
      expect(docs).toContain('## API reference');
      const element = page();
      expect(element.type).toBe(MarkdownDocsPage);
      expect(element.props.source).toBe(docs);
      expectPropSlotContract(docs, element.props.slots);
    },
  );

  it.each(['missing', 'misspelled'])(
    'rejects a %s registration even when other tables remain',
    (mutation) => {
      const slots = { ...TabsDocsPage().props.slots };
      const table = slots['props:tabs-trigger'];
      delete slots['props:tabs-trigger'];
      if (mutation === 'misspelled') slots['props:tabs-triger'] = table;

      expect(() => expectPropSlotContract(tabsDocs, slots)).toThrow();
    },
  );

  it('rejects an individual slot that stops using the shared table', () => {
    const slots = {
      ...TabsDocsPage().props.slots,
      'props:tabs-trigger': createElement('div', {}, 'Props'),
    };

    expect(() => expectPropSlotContract(tabsDocs, slots)).toThrow(
      'props:tabs-trigger must use the shared prop table',
    );
  });

  it.each([undefined, '', '   '])(
    'rejects an individual prop description of %s',
    (description) => {
      const slots = { ...TabsDocsPage().props.slots };
      const table = slots['props:tabs-trigger'];
      const props = table.props.props.map(
        (prop: { description: string }, index: number) =>
          index === 0 ? { ...prop, description } : prop,
      );
      slots['props:tabs-trigger'] = createElement(PropReferenceTable, {
        ...table.props,
        props,
      });

      expect(() => expectPropSlotContract(tabsDocs, slots)).toThrow(
        'props:tabs-trigger: value must have a description',
      );
    },
  );

  it('keeps descriptions inside expanded rows instead of the table header', () => {
    const headerSource = propReferenceTableSource.slice(
      propReferenceTableSource.indexOf('aria-hidden="true"'),
      propReferenceTableSource.indexOf('{props.map'),
    );
    const expandedRowSource = propReferenceTableSource.slice(
      propReferenceTableSource.indexOf('<dl'),
    );

    expect(headerSource).toContain('>Prop</span>');
    expect(headerSource).toContain('>Type</span>');
    expect(headerSource).toContain('>Default</span>');
    expect(headerSource).not.toContain('Description');
    expect(expandedRowSource).toContain('Description');
    expect(expandedRowSource).toContain('{prop.description}');
  });

  it('matches wrapper-owned defaults and rendered element contracts', () => {
    const tabsListPropsSource = tabsDocsPageSource.slice(
      tabsDocsPageSource.indexOf('const TABS_LIST_PROPS'),
      tabsDocsPageSource.indexOf('const TABS_TRIGGER_PROPS'),
    );
    expect(tabsListPropsSource).toContain("name: 'loopFocus'");
    expect(tabsListPropsSource).toContain("defaultValue: 'true'");
    expect(controlFieldDocs).toContain(
      'The description forwards native paragraph props',
    );
  });
});
