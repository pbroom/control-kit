import { expect, test, type Locator, type Page } from '@playwright/test';
import { collectBrowserErrors } from './lab-smoke-utils.js';

async function openSynthExample(page: Page) {
  await page.goto('/docs/plane-examples#xy-synth-pads');
  const example = page.getByRole('figure', {
    name: 'XY synth pads demo',
    exact: true,
  });
  await example.scrollIntoViewIfNeeded();
  await expect(example.locator('[data-synth-visualizer]')).toHaveAttribute(
    'data-synth-dot-count',
    '441',
  );
  return example;
}

async function setPlaneValue(page: Page, plane: Locator, x: number, y: number) {
  const bounds = await plane.boundingBox();
  if (!bounds) throw new Error('The synth Plane has no bounds.');
  await page.mouse.click(
    bounds.x + bounds.width * x,
    bounds.y + bounds.height * (1 - y),
  );
}

async function readNumber(locator: Locator, attribute: string) {
  return Number(await locator.getAttribute(attribute));
}

test('dot grid is the waveform and its palette blends both Plane axes', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors = await collectBrowserErrors(page);
  const example = await openSynthExample(page);
  const plane = example.locator('[data-synth-plane]');
  const visualizer = example.locator('[data-synth-visualizer]');

  await expect(visualizer).toHaveCSS('pointer-events', 'none');
  await expect(visualizer).toHaveAttribute('data-synth-idle-radius', '0.520');
  expect(
    await readNumber(visualizer, 'data-synth-active-radius'),
  ).toBeGreaterThan(2);

  const colors = new Set<string>();
  for (const [x, y] of [
    [0.05, 0.05],
    [0.95, 0.05],
    [0.05, 0.95],
    [0.95, 0.95],
    [0.5, 0.5],
  ] as const) {
    await setPlaneValue(page, plane, x, y);
    colors.add((await visualizer.getAttribute('data-synth-color')) ?? '');
  }
  expect(colors.size).toBe(5);
  expect(errors).toEqual([]);
});

test('brightness and modulation change both waveform and real synth parameters', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const example = await openSynthExample(page);
  const plane = example.locator('[data-synth-plane]');
  const interfaceRoot = example.locator('[data-synth-interface]');
  const visualizer = example.locator('[data-synth-visualizer]');

  await setPlaneValue(page, plane, 0.08, 0.35);
  const darkWave = await visualizer.getAttribute('data-synth-wave-sample');
  const darkFrequency = await readNumber(
    interfaceRoot,
    'data-synth-filter-frequency',
  );
  const darkHarmonics = await readNumber(
    interfaceRoot,
    'data-synth-harmonic-gain',
  );

  await setPlaneValue(page, plane, 0.92, 0.35);
  const brightWave = await visualizer.getAttribute('data-synth-wave-sample');
  expect(brightWave).not.toBe(darkWave);
  expect(
    await readNumber(interfaceRoot, 'data-synth-filter-frequency'),
  ).toBeGreaterThan(darkFrequency * 5);
  expect(
    await readNumber(interfaceRoot, 'data-synth-harmonic-gain'),
  ).toBeGreaterThan(darkHarmonics * 3);

  await setPlaneValue(page, plane, 0.5, 0.08);
  const dryWave = await visualizer.getAttribute('data-synth-wave-sample');
  const dryDepth = await readNumber(
    interfaceRoot,
    'data-synth-modulation-depth',
  );
  const dryRate = await readNumber(interfaceRoot, 'data-synth-modulation-rate');

  await setPlaneValue(page, plane, 0.5, 0.92);
  expect(await visualizer.getAttribute('data-synth-wave-sample')).not.toBe(
    dryWave,
  );
  expect(
    await readNumber(interfaceRoot, 'data-synth-modulation-depth'),
  ).toBeGreaterThan(dryDepth * 10);
  expect(
    await readNumber(interfaceRoot, 'data-synth-modulation-rate'),
  ).toBeGreaterThan(dryRate * 5);
});

test('the analyser animates from the muted loop before the output gain', async ({
  page,
}) => {
  const errors = await collectBrowserErrors(page);
  const example = await openSynthExample(page);
  const interfaceRoot = example.locator('[data-synth-interface]');
  const visualizer = example.locator('[data-synth-visualizer]');
  const plane = example.locator('[data-synth-plane]');
  const volume = example.getByRole('slider', {
    name: 'Synth volume',
    exact: true,
  });

  await expect(volume).toHaveValue('0');
  await expect(interfaceRoot).toHaveAttribute(
    'data-synth-output-gain',
    '0.0000',
  );
  await setPlaneValue(page, plane, 0.7, 0.6);
  await expect(interfaceRoot).toHaveAttribute(
    'data-synth-audio-state',
    /running|suspended/,
  );
  await expect(visualizer).toHaveAttribute('data-synth-mode', 'analyser');
  const samples = new Set<string>();
  for (let index = 0; index < 6; index += 1) {
    samples.add(
      (await visualizer.getAttribute('data-synth-wave-sample')) ?? '',
    );
    await page.waitForTimeout(70);
  }
  expect(samples.size).toBeGreaterThan(1);
  await expect(interfaceRoot).toHaveAttribute(
    'data-synth-output-gain',
    '0.0000',
  );
  expect(errors).toEqual([]);
});

