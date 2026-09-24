import * as React from 'react';
import { Field } from '@base-ui/react/field';
import { NumberField } from '@base-ui/react/number-field';
import {
  resolveControlFieldExpression,
  type ControlFieldExpressionResolver,
} from './control-field-expression.js';
import { useScrubGesture, type ScrubEndDetails } from './use-scrub-gesture.js';
import { cn } from './utils.js';

type PreventableBaseUIEvent = {
  preventBaseUIHandler?: () => void;
};

export type ControlFieldBoundaryBehavior = 'clamp' | 'wrap' | 'free';
export type ControlFieldArrowKeys = 'vertical' | 'both';
export type ControlFieldCustomReason =
  | 'expression'
  | 'page-step'
  | 'boundary-key'
  | 'keyboard'
  | 'scrub'
  | 'input-blur'
  | 'input-commit';

/** How a value change was produced, independent of the exact event reason. */
export type ControlFieldInteraction = 'text-input' | 'keyboard' | 'pointer';

export interface ControlFieldCustomEventDetails {
  reason: ControlFieldCustomReason;
  event: Event;
  expression?: string;
  trigger: Element | undefined;
  cancel: () => void;
  allowPropagation: () => void;
  isCanceled: boolean;
  isPropagationAllowed: boolean;
}

export type ControlFieldValueChangeDetails =
  | NumberField.Root.ChangeEventDetails
  | ControlFieldCustomEventDetails;

export type ControlFieldValueCommitDetails =
  | NumberField.Root.CommitEventDetails
  | Pick<ControlFieldCustomEventDetails, 'reason' | 'event' | 'expression'>;

export interface ControlFieldInvalidCommitDetails {
  /** `'input-blur'` for blur commits, `'input-commit'` for Enter. */
  reason: 'input-blur' | 'input-commit';
  event: Event;
  /** Whether the rejected text was an expression draft. */
  expression: boolean;
}

export interface ControlFieldRootProps extends Omit<
  NumberField.Root.Props,
  'defaultValue' | 'onValueChange' | 'onValueCommitted' | 'value'
> {
  value?: number | null;
  defaultValue?: number | null;
  /**
   * `clamp` keeps values inside `min`/`max`, `wrap` cycles across the range,
   * and `free` lets typed, keyboard, and scrub values leave the range while
   * `min`/`max` still describe it.
   * @default 'clamp'
   */
  boundaryBehavior?: ControlFieldBoundaryBehavior;
  /**
   * Resolves expression drafts. Defaults to the built-in arithmetic resolver;
   * pass `null` to disable expressions.
   */
  expressionResolver?: ControlFieldExpressionResolver | null;
  /**
   * Page Up/Page Down step.
   * @default largeStep
   */
  pageStep?: number;
  /**
   * Fraction digits shown when `format` is not provided. Values keep their
   * full precision; only the display is rounded.
   */
  precision?: number;
  /**
   * Drop trailing zeros from the `precision`-derived format.
   * @default true
   */
  trimTrailingZeros?: boolean;
  /**
   * Select the input text when it receives focus.
   * @default false
   */
  selectOnFocus?: boolean;
  /**
   * Commit typed text on blur. When `false`, blur discards the draft.
   * @default true
   */
  commitOnBlur?: boolean;
  /**
   * `vertical` steps with Up/Down and leaves Left/Right for the caret;
   * `both` also steps with Right (up) and Left (down).
   * @default 'vertical'
   */
  arrowKeys?: ControlFieldArrowKeys;
  /** Called when Enter or blur tries to commit text that does not parse. */
  onInvalidCommit?: (
    text: string,
    details: ControlFieldInvalidCommitDetails,
  ) => void;
  /**
   * Fires for every value change, including each parseable keystroke. Put
   * expensive work in `onValueCommitted`.
   */
  onValueChange?: (
    value: number | null,
    details: ControlFieldValueChangeDetails,
  ) => void;
  onValueCommitted?: (
    value: number | null,
    details: ControlFieldValueCommitDetails,
  ) => void;
}

interface ChangeValueOptions {
  expression?: string;
  /** Also fire `onValueCommitted`. @default true */
  commit?: boolean;
  /** Skip both callbacks when the normalized value equals the current one. */
  skipUnchanged?: boolean;
}

interface ControlFieldDraft {
  text: string;
  parsed: boolean;
  value: number | null;
}

interface ControlFieldContextValue {
  arrowKeys: ControlFieldArrowKeys;
  boundaryBehavior: ControlFieldBoundaryBehavior;
  commitOnBlur: boolean;
  displayFormat: Intl.NumberFormatOptions | undefined;
  expressionResolver: ControlFieldExpressionResolver | null;
  largeStep: number;
  locale: Intl.LocalesArgument | undefined;
  max?: number;
  min?: number;
  onInvalidCommit?: ControlFieldRootProps['onInvalidCommit'];
  pageStep: number;
  readOnly: boolean;
  disabled: boolean;
  selectOnFocus: boolean;
  smallStep: number;
  step: number;
  textDirty: boolean;
  textDirtyRef: React.RefObject<boolean>;
  isScrubbing: boolean;
  setScrubbing: (isScrubbing: boolean) => void;
  value: number | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  draftRef: React.RefObject<ControlFieldDraft>;
  blurGateRef: React.RefObject<boolean>;
  revertValueRef: React.RefObject<number | null | undefined>;
  valueRef: React.RefObject<number | null>;
  setTextDirty: (dirty: boolean) => void;
  /** True while Control Field pushes its visible text into Base UI. */
  syncingTextRef: React.RefObject<boolean>;
  /** Registered by the input: drops any expression draft. */
  resetExpressionRef: React.RefObject<(() => void) | null>;
  /** Drops typed and expression drafts after a non-text value change. */
  discardDrafts: () => void;
  roundTypedValue: (value: number) => number;
  changeValue: (
    value: number | null,
    reason: ControlFieldCustomReason,
    event: Event,
    options?: ChangeValueOptions,
  ) => boolean;
  commitValue: (
    value: number | null,
    reason: ControlFieldCustomReason,
    event: Event,
    expression?: string,
  ) => void;
}

