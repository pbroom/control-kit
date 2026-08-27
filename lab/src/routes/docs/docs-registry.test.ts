import { describe, expect, it, vi } from 'vitest';
import {
  getDocsPagePath,
  getLabPagePath,
  getPrimitivePagePath,
  LAB_PAGE_NAVIGATION,
} from '../lab/lab-page-runtime.js';
import { createRetryablePreloader, hasDocsPage } from './docs-registry.js';

describe('documentation routes', () => {
  it('registers Plane as the only documented primitive', () => {
    expect(
      LAB_PAGE_NAVIGATION.filter((page) => hasDocsPage(page.value)).map(
        (page) => page.value,
      ),
    ).toEqual(['plane']);
  });

  it('builds stable Docs and Lab paths from the shared page slug', () => {
    expect(getDocsPagePath('plane')).toBe('/docs/plane');
    expect(getLabPagePath('plane')).toBe('/lab/plane');
    expect(getPrimitivePagePath('plane', 'docs')).toBe('/docs/plane');
    expect(getPrimitivePagePath('plane', 'lab')).toBe('/lab/plane');
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
