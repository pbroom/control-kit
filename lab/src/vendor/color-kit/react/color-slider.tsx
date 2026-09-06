import {
  useRef,
  useEffect,
  useMemo,
  forwardRef,
  type HTMLAttributes,
} from 'react';
import { useSelector } from '@legendapp/state/react';
import { ColorValueSlider, type SliderProps } from 'control-kit';
import type { Color } from '@color-kit/core';
import { useOptionalColorContext } from './context.js';
import {
  colorFromColorSliderKey,
  colorFromColorSliderPosition,
  getColorSliderLabel,
  getColorSliderThumbPosition,
  resolveColorSliderRange,
  type ColorSliderChannel,
  type ColorSliderOrientation,
} from './api/color-slider.js';
import type { SetRequestedOptions } from './use-color.js';
import {
  ColorSliderContext,
  type ColorSliderContextValue,
} from './color-slider-context.js';

export interface ColorSliderProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue'
> {
  /**
   * Which color channel the slider controls.
   */
  channel: ColorSliderChannel;
  /**
   * Value range for the channel.
   * Defaults: l=[0,1], c=[0,0.4], h=[0,360], alpha=[0,1]
   */
  range?: [number, number];
  /**
   * Slider orientation.
   * @default 'horizontal'
   */
  orientation?: ColorSliderOrientation;
  /** Standalone requested color value (alternative to Color) */
  requested?: Color;
  /** Standalone change handler (alternative to Color) */
  onChangeRequested?: (requested: Color, options?: SetRequestedOptions) => void;
  /**
   * Minimum normalized movement before committing another pointer update.
   * @default 0.0005
   */
  dragEpsilon?: number;
  /**
   * Maximum pointer update rate during drag interactions.
   * @default 60
   */
  maxPointerRate?: number;
}

/** Color Kit channel state and markers, composed over Control Kit's Base UI slider. */
export const ColorSlider = forwardRef<HTMLDivElement, ColorSliderProps>(
  function ColorSlider(
    {
      channel,
      range,
      orientation = 'horizontal',
      requested: requestedProp,
      onChangeRequested: onChangeRequestedProp,
      dragEpsilon = 0.0005,
      maxPointerRate = 60,
      children,
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
    const frameRef = useRef<number | null>(null);
    const pendingRef = useRef<number | null>(null);
    const lastCommitRef = useRef(0);
    const commitRef = useRef<(value: number) => void>(() => {});

    useEffect(
      () => () => {
        if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      },
      [],
    );

    if (!requested || !setRequested) {
      throw new Error(
        'ColorSlider requires either a <Color> ancestor or explicit requested/onChangeRequested props.',
      );
    }

    const r = resolveColorSliderRange(channel, range);
    const norm = getColorSliderThumbPosition(requested, channel, r);
    const span = r[1] - r[0];
    const contextValue = useMemo<ColorSliderContextValue>(
      () => ({ channel, orientation, range: r, requested, thumbNorm: norm }),
      [channel, orientation, requested, r, norm],
    );

    // Throttle color computation only; Base UI owns pointer capture and coordinates.
    commitRef.current = (value) => {
      const nextNorm = (value - r[0]) / span;
      if (Math.abs(nextNorm - norm) < dragEpsilon) return;
      setRequested(
        colorFromColorSliderPosition(requested, channel, nextNorm, r),
        {
          changedChannel: channel,
          interaction: 'pointer',
        },
      );
    };
    const flush = (time: number) => {
      if (time - lastCommitRef.current < 1000 / Math.max(1, maxPointerRate)) {
        frameRef.current = requestAnimationFrame(flush);
        return;
      }
      frameRef.current = null;
      const value = pendingRef.current;
      pendingRef.current = null;
      if (value !== null) commitRef.current(value);
      lastCommitRef.current = time;
    };
    const onValueChange: SliderProps['onValueChange'] = (value, details) => {
      if (details.reason === 'drag') {
        pendingRef.current = value;
        if (frameRef.current === null)
          frameRef.current = requestAnimationFrame(flush);
      } else {
        setRequested(
          colorFromColorSliderPosition(
            requested,
            channel,
            (value - r[0]) / span,
            r,
          ),
          {
            changedChannel: channel,
            interaction:
              details.reason === 'keyboard' || details.reason === 'input-change'
                ? 'keyboard'
                : 'pointer',
          },
        );
      }
    };
    const inset = 'var(--ck-slider-position-inset, 0px)';
    return (
      <ColorSliderContext.Provider value={contextValue}>
        <ColorValueSlider
          {...props}
          ref={ref}
          unstyled
          data-color-slider=""
          data-channel={channel}
          orientation={orientation}
          aria-label={
            props['aria-label'] ?? `${getColorSliderLabel(channel)} slider`
          }
          min={r[0]}
          max={r[1]}
          step={span / 10000}
          largeStep={span / 10}
          value={requested[channel]}
          onValueChange={onValueChange}
          onValueCommitted={(value, details) => {
            if (frameRef.current !== null)
              cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
            pendingRef.current = null;
            if (details.reason === 'drag' || details.reason === 'track-press') {
              setRequested(
                colorFromColorSliderPosition(
                  requested,
                  channel,
                  (value - r[0]) / span,
                  r,
                ),
                {
                  changedChannel: channel,
                  interaction: 'pointer',
                },
              );
            }
          }}
          controlProps={{
            style:
              orientation === 'horizontal'
                ? { left: inset, right: inset }
                : { top: inset, bottom: inset },
          }}
          thumbProps={{
            'data-value': norm.toFixed(4),
            onKeyDown: (event) => {
              const next = colorFromColorSliderKey(
                requested,
                channel,
                event.key,
                event.shiftKey ? 0.1 : 0.01,
                r,
              );
              if (!next) return;
              event.preventDefault();
              setRequested(next, {
                changedChannel: channel,
                interaction: 'keyboard',
              });
            },
          }}
        >
          {children}
        </ColorValueSlider>
      </ColorSliderContext.Provider>
    );
  },
);