const ControlFieldContext =
  React.createContext<ControlFieldContextValue | null>(null);

function useControlFieldContext() {
  const context = React.useContext(ControlFieldContext);
  if (!context) {
    throw new Error(
      'ControlField parts must be placed inside ControlField.Root.',
    );
  }
  return context;
}

/**
 * Internal behavior switches for the deprecated `PrimitiveValueInput`
 * adapter: Enter and Escape blur the input after committing or discarding.
 * @internal
 */
export const ControlFieldLegacyKeysContext = React.createContext(false);

const TEXT_INPUT_REASONS = new Set<string>([
  'input-change',
  'input-clear',
  'input-blur',
  'input-commit',
  'input-paste',
  'expression',
  'none',
]);
const POINTER_REASONS = new Set<string>([
  'scrub',
  'increment-press',
  'decrement-press',
  'wheel',
]);

/**
 * Maps change or commit details to the kind of interaction that produced
 * them: typed text (including expressions), keyboard stepping, or pointer
 * gestures (scrub, stepper buttons, wheel).
 */
export function getControlFieldInteraction(details: {
  reason: string;
}): ControlFieldInteraction {
  if (TEXT_INPUT_REASONS.has(details.reason)) return 'text-input';
  if (POINTER_REASONS.has(details.reason)) return 'pointer';
  return 'keyboard';
}

function normalizeValue(
  value: number | null,
  min: number | undefined,
  max: number | undefined,
  behavior: ControlFieldBoundaryBehavior,
) {
  if (value === null) return null;
  if (!Number.isFinite(value)) return null;
  if (behavior === 'free') return value;

  if (min === undefined || max === undefined || max <= min) {
    if (behavior === 'clamp') {
      return Math.min(max ?? value, Math.max(min ?? value, value));
    }
    return value;
  }

  if (behavior === 'wrap') {
    if (Object.is(value, max) || Math.abs(value - max) <= 1e-12) {
      return max;
    }
    const span = max - min;
    return ((((value - min) % span) + span) % span) + min;
  }

  return Math.min(max, Math.max(min, value));
}

/** Removes binary noise such as `0.1 + 0.2` from stepped values. */
function removeFloatingPointNoise(value: number) {
  if (!Number.isFinite(value)) return value;
  const rounded = parseFloat(value.toPrecision(15));
  const tolerance = Math.min(
    Number.EPSILON * Math.max(1, Math.abs(value)),
    1e-10,
  );
  return Math.abs(rounded - value) <= tolerance ? rounded : value;
}

const ROUNDING_FORMAT_KEYS = [
  'maximumFractionDigits',
  'minimumFractionDigits',
  'maximumSignificantDigits',
  'minimumSignificantDigits',
  'roundingIncrement',
  'roundingMode',
  'roundingPriority',
] as const;

function hasRoundingOptions(format: Intl.NumberFormatOptions | undefined) {
  if (!format) return false;
  const record = format as Record<string, unknown>;
  return ROUNDING_FORMAT_KEYS.some((key) => record[key] != null);
}

/**
 * Base UI rounds stepped values and blur commits to the format's fraction
 * digits. Control Field formats the visible text itself, so Base UI gets the
 * format without rounding options and never alters the numeric value.
 */
function withoutRoundingOptions(
  format: Intl.NumberFormatOptions | undefined,
): Intl.NumberFormatOptions | undefined {
  if (!hasRoundingOptions(format)) return format;
  const next = { ...format } as Record<string, unknown>;
  for (const key of ROUNDING_FORMAT_KEYS) delete next[key];
  return next as Intl.NumberFormatOptions;
}

function roundToFormat(value: number, format: Intl.NumberFormatOptions) {
  const scale = format.style === 'percent' ? 100 : 1;
  const formatter = new Intl.NumberFormat('en-US', {
    ...format,
    style: 'decimal',
    notation: 'standard',
    signDisplay: 'auto',
    useGrouping: false,
  } as Intl.NumberFormatOptions);
  const rounded = Number(formatter.format(value * scale));
  return Number.isFinite(rounded) ? rounded / scale : value;
}

function derivePrecisionFormat(
  precision: number,
  trimTrailingZeros: boolean,
): Intl.NumberFormatOptions {
  const digits = Math.min(20, Math.max(0, Math.round(precision)));
  return {
    minimumFractionDigits: trimTrailingZeros ? 0 : digits,
    maximumFractionDigits: digits,
    useGrouping: false,
  };
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function formatDisplayValue(
  value: number | null,
  locale: Intl.LocalesArgument | undefined,
  format: Intl.NumberFormatOptions | undefined,
) {
  if (value === null || !Number.isFinite(value)) return '';
  const key = JSON.stringify([locale ?? null, format ?? null]);
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, format);
    formatterCache.set(key, formatter);
  }
  const text = formatter.format(value);
  // Avoid showing "-0" when a tiny negative value rounds away.
  return /^-0(?:[.,]0*)?$/.test(text) ? text.slice(1) : text;
}

function isFocusEvent(event: Event | undefined) {
  return event?.type === 'blur' || event?.type === 'focusout';
}

function createCustomChangeDetails(
  reason: ControlFieldCustomReason,
  event: Event,
  expression?: string,
): ControlFieldCustomEventDetails {
  let canceled = false;
  let propagationAllowed = false;

  return {
    reason,
    event,
    expression,
    trigger: event.target instanceof Element ? event.target : undefined,
    cancel() {
      canceled = true;
      this.isCanceled = true;
    },
    allowPropagation() {
      propagationAllowed = true;
      this.isPropagationAllowed = true;
    },
    isCanceled: canceled,
    isPropagationAllowed: propagationAllowed,
  };
}

export const ControlFieldRoot = React.forwardRef<
  HTMLDivElement,
  ControlFieldRootProps
