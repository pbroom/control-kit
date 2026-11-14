// @vitest-environment jsdom

import { act, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { checkPattern, type Pattern } from '@ui-sdk/core/testing';
import { Checkbox } from '../src/checkbox.js';
import { ColorValueSlider, Slider } from '../src/slider.js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../src/tabs.js';
import './helpers/dom-polyfills.js';

/**
 * Holds the controls to their WAI-ARIA Authoring Practices pattern with UI
 * SDK's checker: roles, required states, names, id references and tab stops,
 * then the pattern's keys driven from the focused element.
 */

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
};
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;

const mountedRoots: Root[] = [];

function mount(element: ReactNode) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push(root);
  act(() => root.render(element));
  return container;
}

/**
 * The checker presses keys and waits for the page to settle on its own, so
 * React has to flush updates the way it does in a browser rather than wait
 * for `act`.
 */
async function check(root: Element, pattern: Pattern) {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
  try {
    await checkPattern(root, pattern);
  } finally {
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  }
}

afterEach(() => {
  for (const root of mountedRoots.splice(0)) {
    act(() => root.unmount());
  }
  document.body.replaceChildren();
});

function ThreeTabs({ orientation }: { orientation?: 'vertical' }) {
  return (
    <Tabs defaultValue="one" orientation={orientation}>
      <TabsList aria-label="Sections">
        <TabsTrigger value="one">First</TabsTrigger>
        <TabsTrigger value="two">Second</TabsTrigger>
        <TabsTrigger value="three">Third</TabsTrigger>
      </TabsList>
      <TabsContent value="one">First panel</TabsContent>
      <TabsContent value="two">Second panel</TabsContent>
      <TabsContent value="three">Third panel</TabsContent>
    </Tabs>
  );
}

function StatefulCheckbox({ initial = false }: { initial?: boolean }) {
  const [checked, setChecked] = useState(initial);
  return (
    <Checkbox checked={checked} onCheckedChange={setChecked}>
      Enable option
    </Checkbox>
  );
}

describe('ARIA patterns', () => {
  describe('Tabs', () => {
    it('follows the tabs pattern', async () => {
      await check(mount(<ThreeTabs />), 'tabs');
    });

    it('follows the tabs pattern when vertical', async () => {
      await check(mount(<ThreeTabs orientation="vertical" />), 'tabs');
    });
  });

  describe('Slider', () => {
    it('follows the slider pattern', async () => {
      await check(
        mount(<Slider aria-label="Opacity" defaultValue={40} />),
        'slider',
      );
    });

    it('follows the slider pattern when vertical', async () => {
      await check(
        mount(
          <Slider
            aria-label="Volume"
            defaultValue={40}
            orientation="vertical"
          />,
        ),
        'slider',
      );
    });

    it('follows the slider pattern with a custom range and step', async () => {
      await check(
        mount(
          <Slider
            aria-label="Scale"
            defaultValue={0.5}
            min={-1}
            max={1}
            step={0.1}
            largeStep={0.5}
          />,
        ),
        'slider',
      );
    });

    it('follows the slider pattern as a ColorValueSlider', async () => {
      await check(
        mount(
          <ColorValueSlider aria-label="Hue" defaultValue={120} max={360} />,
        ),
        'slider',
      );
    });
  });

  describe('Checkbox', () => {
    // Base UI renders a second, `aria-hidden` native input beside the control
    // for form submission. Assistive technology never reaches it, but the
    // checker counts it as an unnamed checkbox, so check the control itself.
    const control = (container: Element) =>
      container.querySelector('[role="checkbox"]')!;

    it('follows the checkbox pattern', async () => {
      await check(control(mount(<StatefulCheckbox />)), 'checkbox');
    });

    it('follows the checkbox pattern when it starts checked', async () => {
      await check(control(mount(<StatefulCheckbox initial />)), 'checkbox');
    });
  });

  // Proves the checks above can fail: an unnamed control breaks its pattern.
  describe('the checker', () => {
    it('reports a slider without a name', async () => {
      await expect(
        check(mount(<Slider defaultValue={40} />), 'slider'),
      ).rejects.toThrow(/no accessible name/);
    });

    it('reports a slider whose keys change nothing', async () => {
      await expect(
        check(mount(<Slider aria-label="Opacity" value={40} />), 'slider'),
      ).rejects.toThrow(/should raise the value from 40/);
    });

    it('reports a checkbox that Space does not toggle', async () => {
      const container = mount(
        <Checkbox checked={false} onCheckedChange={() => {}}>
          Enable option
        </Checkbox>,
      );
      await expect(
        check(container.querySelector('[role="checkbox"]')!, 'checkbox'),
      ).rejects.toThrow(/Space should change aria-checked/);
    });

    it('reports a tablist without a name', async () => {
      await expect(
        check(
          mount(
            <Tabs defaultValue="one">
              <TabsList>
                <TabsTrigger value="one">First</TabsTrigger>
                <TabsTrigger value="two">Second</TabsTrigger>
              </TabsList>
              <TabsContent value="one">First panel</TabsContent>
              <TabsContent value="two">Second panel</TabsContent>
            </Tabs>,
          ),
          'tabs',
        ),
      ).rejects.toThrow(/no accessible name/);
    });
  });
});
