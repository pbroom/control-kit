import { describe, expect, it, vi } from 'vitest';
import {
  getDocsPagePath,
  getLabPagePath,
  getPrimitivePagePath,
  LAB_PAGE_NAVIGATION,
} from '../lab/lab-page-runtime.js';
import { createRetryablePreloader, hasDocsPage } from './docs-registry.js';

describe('documentation routes', () => {
  it('registers every documented page', () => {
    expect(
      LAB_PAGE_NAVIGATION.filter((page) => hasDocsPage(page.value)).map(
        (page) => page.value,
      ),
    ).toEqual([
      'plane',
      'input',
      'inputMulti',
      'controlField',
      'checkbox',
      'colorPlane',
      'menu',
      'select',
      'slider',
      'tabs',
      'toggleButton',
      'toggle',
      'tooltip',
    ]);
  });

  it('separates low-level primitives from assembled components', () => {
    expect(
      LAB_PAGE_NAVIGATION.map(({ value, section }) => [value, section]),
    ).toEqual([
      ['plane', 'Primitives'],
      ['input', 'Primitives'],
      ['inputMulti', 'Primitives'],
      ['controlField', 'Components'],
      ['checkbox', 'Components'],
      ['colorPlane', 'Components'],
      ['menu', 'Components'],
      ['select', 'Components'],
      ['slider', 'Components'],
      ['tabs', 'Components'],
      ['toggleButton', 'Components'],
      ['toggle', 'Components'],
      ['tooltip', 'Components'],
    ]);
  });

  it('builds stable Docs and Lab paths from the shared page slug', () => {
    expect(getDocsPagePath('plane')).toBe('/docs/plane');
    expect(getLabPagePath('plane')).toBe('/lab/plane');
    expect(getPrimitivePagePath('plane', 'docs')).toBe('/docs/plane');
    expect(getPrimitivePagePath('plane', 'lab')).toBe('/lab/plane');
    expect(getDocsPagePath('colorPlane')).toBe('/docs/color-plane');
    expect(getDocsPagePath('checkbox')).toBe('/docs/checkbox');
    expect(getDocsPagePath('input')).toBe('/docs/input-primitive');
    expect(getDocsPagePath('inputMulti')).toBe('/docs/input-multi');
    expect(getDocsPagePath('controlField')).toBe('/docs/control-field');
    expect(getDocsPagePath('menu')).toBe('/docs/menu');
    expect(getDocsPagePath('select')).toBe('/docs/select');
    expect(getDocsPagePath('slider')).toBe('/docs/slider');
    expect(getDocsPagePath('tabs')).toBe('/docs/tabs');
    expect(getDocsPagePath('toggleButton')).toBe('/docs/toggle-button');
    expect(getDocsPagePath('toggle')).toBe('/docs/toggle-group');
    expect(getDocsPagePath('tooltip')).toBe('/docs/tooltip');
  });

  it('retries a documentation module after a transient load failure', async () => {
    const expectedModule = { default: () => null };
    const loader = vi
      .fn<() => Promise<typeof expectedModule>>()
      .mockRejectedValueOnce(new Error('temporary chunk failure'))
      .mockResolvedValue(expectedModule);
    const preloader = createRetryablePreloader(loader);

    await expect(preloader.preload()).rejects.toThrow(
      'temporary chunk failure',
    );
    await expect(preloader.preload()).resolves.toBe(expectedModule);
    await expect(preloader.preload()).resolves.toBe(expectedModule);
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