>(function ControlFieldRoot(
  {
    arrowKeys = 'vertical',
    boundaryBehavior = 'clamp',
    commitOnBlur = true,
    defaultValue = null,
    disabled = false,
    expressionResolver = resolveControlFieldExpression,
    format,
    largeStep = 10,
    locale,
    max,
    min,
    onInvalidCommit,
    onValueChange,
    onValueCommitted,
    pageStep,
    precision,
    readOnly = false,
    selectOnFocus = false,
    smallStep = 0.1,
    step = 1,
    trimTrailingZeros = true,
    value: valueProp,
    ...props
  },
  ref,
) {
  const controlled = valueProp !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = React.useState<
    number | null
  >(defaultValue);
  const value = controlled ? valueProp : uncontrolledValue;
  const valueRef = React.useRef(value);
  valueRef.current = value;

  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const draftRef = React.useRef<ControlFieldDraft>({
    text: '',
    parsed: true,
    value: null,
  });
  const blurGateRef = React.useRef(false);
  // The value Escape (and blur with commitOnBlur={false}) restores, and the
  // start value for relative expressions: set on focus and on every commit.
  // `undefined` until the input has been focused.
  const revertValueRef = React.useRef<number | null | undefined>(undefined);
  const textDirtyRef = React.useRef(false);
  const [textDirty, setTextDirtyState] = React.useState(false);
  const [isScrubbing, setScrubbing] = React.useState(false);
  const setTextDirty = React.useCallback((dirty: boolean) => {
    textDirtyRef.current = dirty;
    setTextDirtyState(dirty);
  }, []);
  const syncingTextRef = React.useRef(false);
  const resetExpressionRef = React.useRef<(() => void) | null>(null);
  const discardDrafts = React.useCallback(() => {
    resetExpressionRef.current?.();
    if (textDirtyRef.current) setTextDirty(false);
  }, [setTextDirty]);

  const displayFormat = React.useMemo(
    () =>
      format ??
      (precision === undefined
        ? undefined
        : derivePrecisionFormat(precision, trimTrailingZeros)),
    [format, precision, trimTrailingZeros],
  );
  const baseFormat = React.useMemo(
    () => withoutRoundingOptions(displayFormat),
    [displayFormat],
  );
  const roundTypedValue = React.useCallback(
    (typed: number) =>
      // Only an explicit rounding `format` rounds typed values, as Base UI
      // did before; `precision` only affects the display.
      format && hasRoundingOptions(format)
        ? roundToFormat(typed, format)
        : typed,
    [format],
  );
  const numericStep = step === 'any' ? 1 : step;

  const normalize = React.useCallback(
    (nextValue: number | null) =>
      normalizeValue(nextValue, min, max, boundaryBehavior),
    [boundaryBehavior, max, min],
  );

  // The last value this field published. A controlled value that differs
  // from it came from the parent, and becomes the new revert baseline.
  const lastPublishedRef = React.useRef<number | null | undefined>(undefined);
  const previousValueRef = React.useRef(value);
  React.useLayoutEffect(() => {
    if (Object.is(previousValueRef.current, value)) return;
    previousValueRef.current = value;
    if (
      revertValueRef.current !== undefined &&
      !Object.is(value, lastPublishedRef.current)
    ) {
      revertValueRef.current = value;
    }
  }, [value]);

  const publishValue = React.useCallback(
    (nextValue: number | null, details: ControlFieldValueChangeDetails) => {
      const normalized = normalize(nextValue);
      lastPublishedRef.current = normalized;
      onValueChange?.(normalized, details);

      if (!details.isCanceled && !controlled) {
        setUncontrolledValue(normalized);
      }

      return { normalized, canceled: details.isCanceled };
    },
    [controlled, normalize, onValueChange],
  );

  const commitValue = React.useCallback(
    (
      nextValue: number | null,
      reason: ControlFieldCustomReason,
      event: Event,
      expression?: string,
    ) => {
      const normalized = normalize(nextValue);
      revertValueRef.current = normalized;
      onValueCommitted?.(normalized, { reason, event, expression });
    },
    [normalize, onValueCommitted],
  );

  const changeValue = React.useCallback(
    (
      nextValue: number | null,
      reason: ControlFieldCustomReason,
      event: Event,
      {
        expression,
        commit = true,
        skipUnchanged = false,
      }: ChangeValueOptions = {},
    ) => {
      if (readOnly) return false;

      const cleaned =
        nextValue === null ? null : removeFloatingPointNoise(nextValue);
      const normalized = normalize(cleaned);
      if (skipUnchanged && Object.is(normalized, valueRef.current)) {
        return false;
      }

      const details = createCustomChangeDetails(reason, event, expression);
      const { canceled } = publishValue(cleaned, details);
      if (!canceled && commit) {
        revertValueRef.current = normalized;
        onValueCommitted?.(normalized, { reason, event, expression });
      }
      return !canceled;
    },
    [normalize, onValueCommitted, publishValue, readOnly],
  );

  const context = React.useMemo<ControlFieldContextValue>(
    () => ({
      arrowKeys,
      blurGateRef,
      boundaryBehavior,
      changeValue,
      commitOnBlur,
      commitValue,
      disabled,
      discardDrafts,
      displayFormat,
      draftRef,
      expressionResolver,
      revertValueRef,
      inputRef,
      isScrubbing,
      largeStep: Math.abs(largeStep),
      locale,
      max,
      min,
      onInvalidCommit,
      pageStep: Math.abs(pageStep ?? largeStep),
      readOnly,
      resetExpressionRef,
      roundTypedValue,
      selectOnFocus,
      setScrubbing,
      setTextDirty,
      smallStep: Math.abs(smallStep),
      step: Math.abs(numericStep),
      syncingTextRef,
      textDirty,
      textDirtyRef,
      value,
      valueRef,
    }),
    [
      arrowKeys,
      boundaryBehavior,
      changeValue,
      commitOnBlur,
      commitValue,
      disabled,
      discardDrafts,
      displayFormat,
      expressionResolver,
      isScrubbing,
      largeStep,
      locale,
      max,
      min,
      numericStep,
      onInvalidCommit,
      pageStep,
      readOnly,
      roundTypedValue,
      selectOnFocus,
      setTextDirty,
      smallStep,
      textDirty,
      value,
    ],
  );

  return (
    <ControlFieldContext.Provider value={context}>
      <NumberField.Root
        ref={ref}
        data-slot="control-field"
        data-scrubbing={isScrubbing ? '' : undefined}
        min={boundaryBehavior === 'wrap' ? undefined : min}
        max={boundaryBehavior === 'wrap' ? undefined : max}
        allowOutOfRange={boundaryBehavior === 'free' || undefined}
        disabled={disabled}
        format={baseFormat}
        largeStep={largeStep}
        locale={locale}
        readOnly={readOnly}
        smallStep={smallStep}
        step={step}
        value={value}
        onValueChange={(nextValue, details) => {
          const { reason } = details;
          if (syncingTextRef.current) {
            // Base UI parsing the text Control Field pushed into it.
            details.cancel();
            return;
          }
          if (
            blurGateRef.current &&
            isFocusEvent(details.event) &&
            (reason === 'input-blur' || reason === 'input-clear')
          ) {
            // Control Field commits typed text itself on blur. Base UI's
            // change is swallowed rather than canceled so its Field
            // validation still runs; the value stays controlled.
            return;
          }
          if (
            (reason === 'increment-press' || reason === 'decrement-press') &&
            details.direction === undefined &&
            !textDirtyRef.current &&
            valueRef.current !== null
          ) {
            // Base UI re-parses the (display-rounded) text before a stepper
            // press. With no typed draft, step from the exact value instead.
            details.cancel();
            return;
          }
          if (
            reason === 'input-change' ||
            reason === 'input-clear' ||
            reason === 'input-paste'
          ) {
            draftRef.current = {
              text: draftRef.current.text,
              parsed: true,
              value: normalize(nextValue),
            };
            if (!textDirtyRef.current) setTextDirty(true);
          } else if (details.direction !== undefined) {
            discardDrafts();
          }
          publishValue(nextValue, details);
        }}
        onValueCommitted={(nextValue, details) => {
          if (
            blurGateRef.current &&
            isFocusEvent(details.event) &&
            (details.reason === 'input-blur' ||
              details.reason === 'input-clear')
          ) {
            return;
          }
          const normalized = normalize(nextValue);
          revertValueRef.current = normalized;
          onValueCommitted?.(normalized, details);
        }}
        {...props}
      />
    </ControlFieldContext.Provider>
  );
});

