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

function getExamplesSection(source: string) {
  const examplesStart = source.indexOf('## Examples');
  const apiStart = source.indexOf('## API reference');

  expect(examplesStart).toBeGreaterThan(-1);
  expect(apiStart).toBeGreaterThan(examplesStart);

  return source.slice(examplesStart, apiStart);
}

describe('component example documentation', () => {
  it.each(Object.entries(COMPONENT_DOCS))(
    'renders source-backed examples for every documented %s pattern',
    (_name, source) => {
      expect(source).toContain('<!-- demo:basic -->');

      const examples = getExamplesSection(source);
      const headings = examples.match(/^### .+$/gm) ?? [];
      const demoSlots = examples.match(/<!-- demo:[a-z0-9-]+ -->/g) ?? [];

      expect(demoSlots).toHaveLength(headings.length);
      expect(new Set(demoSlots).size).toBe(demoSlots.length);
    },
  );
});
