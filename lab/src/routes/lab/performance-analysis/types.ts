import type { CSSProperties } from 'react';

export type LabPerformanceTone = 'good' | 'okay' | 'poor' | 'neutral';

export type LabPerformanceAnalysis = {
  label: string;
  primitiveStructure: LabPrimitiveStructure;
};

export type LabPrimitiveStructureLayer = {
  color: string;
  depth?: number;
  detail: string;
  height: number;
  id: string;
  label: string;
  offsetX?: number;
  offsetY?: number;
  offsetZ?: number;
  opacity?: number;
  width: number;
};

export type LabPrimitiveStructure = {
  layers: readonly LabPrimitiveStructureLayer[];
  summary: string;
  title: string;
};

export type LabHtmlInCanvasSupportState =
  | 'checking'
  | 'supported'
  | 'unsupported';

export type LabPerformanceResourceStats = {
  moduleRequests: number;
  moduleDurationMs: number;
};

export type LabPerformanceMetricKey =
  | 'fcp'
  | 'lcp'
  | 'cls'
  | 'inp'
  | 'fps'
  | 'loading';

export type LabPerformanceAttributions = Record<
  LabPerformanceMetricKey,
  string
>;

export type LabMetricRangeDirection = 'higher' | 'lower';

export type LabMetricRangeUnit = 'fps' | 'milliseconds' | 'score';

export type LabMetricRangeConfig = {
  direction: LabMetricRangeDirection;
  goodThreshold: number;
  max: number;
  min: number;
  okayThreshold: number;
  unit: LabMetricRangeUnit;
};

export type LabPerformanceVitals = {
  fcpMs: number | null;
  lcpMs: number | null;
  cls: number;
  inpMs: number | null;
  fps: number | null;
  minFps: number | null;
  loadingMs: number | null;
  longTasks: number;
  resources: LabPerformanceResourceStats;
  attributions: LabPerformanceAttributions;
};

export type LabTimelineEventKind =
  | 'route'
  | 'loading'
  | 'resource'
  | 'vital'
  | 'interaction'
  | 'long-task';

export type LabTimelineEvent = {
  durationMs: number;
  id: string;
  kind: LabTimelineEventKind;
  label: string;
  detail: string;
  timeMs: number;
};

export type LayoutShiftPerformanceEntry = PerformanceEntry & {
  value: number;
  hadRecentInput: boolean;
  sources?: Array<{
    node?: Node | null;
  }>;
};

export type LargestContentfulPaintPerformanceEntry = PerformanceEntry & {
  element?: Element | null;
  renderTime?: number;
  loadTime?: number;
  size?: number;
  url?: string;
};

export type LabPreviewLcpCandidate = {
  element: Element;
  priority: number;
  size: number;
};

export type InteractionPerformanceEntry = PerformanceEntry & {
  duration: number;
  interactionId?: number;
  target?: EventTarget | null;
};

export type LabPerformancePanelStyle = CSSProperties & {
  '--lab-performance-panel-content-max-height': string;
  '--lab-performance-panel-frame-height': string;
  '--lab-performance-panel-height': string;
  '--lab-performance-panel-opacity': string;
  '--lab-performance-panel-translate-y': string;
};

export type LabMetricRangeSegment = {
  end: number;
  start: number;
  tone: Exclude<LabPerformanceTone, 'neutral'>;
};

export type LabMetricRangeCardPlacement = 'bottom' | 'top';

export type LabMetricRangeCardState = {
  left: number;
  placement: LabMetricRangeCardPlacement;
  top: number;
};

export type LabTimelineStoryRow = {
  actualEndMs: number;
  actualGapMs: number;
  actualStartMs: number;
  event: LabTimelineEvent;
  storyDurationMs: number;
  storyEndMs: number;
  storyStartMs: number;
};