export interface ControlFieldInputProps extends Omit<
  NumberField.Input.Props,
  'render'
> {
  render?: NumberField.Input.Props['render'];
}

function expressionMayStart(key: string, permissive: boolean) {
  if (key.length !== 1) return false;
  if (/[+*/^()]/.test(key)) return true;
  // Custom resolvers may accept units or symbols (`%`, `deg`) and may treat
  // a leading minus as relative, so let any non-numeric character through
  // for them to judge.
  return permissive && !/[\d.,\s]/.test(key);
}

function expressionIsPresent(value: string, permissive: boolean) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^(?:current|value|x)\b/i.test(trimmed)) return true;
  if (/^[+*/]/.test(trimmed)) return true;
  if (permissive && /^[-−]|[^\d\s.,+\-−eE]/.test(trimmed)) return true;
  const withoutScientificExponent = trimmed.replace(/[eE][+-]?\d+/g, '');
  return /[+*/^()]|[+-]/.test(withoutScientificExponent.slice(1));
}

function preventBaseUIHandler(event: PreventableBaseUIEvent) {
  event.preventBaseUIHandler?.();
}

type BaseUIChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => void;

/**
 * Pushes `text` into Base UI's input state. Base UI's keydown, paste,
 * stepper, and blur handlers read that state, so it must match the text
 * Control Field shows. The merged change handler is called directly with a
 * synthetic event object: no DOM event is dispatched, so neither React nor
 * native listeners on ancestors ever observe the reconciliation.
 */
function syncBaseUIText(
  text: string,
  onChange: BaseUIChangeHandler,
  syncingRef: React.RefObject<boolean>,
) {
  const target = { value: text } as HTMLInputElement;
  const nativeEvent = new Event('input');
  const event = {
    nativeEvent,
    currentTarget: target,
    target,
    type: 'change',
    bubbles: false,
    defaultPrevented: false,
    isDefaultPrevented: () => false,
    isPropagationStopped: () => true,
    persist() {},
    preventDefault() {},
    stopPropagation() {},
  } as unknown as React.ChangeEvent<HTMLInputElement>;
  syncingRef.current = true;
  try {
    onChange(event);
  } finally {
    syncingRef.current = false;
  }
}

function assignRef<T>(ref: React.Ref<T> | undefined, node: T | null) {
  if (typeof ref === 'function') {
    ref(node);
  } else if (ref) {
    (ref as React.RefObject<T | null>).current = node;
  }
}

export const ControlFieldInput = React.forwardRef<
  HTMLInputElement,
  ControlFieldInputProps
