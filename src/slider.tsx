import * as React from 'react';
import { Slider as SliderPrimitive } from '@base-ui/react/slider';
import { cn } from './utils.js';

type StyledSlot<Props> = Omit<Props, 'className' | 'style'> & {
  className?: string;
  style?: React.CSSProperties;
  [attribute: `data-${string}`]: string | number | boolean | undefined;
};

export type SliderProps = Omit<
  SliderPrimitive.Root.Props<number>,
  'className' | 'render'
> & {
  className?: string;
  /** Keep Base UI interaction and positioning, with consumer-owned visuals. */
  unstyled?: boolean;
  showIndicator?: boolean;
  controlProps?: StyledSlot<SliderPrimitive.Control.Props>;
  trackProps?: StyledSlot<SliderPrimitive.Track.Props>;
  thumbProps?: StyledSlot<SliderPrimitive.Thumb.Props>;
};

/** A single-value Base UI slider. Styling slots also support color rails. */
export const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  function Slider(
    {
      className,
      unstyled = false,
      showIndicator = true,
      orientation = 'horizontal',
      controlProps,
      trackProps,
      thumbProps,
      children,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      'aria-valuetext': ariaValueText,
      ...props
    },
    ref,
  ) {
    const vertical = orientation === 'vertical';
    return (
      <SliderPrimitive.Root
        {...props}
        ref={ref}
        data-slot="slider"
        orientation={orientation}
        className={cn(
          'relative touch-none select-none data-[disabled]:opacity-50',
          !unstyled && (vertical ? 'h-40 w-6' : 'h-6 w-full'),
          className,
        )}
      >
        <SliderPrimitive.Control
          data-slot="slider-control"
          {...controlProps}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...controlProps?.style,
          }}
        >
          <SliderPrimitive.Track
            data-slot="slider-track"
            {...trackProps}
            className={cn(
              !unstyled &&
                'relative overflow-hidden rounded-full bg-[var(--ck-border,#4c4c4c)] data-[orientation=horizontal]:h-1 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1',
              trackProps?.className,
            )}
          >
            {showIndicator && (
              <SliderPrimitive.Indicator
                data-slot="slider-indicator"
                className="rounded-full bg-[var(--ck-accent,#0d99ff)]"
              />
            )}
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            aria-valuetext={ariaValueText}
            data-slot="slider-thumb"
            {...thumbProps}
            className={cn(
              !unstyled &&
                'size-3.5 rounded-full border border-black/20 bg-[var(--ck-foreground,#ffffff)] shadow-sm outline-none focus-within:ring-2 focus-within:ring-[var(--ck-accent,#0d99ff)] focus-within:ring-offset-2',
              thumbProps?.className,
            )}
          />
        </SliderPrimitive.Control>
        {children}
      </SliderPrimitive.Root>
    );
  },
);

export type ColorValueSliderProps = Omit<SliderProps, 'showIndicator'>;

/** Numeric color adapter: callers supply their channel range and rail gradient. */
export const ColorValueSlider = React.forwardRef<
  HTMLDivElement,
  ColorValueSliderProps
>(function ColorValueSlider({ thumbProps, ...props }, ref) {
  return (
    <Slider
      {...props}
      ref={ref}
      data-color-value-slider=""
      showIndicator={false}
      thumbProps={{ 'data-color-slider-thumb': '', ...thumbProps }}
    />
  );
});
