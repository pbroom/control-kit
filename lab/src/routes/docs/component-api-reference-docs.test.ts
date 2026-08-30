import { describe, expect, it } from 'vitest';
import checkboxDocs from './checkbox.md?raw';
import colorPlaneDocs from './color-plane.md?raw';
import controlFieldDocs from './control-field.md?raw';
import menuDocs from './menu.md?raw';
import selectDocs from './select.md?raw';
import sliderDocs from './slider.md?raw';
import tabsDocs from './tabs.md?raw';
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
});
