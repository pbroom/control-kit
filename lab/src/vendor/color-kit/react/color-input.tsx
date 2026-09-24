import {
  forwardRef,
  useCallback,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
} from 'react';
import { useSelector } from '@legendapp/state/react';
import type { Color } from '@color-kit/core';
import {
  ControlField,
  getControlFieldInteraction,
  type ControlFieldExpressionResolver,
  type ControlFieldInteraction,
} from 'control-kit';
import { useOptionalColorContext } from './context.js';
import {
  colorFromColorInputChannelValue,
  formatColorInputChannelValue,
  getColorInputChangedChannel,
  getColorInputChannelValue,
  getColorInputChannelGlyph,
  getColorInputLabel,
  getColorInputPrecisionFromStep,
  parseColorInputExpression,
  resolveColorInputRange,
  resolveColorInputSteps,
  resolveColorInputWrap,
  type HslColorInputChannel,
  type OklchColorInputChannel,
  type RgbColorInputChannel,
} from './api/color-input.js';
import type { SetRequestedOptions } from './use-color.js';

interface ColorInputBaseProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange'
> {
  /** Standalone requested color value (alternative to Color) */
  requested?: Color;
  /** Standalone change handler (alternative to Color) */
  onChangeRequested?: (requested: Color, options?: SetRequestedOptions) => void;
  /** Optional channel range override */
  range?: [number, number];
  /** Wrap values across range boundaries (defaults true for hue channels) */
  wrap?: boolean;
  /** Arrow step value */
  step?: number;
  /** Option/Alt modifier step value */
  fineStep?: number;
  /** Shift modifier step value */
  coarseStep?: number;
  /** PageUp/PageDown step value */
  pageStep?: number;
  /** Enable expression parsing for text commits */
  allowExpressions?: boolean;
  /** Select input text on focus */
  selectAllOnFocus?: boolean;
  /** Commit draft value on blur */
  commitOnBlur?: boolean;
  /** Size (px) of the square leading scrub/drag hit area */
  scrubHandleSize?: number;
  /** Horizontal pixels per step during scrub drag */
  scrubPixelsPerStep?: number;
  /** Minimum channel delta before committing another scrub update */
  dragEpsilon?: number;
  /** Maximum scrub update rate while dragging */
  maxScrubRate?: number;
  /** Number precision for formatted channel values */
  precision?: number;
  /** Called when Enter/blur commit receives an invalid draft value */
  onInvalidCommit?: (draft: string) => void;
}

export type ColorInputProps =
  | ({
      model: 'oklch';
      channel: OklchColorInputChannel;
    } & ColorInputBaseProps)
  | ({
      model: 'rgb';
      channel: RgbColorInputChannel;
    } & ColorInputBaseProps)
  | ({
      model: 'hsl';
      channel: HslColorInputChannel;
    } & ColorInputBaseProps);

const SCRUB_DRAG_START_THRESHOLD_PX = 2;

// Per-keystroke and blur-time changes stay inside the field; typed text is
// applied once, from the Enter/blur commit.
const TYPING_REASONS = new Set<string>([
  'input-change',
  'input-clear',
  'input-paste',
  'input-blur',
  'input-commit',
  'none',
]);

/**
 * A headless value input that edits one channel in oklch/rgb/hsl.
 *
 * Built on control-kit `ControlField` parts. Supports text entry, color-kit
 * expressions (`%` of range, `deg`, relative `+ - * /`), keyboard stepping,
 * and left-edge scrub dragging.
 */