>(function ControlFieldInput(
  {
    onBlur,
    onChange,
    onFocus,
    onKeyDown,
    onPaste,
    render,
    className,
    ...props
  },
  ref,
) {
  const context = useControlFieldContext();
  const legacyKeys = React.useContext(ControlFieldLegacyKeysContext);
  const [expressionDraft, setExpressionDraftState] = React.useState<
    string | null
  >(null);
  // Handlers read the ref: legacy Enter/Escape blur synchronously, before
  // React re-renders with the new state.
  const expressionDraftRef = React.useRef<string | null>(null);
  const setExpressionDraft = React.useCallback((draft: string | null) => {
    expressionDraftRef.current = draft;
    setExpressionDraftState(draft);
  }, []);
  const [expressionInvalid, setExpressionInvalid] = React.useState(false);
  const [textInvalid, setTextInvalid] = React.useState(false);
  const permissiveExpressions =
    context.expressionResolver !== null &&
    context.expressionResolver !== resolveControlFieldExpression;

  const setInputRef = React.useCallback(
    (node: HTMLInputElement | null) => {
      context.inputRef.current = node;
      assignRef(ref, node);
    },
    [context.inputRef, ref],
  );

  const clearDrafts = React.useCallback(() => {
    setExpressionDraft(null);
    setExpressionInvalid(false);
    setTextInvalid(false);
    context.setTextDirty(false);
  }, [context]);

  // Scrub, stepper, and wheel changes discard a pending expression so a later
  // blur cannot apply it to the new value.
  const { resetExpressionRef } = context;
  React.useLayoutEffect(() => {
    resetExpressionRef.current = () => {
      setExpressionDraft(null);
      setExpressionInvalid(false);
    };
    return () => {
      resetExpressionRef.current = null;
    };
  }, [resetExpressionRef, setExpressionDraft]);

  // Keep Base UI's text equal to the formatted value while the input is
  // focused and no draft is being edited. Base UI only reads its text from
  // keydown, paste, and blur, which need focus; stepper presses without a
  // draft step from the exact value. Syncing only while focused keeps the
  // synthetic input event away from mount, external updates, and unfocused
  // scrubs. Runs after every render; it is a no-op once in sync.
  const baseUITextRef = React.useRef<string | null>(null);
  const baseUIOnChangeRef = React.useRef<BaseUIChangeHandler | null>(null);
  const syncBaseUITextIfFocused = React.useCallback(() => {
    if (expressionDraftRef.current !== null || context.textDirtyRef.current) {
      return;
    }
    const input = context.inputRef.current;
    if (!input || document.activeElement !== input) return;
    const text = formatDisplayValue(
      context.valueRef.current,
      context.locale,
      context.displayFormat,
    );
    const onChange = baseUIOnChangeRef.current;
    if (baseUITextRef.current === text || !onChange) return;
    syncBaseUIText(text, onChange, context.syncingTextRef);
  }, [context]);
  React.useLayoutEffect(() => {
    syncBaseUITextIfFocused();
  });

  /** Restores the value from focus or the last commit. */
  const revertDraft = React.useCallback(
    (reason: ControlFieldCustomReason, event: Event) => {
      const revertValue = context.revertValueRef.current;
      clearDrafts();
      if (revertValue === undefined) return;
      if (revertValue === null && context.valueRef.current === null) return;
      context.changeValue(revertValue, reason, event, {
        commit: false,
        skipUnchanged: true,
      });
    },
    [clearDrafts, context],
  );

  const resolveExpression = React.useCallback(
    (event: Event, reason: ControlFieldInvalidCommitDetails['reason']) => {
      if (expressionDraftRef.current === null || !context.expressionResolver)
        return true;

      const start = context.revertValueRef.current ?? context.value ?? 0;
      const resolved = context.expressionResolver(expressionDraftRef.current, {
        currentValue: context.value ?? 0,
        startValue: start,
        min: context.min,
        max: context.max,
        range:
          context.min !== undefined && context.max !== undefined
            ? [context.min, context.max]
            : undefined,
      });
      if (resolved === null || !Number.isFinite(resolved)) {
        setExpressionInvalid(true);
        context.onInvalidCommit?.(expressionDraftRef.current, {
          reason,
          event,
          expression: true,
        });
        return false;
      }

      const changed = context.changeValue(resolved, 'expression', event, {
        expression: expressionDraftRef.current,
      });
      if (changed) {
        setExpressionDraft(null);
        setExpressionInvalid(false);
        context.setTextDirty(false);
      }
      return changed;
    },
    [context, setExpressionDraft],
  );

  /** Commits typed (non-expression) text. Returns false when invalid. */
  const commitText = React.useCallback(
    (event: Event, reason: ControlFieldInvalidCommitDetails['reason']) => {
      if (!context.textDirtyRef.current) return true;
      const draft = context.draftRef.current;
      if (!draft.parsed) {
        setTextInvalid(true);
        context.onInvalidCommit?.(draft.text, {
          reason,
          event,
          expression: false,
        });
        return false;
      }

      const committed =
        draft.value === null ? null : context.roundTypedValue(draft.value);
      if (!Object.is(committed, context.valueRef.current)) {
        const applied = context.changeValue(committed, reason, event, {
          commit: false,
        });
        if (!applied) {
          // The change was canceled: nothing is committed.
          revertDraft(reason, event);
          return true;
        }
      }
      context.commitValue(committed, reason, event);
      setTextInvalid(false);
      context.setTextDirty(false);
      return true;
    },
    [context, revertDraft],
  );

  const handleStepKey = (
    event: React.KeyboardEvent<HTMLInputElement> & PreventableBaseUIEvent,
  ): boolean => {
    const { key } = event;
    const vertical = key === 'ArrowUp' || key === 'ArrowDown';
    const horizontal =
      context.arrowKeys === 'both' &&
      (key === 'ArrowRight' || key === 'ArrowLeft');
    const page = key === 'PageUp' || key === 'PageDown';
    const boundary =
      (key === 'Home' && context.min !== undefined) ||
      (key === 'End' && context.max !== undefined);
    if (!vertical && !horizontal && !page && !boundary) return false;

    event.preventDefault();
    preventBaseUIHandler(event);

    const draft = context.draftRef.current;
    const base =
      context.textDirtyRef.current && draft.parsed && draft.value !== null
        ? draft.value
        : context.value;
    let nextValue: number;
    let reason: ControlFieldCustomReason;
    if (boundary) {
      nextValue = (key === 'Home' ? context.min : context.max) as number;
      reason = 'boundary-key';
    } else if (page) {
      nextValue = (base ?? 0) + (key === 'PageUp' ? 1 : -1) * context.pageStep;
      reason = 'page-step';
    } else {
      const amount = event.altKey
        ? context.smallStep
        : event.shiftKey
          ? context.largeStep
          : context.step;
      const direction = key === 'ArrowUp' || key === 'ArrowRight' ? 1 : -1;
      nextValue = base === null ? 0 : base + direction * amount;
      reason = 'keyboard';
    }

    context.changeValue(nextValue, reason, event.nativeEvent, {
      skipUnchanged: true,
    });
    setTextInvalid(false);
    context.setTextDirty(false);
    return true;
  };

  return (
    <NumberField.Input
      ref={setInputRef}
      {...props}
      data-slot="control-field-input"
      aria-invalid={
        expressionInvalid || textInvalid || props['aria-invalid'] || undefined
      }
      className={(state) =>
        cn(
          'h-full min-w-0 flex-1 cursor-default bg-transparent py-0 pl-1 pr-0 font-sans text-[11px] leading-4 tabular-nums text-[color:var(--ck-foreground,#fff)] outline-none placeholder:text-[color:var(--ck-foreground,#fff)]/35 focus:cursor-text disabled:cursor-not-allowed disabled:opacity-45',
          typeof className === 'function' ? className(state) : className,
        )
      }
      data-expression={expressionDraft === null ? undefined : ''}
      data-expression-invalid={expressionInvalid ? '' : undefined}
      onFocus={(event) => {
        onFocus?.(event);
        if (event.defaultPrevented) return;

        syncBaseUITextIfFocused();

        context.blurGateRef.current = false;
        context.revertValueRef.current = context.value;
        context.draftRef.current = {
          text: event.currentTarget.value,
          parsed: true,
          value: context.value,
        };
        if (context.selectOnFocus) {
          const input = event.currentTarget;
          const selectAll = () => {
            if (document.activeElement === input) input.select();
          };
          // The microtask runs after Base UI's focus handler, which moves the
          // caret to the end on first focus; the frame covers pointer focus.
          queueMicrotask(selectAll);
          requestAnimationFrame(selectAll);
        }
      }}
      onBlur={(event) => {
        onBlur?.(event);
        if (event.defaultPrevented) return;

        // Base UI's blur handler still runs (touched/focused state) but its
        // value commit is gated; Control Field commits the draft here.
        context.blurGateRef.current = true;
        const nativeEvent = event.nativeEvent;
        if (context.readOnly) return;

        if (!context.commitOnBlur) {
          if (
            expressionDraftRef.current !== null ||
            context.textDirtyRef.current
          ) {
            revertDraft('input-blur', nativeEvent);
          }
          return;
        }

        if (expressionDraftRef.current !== null) {
          if (!resolveExpression(nativeEvent, 'input-blur')) {
            revertDraft('input-blur', nativeEvent);
          }
          return;
        }

        if (!commitText(nativeEvent, 'input-blur')) {
          revertDraft('input-blur', nativeEvent);
        }
      }}
      onChange={(event) => {
        // Control Field's own sync: only Base UI's handler should see it.
        if (context.syncingTextRef.current) return;
        onChange?.(event);
        if (event.defaultPrevented) return;

        const nextDraft = event.currentTarget.value;
        setTextInvalid(false);
        if (
          context.expressionResolver &&
          (expressionDraftRef.current !== null ||
            expressionIsPresent(nextDraft, permissiveExpressions))
        ) {
          preventBaseUIHandler(event);
          setExpressionDraft(nextDraft);
          setExpressionInvalid(false);
          return;
        }

        // Base UI parses the text next; its change callback marks the draft
        // parsed. Text it rejects stays unparsed and fails on commit.
        context.draftRef.current = {
          text: nextDraft,
          parsed: false,
          value: context.draftRef.current.value,
        };
        context.setTextDirty(true);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;

        if (expressionDraftRef.current !== null) {
          if (event.key === 'Enter') {
            event.preventDefault();
            preventBaseUIHandler(event);
            const resolved = resolveExpression(
              event.nativeEvent,
              'input-commit',
            );
            if (legacyKeys) {
              // The legacy primitive committed on Enter, then blurred.
              if (!resolved) revertDraft('input-commit', event.nativeEvent);
              event.currentTarget.blur();
            }
            return;
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            preventBaseUIHandler(event);
            revertDraft('keyboard', event.nativeEvent);
            if (legacyKeys) event.currentTarget.blur();
            return;
          }
          if (event.key !== 'Tab') preventBaseUIHandler(event);
          return;
        }

        if (
          context.expressionResolver &&
          expressionMayStart(event.key, permissiveExpressions) &&
          !event.ctrlKey &&
          !event.metaKey
        ) {
          preventBaseUIHandler(event);
          return;
        }

        if (event.key === 'Enter') {
          if (legacyKeys) {
            // The legacy primitive committed on Enter (regardless of
            // commitOnBlur), reverted invalid drafts, then blurred.
            event.preventDefault();
            if (!commitText(event.nativeEvent, 'input-commit')) {
              revertDraft('input-commit', event.nativeEvent);
            }
            event.currentTarget.blur();
            return;
          }
          if (context.textDirtyRef.current) {
            event.preventDefault();
            commitText(event.nativeEvent, 'input-commit');
          }
          return;
        }

        if (event.key === 'Escape') {
          if (context.textDirtyRef.current || textInvalid) {
            event.preventDefault();
            revertDraft('keyboard', event.nativeEvent);
          }
          if (legacyKeys) {
            event.preventDefault();
            event.currentTarget.blur();
          }
          return;
        }

        if (context.readOnly || context.disabled) return;
        // Ctrl/Meta + Home/End/arrows navigate or select text.
        if (event.ctrlKey || event.metaKey) return;

        handleStepKey(event);
      }}
      onPaste={(event) => {
        onPaste?.(event);
        if (event.defaultPrevented) return;

        const input = event.currentTarget;
        const pasted = event.clipboardData.getData('text/plain');
        const currentText = expressionDraftRef.current ?? input.value;
        const start = input.selectionStart ?? currentText.length;
        const end = input.selectionEnd ?? start;
        const nextDraft =
          currentText.slice(0, start) + pasted + currentText.slice(end);

        if (
          context.expressionResolver &&
          (expressionDraftRef.current !== null ||
            expressionIsPresent(nextDraft, permissiveExpressions))
        ) {
          event.preventDefault();
          preventBaseUIHandler(event);
          setExpressionDraft(nextDraft);
          setExpressionInvalid(false);
          return;
        }

        context.draftRef.current = {
          text: nextDraft,
          parsed: false,
          value: context.draftRef.current.value,
        };
        context.setTextDirty(true);
      }}
      render={(baseProps, state) => {
        baseUITextRef.current =
          typeof baseProps.value === 'string' ? baseProps.value : null;
        baseUIOnChangeRef.current =
          (baseProps.onChange as BaseUIChangeHandler | undefined) ?? null;
        // While the user edits text, Base UI's text is authoritative. At rest
        // Control Field formats the value itself so stepping, scrubbing, and
        // controlled values are never rounded by the display format.
        const displayValue =
          expressionDraft ??
          (context.textDirty
            ? baseProps.value
            : formatDisplayValue(
                context.value,
                context.locale,
                context.displayFormat,
              ));
        const renderedProps = {
          ...baseProps,
          value: displayValue,
        };

        if (typeof render === 'function') return render(renderedProps, state);
        if (React.isValidElement(render)) {
          return React.cloneElement(render, renderedProps);
        }
        return <input {...renderedProps} />;
      }}
    />
  );
});

