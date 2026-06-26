import type { LabPageKey } from '../shared.js';
import type { LabPerformanceAnalysis } from './types.js';

export const LAB_PERFORMANCE_ANALYSIS: Record<
  LabPageKey,
  LabPerformanceAnalysis
> = {
  plane: {
    label: 'ColorPlane',
  },
  input: {
    label: 'Input Primitive',
  },
  inputMulti: {
    label: 'Input Multi',
  },
  checkbox: {
    label: 'Checkbox',
  },
  slider: {
    label: 'Slider',
  },
  tooltip: {
    label: 'Tooltip',
  },
  menu: {
    label: 'Menu',
  },
  select: {
    label: 'Select',
  },
  toggleButton: {
    label: 'Toggle Button',
  },
  toggle: {
    label: 'Toggle Group',
  },
};

export const LAB_PAGE_RESOURCE_HINTS: Record<LabPageKey, readonly string[]> = {
  plane: ['color-plane'],
  input: ['pages/input', 'input-'],
  inputMulti: ['input-multi'],
  checkbox: ['checkbox'],
  slider: ['slider'],
  tooltip: ['tooltip'],
  menu: ['menu'],
  select: ['select'],
  toggleButton: ['toggle-button'],
  toggle: ['toggle-group'],
};
