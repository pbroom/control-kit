import { describe, expect, it } from 'vitest';
import checkboxDocs from './checkbox.md?raw';
import checkboxDocsPageSource from './checkbox-docs-page.tsx?raw';
import colorPlaneDocs from './color-plane.md?raw';
import colorPlaneDocsPageSource from './color-plane-docs-page.tsx?raw';
import controlFieldDocs from './control-field.md?raw';
import controlFieldDocsPageSource from './control-field-docs-page.tsx?raw';
import inputDocsPageSource from './input-docs-page.tsx?raw';
import inputDocs from './input.md?raw';
import inputMultiDocsPageSource from './input-multi-docs-page.tsx?raw';
import inputMultiDocs from './input-multi.md?raw';
import menuDocs from './menu.md?raw';
import menuDocsPageSource from './menu-docs-page.tsx?raw';
import planeDocsPageSource from './plane-docs-page.tsx?raw';
import planeDocs from './plane.md?raw';
import propReferenceTableSource from './prop-reference-table.tsx?raw';
import selectDocs from './select.md?raw';
import selectDocsPageSource from './select-docs-page.tsx?raw';
import sliderDocs from './slider.md?raw';
import sliderDocsPageSource from './slider-docs-page.tsx?raw';
import tabsDocs from './tabs.md?raw';
import tabsDocsPageSource from './tabs-docs-page.tsx?raw';
import toggleButtonDocs from './toggle-button.md?raw';
import toggleButtonDocsPageSource from './toggle-button-docs-page.tsx?raw';
import toggleGroupDocs from './toggle-group.md?raw';
import toggleGroupDocsPageSource from './toggle-group-docs-page.tsx?raw';
import tooltipDocs from './tooltip.md?raw';
import tooltipDocsPageSource from './tooltip-docs-page.tsx?raw';

const PROP_TABLE_DOCS = {
  checkbox: { docs: checkboxDocs, page: checkboxDocsPageSource },
  colorPlane: { docs: colorPlaneDocs, page: colorPlaneDocsPageSource },
  controlField: { docs: controlFieldDocs, page: controlFieldDocsPageSource },
  input: { docs: inputDocs, page: inputDocsPageSource },
  inputMulti: { docs: inputMultiDocs, page: inputMultiDocsPageSource },
  menu: { docs: menuDocs, page: menuDocsPageSource },
  plane: { docs: planeDocs, page: planeDocsPageSource },
  select: { docs: selectDocs, page: selectDocsPageSource },
  slider: { docs: sliderDocs, page: sliderDocsPageSource },
  tabs: { docs: tabsDocs, page: tabsDocsPageSource },
  toggleButton: {
    docs: toggleButtonDocs,
    page: toggleButtonDocsPageSource,
  },
  toggleGroup: { docs: toggleGroupDocs, page: toggleGroupDocsPageSource },
  tooltip: { docs: tooltipDocs, page: tooltipDocsPageSource },
};

describe('component API reference documentation', () => {
  it.each(Object.entries(PROP_TABLE_DOCS))(
    'uses expandable prop-table slots for %s',
    (_name, { docs, page }) => {
      expect(docs).toContain('## API reference');

      const propSlots = docs.match(/<!-- props:[a-z0-9-]+ -->/g) ?? [];
      expect(propSlots.length).toBeGreaterThan(0);
      expect(new Set(propSlots).size).toBe(propSlots.length);
      expect(page).toContain('<PropReferenceTable');
      expect(page).toContain('description:');
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
