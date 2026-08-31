import { describe, expect, it } from 'vitest';
import checkboxDocs from './checkbox.md?raw';
import colorPlaneDocs from './color-plane.md?raw';
import controlFieldDocs from './control-field.md?raw';
import menuDocs from './menu.md?raw';
import selectDocs from './select.md?raw';
import sliderDocs from './slider.md?raw';
import tabsDocs from './tabs.md?raw';
import tabsDocsPageSource from './tabs-docs-page.tsx?raw';
import toggleButtonDocs from './toggle-button.md?raw';
import toggleGroupDocs from './toggle-group.md?raw';
import tooltipDocs from './tooltip.md?raw';

const COMPONENT_DOCS = {
  checkbox: checkboxDocs,
  colorPlane: colorPlaneDocs,
  controlField: controlFieldDocs,
  menu: menuDocs,
  select: selectDocs,
  slider: sliderDocs,
  tabs: tabsDocs,
  toggleButton: toggleButtonDocs,
  toggleGroup: toggleGroupDocs,
  tooltip: tooltipDocs,
};

describe('component API reference documentation', () => {
  it.each(Object.entries(COMPONENT_DOCS))(
    'uses expandable prop-table slots for %s',
    (_name, source) => {
      expect(source).toContain('## API reference');

      const propSlots = source.match(/<!-- props:[a-z0-9-]+ -->/g) ?? [];
      expect(propSlots.length).toBeGreaterThan(0);
      expect(new Set(propSlots).size).toBe(propSlots.length);
    },
  );

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