export const ControlFieldGroup = React.forwardRef<
  HTMLDivElement,
  NumberField.Group.Props
>(function ControlFieldGroup(props, ref) {
  const { className, ...groupProps } = props;
  const context = useControlFieldContext();
  return (
    <NumberField.Group
      ref={ref}
      {...groupProps}
      data-slot="control-field-group"
      data-scrubbing={context.isScrubbing ? '' : undefined}
      className={(state) =>
        cn(
          'relative box-border flex h-6 min-h-6 w-full min-w-0 items-center rounded-[4px] border border-transparent bg-[var(--ck-surface,#383838)] p-0 font-sans text-[11px] leading-4 text-[color:var(--ck-foreground,#fff)] transition-colors [&:hover:not(:focus-within)]:border-[color:var(--ck-border,#4c4c4c)] focus-within:border-[color:var(--ck-border-focus,#5288db)] data-[invalid]:border-[color:var(--ck-border-invalid,#ff4e4e)] data-[scrubbing]:border-[color:var(--ck-border-scrub,#97c1ef)] data-[disabled]:opacity-45',
          typeof className === 'function' ? className(state) : className,
        )
      }
    />
  );
});

export interface ControlFieldScrubAreaState {
  scrubbing: boolean;
  disabled: boolean;
  readOnly: boolean;
}