export const ColorInput = forwardRef<HTMLDivElement, ColorInputProps>(
  function ColorInput(
    {
      model,
      channel,
      requested: requestedProp,
      onChangeRequested: onChangeRequestedProp,
      range,
      wrap,
      step,
      fineStep,
      coarseStep,
      pageStep,
      allowExpressions = true,
      selectAllOnFocus = true,
      commitOnBlur = true,
      scrubHandleSize = 24,
      scrubPixelsPerStep = 6,
      dragEpsilon = 0.0005,
      maxScrubRate = 120,
      precision,
      onInvalidCommit,
      // A text `defaultValue` has no meaning for a numeric channel input.
      defaultValue: _defaultValue,
      ...props
    },
    ref,
  ) {
    const context = useOptionalColorContext();
    const contextRequested = useSelector(
      () => context?.state$.requested.get() ?? null,
    );

    const requested = requestedProp ?? contextRequested;
    const setRequested = onChangeRequestedProp ?? context?.setRequested;

    if (!requested || !setRequested) {
      throw new Error(
        'ColorInput requires either a <Color> ancestor or explicit requested/onChangeRequested props.',
      );
    }

    const resolvedRange = useMemo(
      () => resolveColorInputRange(model, channel, range),
      [channel, model, range],
    );
    const resolvedWrap = useMemo(
      () => resolveColorInputWrap(model, channel, wrap),
      [channel, model, wrap],
    );
    const resolvedSteps = useMemo(
      () =>
        resolveColorInputSteps(model, channel, {
          step,
          fineStep,
          coarseStep,
          pageStep,
        }),
      [channel, coarseStep, fineStep, model, pageStep, step],
    );
    const resolvedPrecision = useMemo(
      () => precision ?? getColorInputPrecisionFromStep(resolvedSteps.fineStep),
      [precision, resolvedSteps.fineStep],
    );
    const channelValue = useMemo(
      () => getColorInputChannelValue(requested, model, channel),
      [channel, model, requested],
    );
    const channelLabel = useMemo(
      () => getColorInputLabel(model, channel),
      [channel, model],
    );
    const channelGlyph = useMemo(
      () => getColorInputChannelGlyph(model, channel),
      [channel, model],
    );
    const changedChannel = useMemo(
      () => getColorInputChangedChannel(model, channel),
      [channel, model],
    );

    // color-kit grammar: `%` of range, `deg`, and relative leading operators
    // (including `-`), evaluated from the value the field had on focus.
    const expressionResolver = useCallback<ControlFieldExpressionResolver>(
      (text, resolverContext) =>
        parseColorInputExpression(text, {
          currentValue:
            resolverContext.startValue ?? resolverContext.currentValue,
          range: resolvedRange,
          allowExpressions,
        }),
      [allowExpressions, resolvedRange],
    );

    const applyChannelValue = useCallback(
      (nextValue: number, interaction: ControlFieldInteraction) => {
        const nextColor = colorFromColorInputChannelValue(
          requested,
          model,
          channel,
          nextValue,
        );
        setRequested(nextColor, {
          interaction,
          ...(changedChannel ? { changedChannel } : {}),
        });
      },
      [changedChannel, channel, model, requested, setRequested],
    );

    const typedRef = useRef(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [isDraftValid, setIsDraftValid] = useState(true);

    return (
      <ControlField.Root
        {...props}
        ref={ref}
        value={channelValue}
        min={resolvedRange[0]}
        max={resolvedRange[1]}
        boundaryBehavior={resolvedWrap ? 'wrap' : 'clamp'}
        step={resolvedSteps.step}
        smallStep={resolvedSteps.fineStep}
        largeStep={resolvedSteps.coarseStep}
        pageStep={resolvedSteps.pageStep}
        precision={resolvedPrecision}
        expressionResolver={expressionResolver}
        selectOnFocus={selectAllOnFocus}
        commitOnBlur={commitOnBlur}
        arrowKeys="both"
        onValueChange={(nextValue, details) => {
          if (nextValue === null || TYPING_REASONS.has(details.reason)) return;
          typedRef.current = false;
          setIsDraftValid(true);
          applyChannelValue(nextValue, getControlFieldInteraction(details));
        }}
        onValueCommitted={(nextValue) => {
          if (!typedRef.current || nextValue === null) return;
          typedRef.current = false;
          setIsDraftValid(true);
          applyChannelValue(nextValue, 'text-input');
        }}
        onInvalidCommit={(text, details) => {
          // Enter keeps the invalid draft editable; blur restores the value.
          setIsDraftValid(details.reason === 'input-blur');
          onInvalidCommit?.(text);
        }}
        data-color-input=""
        data-model={model}
        data-channel={channel}
        data-valid={isDraftValid || undefined}
        data-editing={isEditing || undefined}
        data-scrubbing={isScrubbing || undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          columnGap: 0,
          boxSizing: 'border-box',
          touchAction: 'manipulation',
          ...props.style,
        }}
      >
        <ControlField.ScrubArea
          data-color-input-scrub-handle=""
          aria-hidden="true"
          pixelsPerStep={scrubPixelsPerStep}
          threshold={SCRUB_DRAG_START_THRESHOLD_PX}
          commitThreshold={dragEpsilon}
          maxCommitRate={maxScrubRate}
          pointerLock
          onScrubbingChange={setIsScrubbing}
          style={{
            width: `${Math.max(0, scrubHandleSize)}px`,
            height: `${Math.max(0, scrubHandleSize)}px`,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'ew-resize',
            touchAction: 'none',
            userSelect: 'none',
          }}
        >
          {channelGlyph}
        </ControlField.ScrubArea>
        <ControlField.Input
          aria-label={props['aria-label'] ?? `${channelLabel} value`}
          aria-valuetext={`${formatColorInputChannelValue(
            channelValue,
            resolvedPrecision,
          )} ${channelLabel}`}
          inputMode="decimal"
          style={{ flex: 1, minWidth: 0 }}
          onChange={() => {
            typedRef.current = true;
            setIsDraftValid(true);
          }}
          onKeyDown={(event) => {
            // Escape restores the committed (valid) value.
            if (event.key === 'Escape') setIsDraftValid(true);
          }}
          onFocus={() => setIsEditing(true)}
          onBlur={() => setIsEditing(false)}
        />
      </ControlField.Root>
    );
  },
);
