/**
 * How a change was produced, whatever control reported it: typed text
 * (including expressions), a key, a pointer gesture, or code.
 */
export type ControlInteraction =
  | 'text-input'
  | 'keyboard'
  | 'pointer'
  | 'programmatic';

/**
 * What every change, commit and snap callback's details share. Each control
 * adds its own fields, such as Plane's `snap` or Base UI's `cancel()`.
 */
export type ControlChangeDetails = {
  /** What happened, such as `'drag'`, `'keyboard'` or `'input-commit'`. */
  reason: string;
  /** The native event behind the change, when there is one. */
  event?: Event;
  /** Set by controls that already classify their changes, like Plane. */
  interaction?: ControlInteraction;
};

const TEXT_INPUT_REASONS = new Set<string>([
  'input-change',
  'input-clear',
  'input-blur',
  'input-commit',
  'input-paste',
  'expression',
]);
const KEYBOARD_REASONS = new Set<string>([
  'keyboard',
  'page-step',
  'boundary-key',
  'list-navigation',
  'escape-key',
]);
const POINTER_REASONS = new Set<string>([
  'scrub',
  'increment-press',
  'decrement-press',
  'wheel',
  'drag',
  'track-press',
  'thumb-drag',
  'plane-press',
  'pointer',
  'swipe',
]);

function interactionOfEvent(event: Event | undefined) {
  if (!event) return undefined;
  if (event.type.startsWith('key')) return 'keyboard';
  if (/^(pointer|mouse|touch|wheel|click|dblclick)/.test(event.type)) {
    // A click with no pointer behind it comes from the keyboard or
    // assistive technology.
    return event.type === 'click' && (event as MouseEvent).detail === 0
      ? 'keyboard'
      : 'pointer';
  }
  if (/^(input|beforeinput|paste|change)$/.test(event.type)) {
    return 'text-input';
  }
  return undefined;
}

/**
 * Says how a change was produced, from the details any Control Kit callback
 * receives: `onValueChange`, `onValueCommitted` and `onSnapChange` on every
 * control. Use it to tell a drag from a typed value without matching each
 * control's reasons.
 *
 * It reads `details.interaction` when the control sets it, then the reason,
 * then the native event. A change with none of those is `'programmatic'`.
 */
export function getControlInteraction(
  details: ControlChangeDetails,
): ControlInteraction {
  if (details.interaction) return details.interaction;
  if (TEXT_INPUT_REASONS.has(details.reason)) return 'text-input';
  if (KEYBOARD_REASONS.has(details.reason)) return 'keyboard';
  if (POINTER_REASONS.has(details.reason)) return 'pointer';
  return interactionOfEvent(details.event) ?? 'programmatic';
}