export interface ControlFieldScrubAreaProps extends Omit<
  React.HTMLAttributes<HTMLSpanElement>,
  'className'
> {
  className?:
    | string
    | ((state: ControlFieldScrubAreaState) => string | undefined);
  /**
   * Horizontal pixels per `step` of movement.
   * @default 1
   */
  pixelsPerStep?: number;
  /**
   * Move in whole steps: each `stepDistance` pixels adds one step. Overrides
   * `pixelsPerStep` when set.
   */
  stepDistance?: number;
  /**
   * Pixels the pointer must travel before scrubbing starts.
   * @default 1
   */
  threshold?: number;
  /**
   * Minimum value change between `onValueChange` calls while dragging. The
   * final value is always published on release.
   * @default 0
   */
  commitThreshold?: number;
  /** Maximum `onValueChange` calls per second while dragging. */
  maxCommitRate?: number;
  /**
   * Lock the pointer while scrubbing so drags are not limited by the screen
   * edge. Falls back to ordinary pointer tracking when unavailable.
   * @default false
   */
  pointerLock?: boolean;
  onScrubbingChange?: (isScrubbing: boolean) => void;
}

/**
 * Horizontal drag target that scrubs the field value. Shift scrubs by
 * `largeStep`, Alt by `smallStep`; changing modifiers mid-drag keeps the
 * movement already made. `onValueCommitted` fires once on release.
 */
export const ControlFieldScrubArea = React.forwardRef<
  HTMLSpanElement,
  ControlFieldScrubAreaProps
>(function ControlFieldScrubArea(
  {
    className,
    commitThreshold,
    maxCommitRate,
    onPointerDown,
    onLostPointerCapture,
    onScrubbingChange,
    pixelsPerStep = 1,
    pointerLock = false,
    stepDistance,
    threshold = 1,
    ...props
  },
  ref,
) {
  const context = useControlFieldContext();
  const { changeValue, commitValue, discardDrafts, setScrubbing } = context;
  const normalize = React.useCallback(
    (nextValue: number) =>
      normalizeValue(
        nextValue,
        context.min,
        context.max,
        context.boundaryBehavior,
      ) ?? nextValue,
    [context.boundaryBehavior, context.max, context.min],
  );
  const handleScrubValue = React.useCallback(
    (nextValue: number, event: Event | undefined) => {
      const applied = changeValue(
        nextValue,
        'scrub',
        event ?? new Event('pointermove'),
        { commit: false },
      );
      if (applied) discardDrafts();
      // A canceled change is rejected: the engine keeps the last accepted
      // value for later thresholds and the release commit.
      return applied;
    },
    [changeValue, discardDrafts],
  );
  const handleScrubEnd = React.useCallback(
    ({ value, startValue, moved, rejected, event }: ScrubEndDetails) => {
      if (!moved) return;
      // Every update was rejected: there is nothing to commit.
      if (rejected && Object.is(value, startValue)) return;
      commitValue(value, 'scrub', event ?? new Event('pointerup'));
    },
    [commitValue],
  );
  const handleScrubbingChange = React.useCallback(
    (isScrubbing: boolean) => {
      setScrubbing(isScrubbing);
      onScrubbingChange?.(isScrubbing);
    },
    [onScrubbingChange, setScrubbing],
  );
  const scrub = useScrubGesture<HTMLSpanElement>({
    value: context.value ?? 0,
    onValueChange: handleScrubValue,
    onScrubEnd: handleScrubEnd,
    onScrubbingChange: handleScrubbingChange,
    normalize,
    rebaseAtBoundary: context.boundaryBehavior === 'clamp',
    step: context.step,
    smallStep: context.smallStep,
    largeStep: context.largeStep,
    pixelsPerStep,
    stepDistance,
    threshold,
    commitThreshold,
    maxCommitRate,
    pointerLock,
    enabled: !context.disabled && !context.readOnly,
    inputRef: context.inputRef,
  });

  const { restoreSelection } = scrub;
  React.useLayoutEffect(() => {
    restoreSelection();
  }, [context.value, restoreSelection]);

  const setRef = React.useCallback(
    (node: HTMLSpanElement | null) => {
      scrub.handleRef.current = node;
      assignRef(ref, node);
    },
    [ref, scrub.handleRef],
  );

  const state: ControlFieldScrubAreaState = {
    scrubbing: scrub.isScrubbing,
    disabled: context.disabled,
    readOnly: context.readOnly,
  };

  return (
    <span
      role="presentation"
      {...props}
      ref={setRef}
      data-slot="control-field-scrub-area"
      data-scrubbing={scrub.isScrubbing ? '' : undefined}
      data-disabled={context.disabled ? '' : undefined}
      data-readonly={context.readOnly ? '' : undefined}
      className={cn(
        'flex h-full w-6 shrink-0 cursor-ew-resize touch-none select-none items-center justify-center font-medium tabular-nums text-[color:var(--ck-foreground,#fff)]/55 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45',
        typeof className === 'function' ? className(state) : className,
      )}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (event.defaultPrevented) return;
        // A Field-level `disabled` reaches the input but not this context.
        if (context.inputRef.current?.disabled) return;
        scrub.handleProps.onPointerDown(event);
      }}
      onLostPointerCapture={(event) => {
        onLostPointerCapture?.(event);
        scrub.handleProps.onLostPointerCapture(event);
      }}
    />
  );
});

