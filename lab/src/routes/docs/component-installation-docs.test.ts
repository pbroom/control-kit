import { describe, expect, it } from 'vitest';
import checkboxDocs from './checkbox.md?raw';
import colorPlaneDocs from './color-plane.md?raw';
import controlFieldDocs from './control-field.md?raw';
import inputDocs from './input.md?raw';
import inputMultiDocs from './input-multi.md?raw';
import menuDocs from './menu.md?raw';
import planeDocs from './plane.md?raw';
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

const PRIMITIVE_DOCS = {
  input: inputDocs,
  inputMulti: inputMultiDocs,
  plane: planeDocs,
};

describe('component installation documentation', () => {
  it.each(Object.entries(COMPONENT_DOCS))(
    'places a manual installation section before %s usage',
    (_name, source) => {
      const installationIndex = source.indexOf('## Installation\n\n### Manual');
      const usageIndex = source.indexOf('## Usage');

      expect(installationIndex).toBeGreaterThan(-1);
      expect(usageIndex).toBeGreaterThan(installationIndex);
    },
  );

  it.each(
    Object.entries({
      checkbox: checkboxDocs,
      controlField: controlFieldDocs,
      tabs: tabsDocs,
      toggleGroup: toggleGroupDocs,
      tooltip: tooltipDocs,
    }),
  )(
    'installs %s from npm first, with the GitHub install as a fallback',
    (_name, source) => {
      const npmIndex = source.indexOf(
        'pnpm add @pbroom/control-kit@next @base-ui/react',
      );
      const gitIndex = source.indexOf(
        'pnpm add --allow-build=@pbroom/control-kit @pbroom/control-kit@github:pbroom/control-kit @base-ui/react',
      );

      expect(npmIndex).toBeGreaterThan(-1);
      expect(gitIndex).toBeGreaterThan(npmIndex);
      expect(source).toContain(
        "@source '../node_modules/@pbroom/control-kit/src';",
      );
    },
  );

  it.each(Object.entries(PRIMITIVE_DOCS))(
    'leaves the %s primitive documentation unchanged',
    (_name, source) => {
      expect(source).not.toContain('## Installation');
    },
  );

  it('keeps Lab prototype copy instructions focused and dependency-complete', () => {
    const installationSection = (source: string) =>
      source.slice(
        source.indexOf('## Installation'),
        source.indexOf('## Usage'),
      );

    const menuInstallation = installationSection(menuDocs);
    expect(menuInstallation).toContain('menu-installation-example.tsx');
    expect(menuInstallation).toContain('lab/src/lib/utils.ts');
    expect(menuInstallation).not.toContain('routes/lab/shared.tsx');

    const selectInstallation = installationSection(selectDocs);
    expect(selectInstallation).toContain('select-basic-example.tsx');
    expect(selectInstallation).toContain('routes/lab/lab-menu.tsx');
    expect(selectInstallation).toContain('lab/src/lib/utils.ts');
    expect(selectInstallation).not.toContain('routes/lab/shared.tsx');

    const toggleButtonInstallation = installationSection(toggleButtonDocs);
    expect(toggleButtonInstallation).toContain(
      'toggle-button-basic-example.tsx',
    );
    expect(toggleButtonInstallation).not.toContain('routes/lab/shared.tsx');
  });
});