test('volume starts silent, resumes from input, mutes safely, and resets on reload', async ({
  page,
}) => {
  const example = await openSynthExample(page);
  const interfaceRoot = example.locator('[data-synth-interface]');
  const volume = example.getByRole('slider', {
    name: 'Synth volume',
    exact: true,
  });

  await volume.focus();
  await volume.press('ArrowRight');
  await expect(volume).toHaveValue('1');
  await expect(interfaceRoot).toHaveAttribute(
    'data-synth-output-gain',
    '0.0014',
  );
  await expect(interfaceRoot).toHaveAttribute(
    'data-synth-audio-state',
    /running|suspended/,
  );

  await volume.press('End');
  await expect(volume).toHaveValue('100');
  await expect(interfaceRoot).toHaveAttribute(
    'data-synth-output-gain',
    '0.1400',
  );
  await volume.press('Home');
  await expect(volume).toHaveValue('0');
  await expect(interfaceRoot).toHaveAttribute(
    'data-synth-output-gain',
    '0.0000',
  );

  await page.reload();
  const reopened = await openSynthExample(page);
  await expect(
    reopened.getByRole('slider', { name: 'Synth volume', exact: true }),
  ).toHaveValue('0');
  await expect(reopened.locator('[data-synth-interface]')).toHaveAttribute(
    'data-synth-output-gain',
    '0.0000',
  );
});

test('pointer and keyboard keep the real Plane controls responsive', async ({
  page,
}) => {
  const example = await openSynthExample(page);
  const plane = example.locator('[data-synth-plane]');
  const brightness = example.getByRole('slider', {
    name: 'Timbre brightness',
    exact: true,
  });
  const modulation = example.getByRole('slider', {
    name: 'Modulation depth',
    exact: true,
  });

  await setPlaneValue(page, plane, 0.25, 0.75);
  expect(Number(await brightness.inputValue())).toBeCloseTo(0.25, 1);
  expect(Number(await modulation.inputValue())).toBeCloseTo(0.75, 1);

  await brightness.focus();
  const beforeBrightness = Number(await brightness.inputValue());
  await brightness.press('ArrowRight');
  expect(Number(await brightness.inputValue())).toBeGreaterThan(
    beforeBrightness,
  );
  await modulation.focus();
  const beforeModulation = Number(await modulation.inputValue());
  await modulation.press('ArrowDown');
  expect(Number(await modulation.inputValue())).toBeLessThan(beforeModulation);
});

test('reduced motion keeps one representative frame and never raises volume', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const example = await openSynthExample(page);
  const visualizer = example.locator('[data-synth-visualizer]');
  const brightness = example.getByRole('slider', {
    name: 'Timbre brightness',
    exact: true,
  });
  const volume = example.getByRole('slider', {
    name: 'Synth volume',
    exact: true,
  });

  await expect(visualizer).toHaveAttribute('data-synth-reduced', 'true');
  await expect(visualizer).toHaveAttribute('data-synth-mode', 'static');
  const renderCount = await readNumber(visualizer, 'data-synth-render-count');
  await page.waitForTimeout(300);
  expect(await readNumber(visualizer, 'data-synth-render-count')).toBe(
    renderCount,
  );
  await brightness.focus();
  await brightness.press('ArrowLeft');
  await expect(volume).toHaveValue('0');
  await expect(example.locator('[data-synth-interface]')).toHaveAttribute(
    'data-synth-output-gain',
    '0.0000',
  );
});

test('offscreen work pauses and unmount closes the audio context', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const originalClose = AudioContext.prototype.close;
    Object.defineProperty(window, '__synthClosedContexts', {
      configurable: true,
      value: 0,
      writable: true,
    });
    AudioContext.prototype.close = function close() {
      const state = window as typeof window & {
        __synthClosedContexts: number;
      };
      state.__synthClosedContexts += 1;
      return originalClose.call(this);
    };
  });
  const example = await openSynthExample(page);
  const interfaceRoot = example.locator('[data-synth-interface]');
  const visualizer = example.locator('[data-synth-visualizer]');
  await setPlaneValue(page, example.locator('[data-synth-plane]'), 0.6, 0.6);
  await expect(interfaceRoot).toHaveAttribute(
    'data-synth-audio-state',
    'running',
  );

  await page
    .getByRole('heading', { name: 'Color', exact: true })
    .first()
    .scrollIntoViewIfNeeded();
  await expect(interfaceRoot).toHaveAttribute(
    'data-synth-audio-state',
    'suspended',
  );
  await page.waitForTimeout(100);
  const pausedCount = await readNumber(visualizer, 'data-synth-render-count');
  await page.waitForTimeout(300);
  expect(await readNumber(visualizer, 'data-synth-render-count')).toBe(
    pausedCount,
  );

  await page.getByRole('link', { name: 'Plane', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as typeof window & {
              __synthClosedContexts: number;
            }
          ).__synthClosedContexts,
      ),
    )
    .toBeGreaterThan(0);
});
