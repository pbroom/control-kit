// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Plane, PlaneThumb } from '../src/plane.js';
import {
  PlaneAttachment,
  type PlaneAttachmentProps,
} from '../src/plane-attachment.js';
import './helpers/dom-polyfills.js';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

async function mount(props: Partial<PlaneAttachmentProps> = {}) {
  const host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  const onValueChange = vi.fn();
  await act(async () => {
    root!.render(
      <Plane pressBehavior="nearest">
        <PlaneThumb onValueChange={onValueChange}>
          <PlaneAttachment {...props}>
            <input aria-label="Name" defaultValue="Gradient" />
            <button type="button">Options</button>
          </PlaneAttachment>
        </PlaneThumb>
      </Plane>,
    );
  });
  return {
    host,
    onValueChange,
    thumb: host.querySelector('[data-slot="plane-thumb"]') as HTMLElement,
  };
}

describe('PlaneAttachment', () => {
  it.each([true, false])(
    'positions ordinary controls without dragging or dialog semantics (portal=%s)',
    async (portal) => {
      const { host, thumb, onValueChange } = await mount({ portal });
      const attachment = document.querySelector(
        '[data-slot="plane-attachment"]',
      ) as HTMLElement;
      expect(attachment).not.toBeNull();
      expect(attachment.hidden).toBe(false);
      expect(host.contains(attachment)).toBe(!portal);
      expect(document.querySelector('[role="dialog"]')).toBeNull();
      const input = attachment.querySelector('input')!;
      await act(async () => {
        input.dispatchEvent(
          new PointerEvent('pointerdown', {
            bubbles: true,
            button: 0,
            clientX: 30,
            clientY: 40,
          }),
        );
        input.focus();
        input.dispatchEvent(
          new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }),
        );
        input.dispatchEvent(
          new KeyboardEvent('keyup', { bubbles: true, key: 'ArrowRight' }),
        );
      });
      expect(document.activeElement).toBe(input);
      expect(onValueChange).not.toHaveBeenCalled();
      expect(thumb.hasAttribute('data-dragging')).toBe(false);
    },
  );

  it('keeps focus-only controls visible when focus moves into their portal', async () => {
    const { thumb } = await mount({ visibility: 'focus-within' });
    expect(document.querySelector('[data-slot="plane-attachment"]')).toBeNull();
    const axis = thumb.querySelector('input')!;
    await act(async () => axis.focus());
    const attachment = document.querySelector(
      '[data-slot="plane-attachment"]',
    ) as HTMLElement;
    expect(attachment).not.toBeNull();
    const name = attachment.querySelector('input')!;
    await act(async () => name.focus());
    expect(document.activeElement).toBe(name);
    expect(document.querySelector('[data-slot="plane-attachment"]')).toBe(
      attachment,
    );
    const options = attachment.querySelector('button')!;
    await act(async () => options.focus());
    expect(document.activeElement).toBe(options);
    expect(document.querySelector('[data-slot="plane-attachment"]')).toBe(
      attachment,
    );
    const outside = document.createElement('button');
    document.body.append(outside);
    await act(async () => outside.focus());
    expect(document.querySelector('[data-slot="plane-attachment"]')).toBeNull();
  });

  it('uses the requested portal container', async () => {
    const container = document.createElement('section');
    document.body.append(container);
    await mount({ container });
    expect(
      container.querySelector('[data-slot="plane-attachment"]'),
    ).not.toBeNull();
  });
});
