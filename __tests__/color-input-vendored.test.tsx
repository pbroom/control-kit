// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import './helpers/dom-polyfills.js';

// The vendored color-kit ColorInput resolves `control-kit` and
// `@color-kit/core` through the aliases in vitest.config.ts.
const { ColorInput } =
  await import('../lab/src/vendor/color-kit/react/color-input.js');
const { fromHex: parseColor } =
  await import('../lab/src/vendor/color-kit/core/index.js');

const mountedRoots: Root[] = [];

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  for (const root of mountedRoots.splice(0)) {
    act(() => root.unmount());
  }
  document.body.replaceChildren();
});

function typeText(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function keyDown(input: HTMLInputElement, key: string) {
  act(() => {
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    );
  });
}

describe('vendored ColorInput', () => {
  it('restores data-valid after Escape clears an invalid Enter commit', () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    mountedRoots.push(root);
    const onChangeRequested = vi.fn();
    act(() =>
      root.render(
        <ColorInput
          model="oklch"
          channel="h"
          requested={parseColor('#ff0000')}
          onChangeRequested={onChangeRequested}
        />,
      ),
    );
    const rootElement = container.querySelector(
      '[data-color-input]',
    ) as HTMLElement;
    const input = container.querySelector(
      '[data-slot="control-field-input"]',
    ) as HTMLInputElement;
    expect(rootElement.hasAttribute('data-valid')).toBe(true);

    act(() => input.focus());
    act(() => typeText(input, '2/'));
    keyDown(input, 'Enter');
    expect(rootElement.hasAttribute('data-valid')).toBe(false);

    keyDown(input, 'Escape');
    expect(rootElement.hasAttribute('data-valid')).toBe(true);
    expect(onChangeRequested).not.toHaveBeenCalled();
  });

  it('applies an Enter commit as text input', () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    mountedRoots.push(root);
    const onChangeRequested = vi.fn();
    act(() =>
      root.render(
        <ColorInput
          model="oklch"
          channel="h"
          requested={parseColor('#ff0000')}
          onChangeRequested={onChangeRequested}
        />,
      ),
    );
    const input = container.querySelector(
      '[data-slot="control-field-input"]',
    ) as HTMLInputElement;

    act(() => input.focus());
    act(() => typeText(input, '120'));
    keyDown(input, 'Enter');

    expect(onChangeRequested).toHaveBeenCalledTimes(1);
    expect(onChangeRequested.mock.calls[0][1]).toMatchObject({
      interaction: 'text-input',
    });
  });
});
