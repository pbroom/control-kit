import { describe, expect, it } from 'vitest';
import basicExample from './examples/slider-basic-example.tsx?raw';
import channelsExample from './examples/slider-channels-example.tsx?raw';
import rangeExample from './examples/slider-range-example.tsx?raw';
import stylingExample from './examples/slider-styling-example.tsx?raw';
import verticalExample from './examples/slider-vertical-example.tsx?raw';

const GRADIENT_EXAMPLES = [
  basicExample,
  channelsExample,
  rangeExample,
  stylingExample,
  verticalExample,
];

describe('slider gradient examples', () => {
  it('sizes one non-repeating gradient tile to the border box', () => {
    for (const source of GRADIENT_EXAMPLES) {
      expect(source).toContain('bg-origin-border bg-no-repeat');
    }
  });
});
