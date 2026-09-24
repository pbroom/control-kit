import * as React from 'react';
import {
  ControlField,
  type ControlFieldRootProps,
  type ControlFieldScrubAreaProps,
} from './control-field.js';
import { controlKitColor } from './theme.js';
import { cn } from './utils.js';

export type ControlInputSize = 'sm' | 'md' | 'lg' | 'full';
export type ControlInputDensity = 'compact' | 'comfortable';
export type ControlInputVariant = 'default' | 'embedded';
export type ControlInputHandleSide = 'leading' | 'trailing';

const CONTROL_INPUT_SIZE_CLASS: Record<ControlInputSize, string> = {
  sm: 'w-32',
  md: 'w-44',
  lg: 'w-60',
  full: 'w-full',
};

const CONTROL_INPUT_DENSITY_CLASS: Record<ControlInputDensity, string> = {
  compact: 'h-6 min-h-6 text-[11px] leading-4',
  comfortable: 'h-8 min-h-8 text-xs leading-4',
};

export interface ControlInputProps extends Omit<
  ControlFieldRootProps,
  'children' | 'render'
> {
  /** Accessible name for the text input. */
  label?: string;
  placeholder?: string;
  /** @default 'full' */
  size?: ControlInputSize;
  /** @default 'compact' */
  density?: ControlInputDensity;
  /**
   * `embedded` drops the rounded border so the input can sit inside another
   * surface, such as a multi-input row.
   * @default 'default'
   */
  variant?: ControlInputVariant;
  /** Non-interactive unit or suffix rendered after the text. */
  unit?: React.ReactNode;
  /**
   * Scrub handle content, such as a property letter or icon. Without content
   * the scrub target is a thin strip along the handle side.
   */
  handle?: React.ReactNode;
  /** @default 'leading' */
  handleSide?: ControlInputHandleSide;
  /**
   * Width in pixels of a handle with content.
   * @default 24
   */
  handleWidth?: number;
  /**
   * Render the scrub handle.
   * @default true
   */
  scrub?: boolean;
  /** Force the invalid visual state and `aria-invalid`. */
  invalid?: boolean;
  /** @default 1 */
  pixelsPerStep?: ControlFieldScrubAreaProps['pixelsPerStep'];
  stepDistance?: ControlFieldScrubAreaProps['stepDistance'];
  /** @default 1 */
  scrubThreshold?: ControlFieldScrubAreaProps['threshold'];
  /** @default 0 */
  scrubCommitThreshold?: ControlFieldScrubAreaProps['commitThreshold'];
  scrubMaxCommitRate?: ControlFieldScrubAreaProps['maxCommitRate'];
  /** @default false */
  pointerLock?: ControlFieldScrubAreaProps['pointerLock'];
  onScrubbingChange?: ControlFieldScrubAreaProps['onScrubbingChange'];
  /** Props for the text input, such as `inputMode` or key handlers. */
  inputProps?: React.ComponentProps<typeof ControlField.Input>;
}

function hasContent(node: React.ReactNode) {
  return node !== null && node !== undefined && node !== false;
}

/**
 * A compact numeric input preset: `ControlField` Root, Group, ScrubArea,
 * Input, and Affix with sizes, density, an optional unit, and a scrub
 * handle. Accepts every `ControlField.Root` prop.
 */
export const ControlInput = React.forwardRef<HTMLDivElement, ControlInputProps>(
  function ControlInput(
    {
      className,
      density = 'compact',
      handle,
      handleSide = 'leading',
      handleWidth = 24,
      inputProps,
      invalid = false,
      label,
      onScrubbingChange,
      pixelsPerStep,
      placeholder,
      pointerLock,
      scrub = true,
      scrubCommitThreshold,
      scrubMaxCommitRate,
      scrubThreshold,
      size = 'full',
      stepDistance,
      unit,
      variant = 'default',
      ...rootProps
    },
    ref,
  ) {
    const embedded = variant === 'embedded';
    const hasHandleContent = hasContent(handle);
    const scrubArea = scrub ? (
      <ControlField.ScrubArea
        aria-hidden="true"
        data-control-kit-scrub-handle=""
        pixelsPerStep={pixelsPerStep}
        stepDistance={stepDistance}
        threshold={scrubThreshold}
        commitThreshold={scrubCommitThreshold}
        maxCommitRate={scrubMaxCommitRate}
        pointerLock={pointerLock}
        onScrubbingChange={onScrubbingChange}
        className={
          hasHandleContent
            ? 'w-auto'
            : cn(
                'absolute top-0 z-10 h-full w-[5px]',
                handleSide === 'leading' ? '-left-0.5' : '-right-0.5',
              )
        }
        style={hasHandleContent ? { width: handleWidth } : undefined}
      >
        {hasHandleContent ? handle : null}
      </ControlField.ScrubArea>
    ) : null;

    return (
      <ControlField.Root
        ref={ref}
        {...rootProps}
        data-slot="control-input"
        data-variant={variant}
        className={(state) =>
          cn(
            'min-w-0 max-w-full',
            CONTROL_INPUT_SIZE_CLASS[size],
            typeof className === 'function' ? className(state) : className,
          )
        }
      >
        <ControlField.Group
          data-invalid={invalid ? '' : undefined}
          className={cn(
            CONTROL_INPUT_DENSITY_CLASS[density],
            embedded && 'rounded-none',
          )}
          style={
            embedded && !invalid
              ? { borderColor: 'transparent' }
              : invalid
                ? { borderColor: controlKitColor.borderInvalid }
                : undefined
          }
        >
          {handleSide === 'leading' ? scrubArea : null}
          <ControlField.Input
            aria-label={label}
            placeholder={placeholder}
            {...inputProps}
            aria-invalid={invalid || inputProps?.['aria-invalid'] || undefined}
            className={(state) =>
              cn(
                'text-[length:inherit]',
                typeof inputProps?.className === 'function'
                  ? inputProps.className(state)
                  : inputProps?.className,
              )
            }
          />
          {hasContent(unit) ? (
            <ControlField.Affix>{unit}</ControlField.Affix>
          ) : null}
          {handleSide === 'trailing' ? scrubArea : null}
        </ControlField.Group>
      </ControlField.Root>
    );
  },
);
