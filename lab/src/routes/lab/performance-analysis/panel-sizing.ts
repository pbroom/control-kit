const LAB_PERFORMANCE_PANEL_RUBBER_BAND_LIMIT = 96;
const LAB_PERFORMANCE_PANEL_RUBBER_BAND_RESISTANCE = 56;
export const LAB_PERFORMANCE_PANEL_DEFAULT_HEIGHT = 320;
export const LAB_PERFORMANCE_PANEL_COLLAPSED_HEIGHT = 0;
export const LAB_PERFORMANCE_PANEL_HANDLE_HIT_AREA = 32;
export const LAB_PERFORMANCE_PANEL_MIN_HEIGHT = 128;
export const LAB_PERFORMANCE_PANEL_RESIZE_STEP = 16;
export const LAB_PERFORMANCE_PANEL_SURFACE_PADDING_BOTTOM = 16;
export const LAB_PERFORMANCE_PANEL_SURFACE_PADDING_TOP =
  LAB_PERFORMANCE_PANEL_HANDLE_HIT_AREA;
export const LAB_PERFORMANCE_PANEL_VERTICAL_PADDING =
  LAB_PERFORMANCE_PANEL_SURFACE_PADDING_TOP +
  LAB_PERFORMANCE_PANEL_SURFACE_PADDING_BOTTOM;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function clampPerformancePanelHeight(height: number, maxHeight: number) {
  return Math.min(
    maxHeight,
    Math.max(LAB_PERFORMANCE_PANEL_COLLAPSED_HEIGHT, Math.round(height)),
  );
}

export function clampPerformancePanelOpenHeight(
  height: number,
  maxHeight: number,
) {
  return Math.min(
    maxHeight,
    Math.max(LAB_PERFORMANCE_PANEL_MIN_HEIGHT, Math.round(height)),
  );
}

function getPerformancePanelRubberBandOvershoot(overshoot: number) {
  return (
    LAB_PERFORMANCE_PANEL_RUBBER_BAND_LIMIT *
    (1 - Math.exp(-overshoot / LAB_PERFORMANCE_PANEL_RUBBER_BAND_RESISTANCE))
  );
}

export function getPerformancePanelDragHeight(
  height: number,
  maxHeight: number,
) {
  if (height > maxHeight) {
    return Math.round(
      maxHeight + getPerformancePanelRubberBandOvershoot(height - maxHeight),
    );
  }

  return clampPerformancePanelHeight(height, maxHeight);
}

export function getPerformancePanelCollapseProgress(height: number) {
  return clamp(
    height / LAB_PERFORMANCE_PANEL_MIN_HEIGHT,
    LAB_PERFORMANCE_PANEL_COLLAPSED_HEIGHT,
    1,
  );
}