export interface ControlFieldScrubAreaCursorProps extends Omit<
  React.HTMLAttributes<HTMLSpanElement>,
  'className'
> {
  className?: string | ((state: ControlFieldScrubAreaState) => string);
}

/**
 * @deprecated The scrub area no longer renders a virtual cursor. This part
 * renders nothing and will be removed in a future release.
 */
export const ControlFieldScrubAreaCursor = React.forwardRef<
  HTMLSpanElement,
  ControlFieldScrubAreaCursorProps
>(function ControlFieldScrubAreaCursor() {
  return null;
});

export interface ControlFieldAffixProps extends React.HTMLAttributes<HTMLSpanElement> {}

export const ControlFieldAffix = React.forwardRef<
  HTMLSpanElement,
  ControlFieldAffixProps
>(function ControlFieldAffix({ className, ...props }, ref) {
  return (
    <span
      ref={ref}
      {...props}
      data-slot="control-field-affix"
      className={cn(
        'flex h-full w-5 shrink-0 select-none items-center justify-center text-[11px] font-medium leading-4 text-[color:var(--ck-foreground,#fff)]/50',
        className,
      )}
    />
  );
});

const CONTROL_FIELD_BUTTON_CLASS =
  'flex size-6 shrink-0 select-none items-center justify-center text-xs text-[color:var(--ck-foreground,#fff)]/55 outline-none hover:bg-[color:var(--ck-foreground,#fff)]/6 hover:text-[color:var(--ck-foreground,#fff)] focus-visible:bg-[color:var(--ck-foreground,#fff)]/8 disabled:pointer-events-none disabled:opacity-35';

export const ControlFieldIncrement = React.forwardRef<
  HTMLButtonElement,
  NumberField.Increment.Props
>(function ControlFieldIncrement({ children = '+', className, ...props }, ref) {
  return (
    <NumberField.Increment
      ref={ref}
      {...props}
      data-slot="control-field-increment"
      className={(state) =>
        cn(
          CONTROL_FIELD_BUTTON_CLASS,
          typeof className === 'function' ? className(state) : className,
        )
      }
    >
      {children}
    </NumberField.Increment>
  );
});

export const ControlFieldDecrement = React.forwardRef<
  HTMLButtonElement,
  NumberField.Decrement.Props
>(function ControlFieldDecrement({ children = '−', className, ...props }, ref) {
  return (
    <NumberField.Decrement
      ref={ref}
      {...props}
      data-slot="control-field-decrement"
      className={(state) =>
        cn(
          CONTROL_FIELD_BUTTON_CLASS,
          typeof className === 'function' ? className(state) : className,
        )
      }
    >
      {children}
    </NumberField.Decrement>
  );
});

export const ControlFieldLabel = React.forwardRef<
  HTMLLabelElement,
  Field.Label.Props
>(function ControlFieldLabel({ className, ...props }, ref) {
  return (
    <Field.Label
      ref={ref}
      {...props}
      data-slot="control-field-label"
      className={(state) =>
        cn(
          'select-none',
          typeof className === 'function' ? className(state) : className,
        )
      }
    />
  );
});

export const ControlFieldDescription = React.forwardRef<
  HTMLParagraphElement,
  Field.Description.Props
>(function ControlFieldDescription({ className, ...props }, ref) {
  return (
    <Field.Description
      ref={ref}
      {...props}
      data-slot="control-field-description"
      className={(state) =>
        cn(
          'text-[11px] text-[color:var(--ck-foreground,#fff)]/45',
          typeof className === 'function' ? className(state) : className,
        )
      }
    />
  );
});

export const ControlFieldError = React.forwardRef<
  HTMLDivElement,
  Field.Error.Props
>(function ControlFieldError({ className, ...props }, ref) {
  return (
    <Field.Error
      ref={ref}
      {...props}
      data-slot="control-field-error"
      className={(state) =>
        cn(
          'text-[11px] text-red-400',
          typeof className === 'function' ? className(state) : className,
        )
      }
    />
  );
});

export const ControlField = {
  Root: ControlFieldRoot,
  Label: ControlFieldLabel,
  Description: ControlFieldDescription,
  Error: ControlFieldError,
  ScrubArea: ControlFieldScrubArea,
  ScrubAreaCursor: ControlFieldScrubAreaCursor,
  Group: ControlFieldGroup,
  Input: ControlFieldInput,
  Affix: ControlFieldAffix,
  Increment: ControlFieldIncrement,
  Decrement: ControlFieldDecrement,
};
