// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  isCodexBrowserAnnotationNode,
  isCodexBrowserAnnotationOverlayMounted,
  isComponentLayoutShiftEntry,
} from './telemetry.js';
import type { LayoutShiftPerformanceEntry } from './types.js';

function layoutShiftEntry(
  sources: NonNullable<LayoutShiftPerformanceEntry['sources']>,
): LayoutShiftPerformanceEntry {
  return {
    duration: 0,
    entryType: 'layout-shift',
    hadRecentInput: false,
    name: '',
    sources,
    startTime: 0,
    toJSON: () => ({}),
    value: 0.1,
  };
}

describe('performance telemetry layout-shift filtering', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('recognizes Codex browser annotation nodes across shadow roots', () => {
    const root = document.createElement('div');
    root.id = 'codex-browser-sidebar-comments-root';
    document.body.append(root);

    const shadowRoot = root.attachShadow({ mode: 'open' });
    const surface = document.createElement('div');
    surface.setAttribute('data-browser-comment-root', 'true');
    const marker = document.createElement('span');
    const text = document.createTextNode('1');

    marker.append(text);
    surface.append(marker);
    shadowRoot.append(surface);

    expect(isCodexBrowserAnnotationOverlayMounted()).toBe(true);
    expect(isCodexBrowserAnnotationNode(root)).toBe(true);
    expect(isCodexBrowserAnnotationNode(surface)).toBe(true);
    expect(isCodexBrowserAnnotationNode(marker)).toBe(true);
    expect(isCodexBrowserAnnotationNode(text)).toBe(true);
  });

  it('ignores source-less shifts because they cannot be tied to the component', () => {
    const root = document.createElement('div');
    root.id = 'codex-browser-sidebar-comments-root';
    document.body.append(root);

    expect(isComponentLayoutShiftEntry(layoutShiftEntry([]))).toBe(false);
  });

  it('ignores shifts sourced only from annotation nodes', () => {
    const root = document.createElement('div');
    root.id = 'codex-browser-sidebar-comments-root';
    document.body.append(root);

    expect(
      isComponentLayoutShiftEntry(layoutShiftEntry([{ node: root }])),
    ).toBe(false);
  });

  it('keeps component shifts when a non-annotation source is present', () => {
    const preview = document.createElement('div');
    preview.setAttribute('data-lab-component-preview', 'true');
    const componentNode = document.createElement('div');
    preview.append(componentNode);

    const annotationRoot = document.createElement('div');
    annotationRoot.id = 'codex-browser-sidebar-comments-root';
    document.body.append(preview, annotationRoot);

    expect(
      isComponentLayoutShiftEntry(
        layoutShiftEntry([{ node: annotationRoot }, { node: componentNode }]),
      ),
    ).toBe(true);
  });

  it('ignores shifts sourced outside the component preview', () => {
    const appChromeNode = document.createElement('div');
    document.body.append(appChromeNode);

    expect(
      isComponentLayoutShiftEntry(layoutShiftEntry([{ node: appChromeNode }])),
    ).toBe(false);
  });
});
