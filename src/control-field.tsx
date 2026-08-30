import * as React from 'react';
import { Field } from '@base-ui/react/field';
import { NumberField } from '@base-ui/react/number-field';
import {
  resolveControlFieldExpression,
  type ControlFieldExpressionResolver,
} from './control-field-expression.js';
import { cn } from './utils.js';

type PreventableBaseUIEvent = {
  preventBaseUIHandler?: () => void;
};

export type ControlFieldBoundaryBehavior = 'clamp' | 'wrap';
export type ControlFieldCustomReason =
  | 'expression'
  | 'page-step'
  | 'boundary-key';

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

export interface ControlFieldRootProps extends Omit<
  NumberField.Root.Props,
  'defaultValue' | 'onValueChange' | 'onValueCommitted' | 'value'
> {
  value?: number | null;
  defaultValue?: number | null;
  boundaryBehavior?: ControlFieldBoundaryBehavior;
  expressionResolver?: ControlFieldExpressionResolver | null;
  pageStep?: number;
  onValueChange?: (
    value: number | null,
    details: ControlFieldValueChangeDetails,
  ) => void;
  onValueCommitted?: (
    value: number | null,
    details: ControlFieldValueCommitDetails,
  ) => void;
}

interface ControlFieldContextValue {
  boundaryBehavior: ControlFieldBoundaryBehavior;
  expressionResolver: ControlFieldExpressionResolver | null;
  max?: number;
  min?: number;
  pageStep: number;
  readOnly: boolean;
  value: number | null;
  changeValue: (
    value: number | null,
    reason: ControlFieldCustomReason,
    event: Event,
    expression?: string,
  ) => boolean;
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

function normalizeValue(
  value: number | null,
  min: number | undefined,
  max: number | undefined,
  behavior: ControlFieldBoundaryBehavior,
) {
  if (value === null) return null;
  if (!Number.isFinite(value)) return null;

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
    boundaryBehavior = 'clamp',
    defaultValue = null,
    expressionResolver = resolveControlFieldExpression,
    max,
    min,
    onValueChange,
    onValueCommitted,
    pageStep = 10,
    readOnly = false,
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

  const publishValue = React.useCallback(
    (nextValue: number | null, details: ControlFieldValueChangeDetails) => {
      const normalized = normalizeValue(nextValue, min, max, boundaryBehavior);
      onValueChange?.(normalized, details);

      if (!details.isCanceled && !controlled) {
        setUncontrolledValue(normalized);
      }

      return { normalized, canceled: details.isCanceled };
    },
    [boundaryBehavior, controlled, max, min, onValueChange],
  );

  const changeValue = React.useCallback(
    (
      nextValue: number | null,
      reason: ControlFieldCustomReason,
      event: Event,
      expression?: string,
    ) => {
      if (readOnly) return false;

      const details = createCustomChangeDetails(reason, event, expression);
      const { normalized, canceled } = publishValue(nextValue, details);
      if (!canceled) {
        onValueCommitted?.(normalized, {
          reason,
          event,
          expression,
        });
      }
      return !canceled;
    },
    [onValueCommitted, publishValue, readOnly],
  );

  const context = React.useMemo<ControlFieldContextValue>(
    () => ({
      boundaryBehavior,
      changeValue,
      expressionResolver,
      max,
      min,
      pageStep: Math.abs(pageStep),
      readOnly,
      value,
    }),
    [
      boundaryBehavior,
      changeValue,
      expressionResolver,
      max,
      min,
      pageStep,
      readOnly,
      value,
    ],
  );

  return (
    <ControlFieldContext.Provider value={context}>
      <NumberField.Root
        ref={ref}
        data-slot="control-field"
        min={boundaryBehavior === 'wrap' ? undefined : min}
        max={boundaryBehavior === 'wrap' ? undefined : max}
        readOnly={readOnly}
        value={value}
        onValueChange={(nextValue, details) => {
          publishValue(nextValue, details);
        }}
        onValueCommitted={(nextValue, details) => {
          onValueCommitted?.(
            normalizeValue(nextValue, min, max, boundaryBehavior),
            details,
          );
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

function expressionMayStart(key: string) {
  return key.length === 1 && /[+*/^()]/.test(key);
}

function expressionIsPresent(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^(?:current|value|x)\b/i.test(trimmed)) return true;
  if (/^[+*/]/.test(trimmed)) return true;
  const withoutScientificExponent = trimmed.replace(/[eE][+-]?\d+/g, '');
  return /[+*/^()]|[+-]/.test(withoutScientificExponent.slice(1));
}

function preventBaseUIHandler(event: PreventableBaseUIEvent) {
  event.preventBaseUIHandler?.();
}

export const ControlFieldInput = React.forwardRef<
  HTMLInputElement,
  ControlFieldInputProps
>(function ControlFieldInput(
  { onBlur, onChange, onKeyDown, onPaste, render, className, ...props },
  ref,
) {
  const context = useControlFieldContext();
  const [expressionDraft, setExpressionDraft] = React.useState<string | null>(
    null,
  );
  const [expressionInvalid, setExpressionInvalid] = React.useState(false);

  const resolveExpression = React.useCallback(
    (event: Event) => {
      if (expressionDraft === null || !context.expressionResolver) return true;

      const resolved = context.expressionResolver(expressionDraft, {
        currentValue: context.value ?? 0,
        min: context.min,
        max: context.max,
      });
      if (resolved === null || !Number.isFinite(resolved)) {
        setExpressionInvalid(true);
        return false;
      }

      const changed = context.changeValue(
        resolved,
        'expression',
        event,
        expressionDraft,
      );
      if (changed) {
        setExpressionDraft(null);
        setExpressionInvalid(false);
      }
      return changed;
    },
    [context, expressionDraft],
  );

  return (
    <NumberField.Input
      ref={ref}
      {...props}
      data-slot="control-field-input"
      aria-invalid={expressionInvalid || props['aria-invalid'] || undefined}
      className={(state) =>
        cn(
          'h-full min-w-0 flex-1 cursor-default bg-transparent py-0 pl-1 pr-0 font-sans text-[11px] leading-4 tabular-nums text-[color:var(--ck-foreground,#fff)] outline-none placeholder:text-[color:var(--ck-foreground,#fff)]/35 focus:cursor-text disabled:cursor-not-allowed disabled:opacity-45',
          typeof className === 'function' ? className(state) : className,
        )
      }
      data-expression={expressionDraft === null ? undefined : ''}
      data-expression-invalid={expressionInvalid ? '' : undefined}
      onBlur={(event) => {
        onBlur?.(event);
        if (event.defaultPrevented) return;

        if (expressionDraft !== null) preventBaseUIHandler(event);
        resolveExpression(event.nativeEvent);
      }}
      onChange={(event) => {
        onChange?.(event);
        if (event.defaultPrevented || !context.expressionResolver) return;

        const nextDraft = event.currentTarget.value;
        if (expressionDraft !== null || expressionIsPresent(nextDraft)) {
          preventBaseUIHandler(event);
          setExpressionDraft(nextDraft);
          setExpressionInvalid(false);
        }
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;

        if (expressionDraft !== null) {
          if (event.key === 'Enter') {
            event.preventDefault();
            preventBaseUIHandler(event);
            resolveExpression(event.nativeEvent);
            return;
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            preventBaseUIHandler(event);
            setExpressionDraft(null);
            setExpressionInvalid(false);
            return;
          }
          if (event.key !== 'Tab') preventBaseUIHandler(event);
          return;
        }

        if (context.expressionResolver && expressionMayStart(event.key)) {
          preventBaseUIHandler(event);
          return;
        }

        if (context.readOnly) return;

        if (event.key === 'PageUp' || event.key === 'PageDown') {
          event.preventDefault();
          preventBaseUIHandler(event);
          const direction = event.key === 'PageUp' ? 1 : -1;
          context.changeValue(
            (context.value ?? 0) + direction * context.pageStep,
            'page-step',
            event.nativeEvent,
          );
          return;
        }

        if (
          context.boundaryBehavior === 'wrap' &&
          (event.key === 'Home' || event.key === 'End')
        ) {
          const boundary = event.key === 'Home' ? context.min : context.max;
          if (boundary !== undefined) {
            event.preventDefault();
            preventBaseUIHandler(event);
            context.changeValue(boundary, 'boundary-key', event.nativeEvent);
          }
        }
      }}
      onPaste={(event) => {
        onPaste?.(event);
        if (event.defaultPrevented || !context.expressionResolver) return;

        const input = event.currentTarget;
        const pasted = event.clipboardData.getData('text/plain');
        const currentText = expressionDraft ?? input.value;
        const start = input.selectionStart ?? currentText.length;
        const end = input.selectionEnd ?? start;
        const nextDraft =
          currentText.slice(0, start) + pasted + currentText.slice(end);

        if (expressionDraft !== null || expressionIsPresent(nextDraft)) {
          event.preventDefault();
          preventBaseUIHandler(event);
          setExpressionDraft(nextDraft);
          setExpressionInvalid(false);
        }
      }}
      render={(baseProps, state) => {
        const renderedProps = {
          ...baseProps,
          value: expressionDraft ?? baseProps.value,
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
  return (
    <NumberField.Group
      ref={ref}
      {...groupProps}
      data-slot="control-field-group"
      className={(state) =>
        cn(
          'relative box-border flex h-6 min-h-6 w-full min-w-0 items-center rounded-[4px] border border-transparent bg-[var(--ck-surface,#383838)] p-0 font-sans text-[11px] leading-4 text-[color:var(--ck-foreground,#fff)] transition-colors [&:hover:not(:focus-within)]:border-[color:var(--ck-border,#4c4c4c)] focus-within:border-[color:var(--ck-border-focus,#5288db)] data-[invalid]:border-[color:var(--ck-border-invalid,#ff4e4e)] data-[scrubbing]:border-[color:var(--ck-border-scrub,#97c1ef)] data-[disabled]:opacity-45',
          typeof className === 'function' ? className(state) : className,
        )
      }
    />
  );
});

export const ControlFieldScrubArea = React.forwardRef<
  HTMLSpanElement,
  NumberField.ScrubArea.Props
>(function ControlFieldScrubArea(props, ref) {
  const { className, ...scrubAreaProps } = props;
  return (
    <NumberField.ScrubArea
      ref={ref}
      {...scrubAreaProps}
      data-slot="control-field-scrub-area"
      className={(state) =>
        cn(
          'flex h-full w-6 shrink-0 cursor-ew-resize touch-none select-none items-center justify-center font-medium tabular-nums text-[color:var(--ck-foreground,#fff)]/55 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45',
          typeof className === 'function' ? className(state) : className,
        )
      }
    />
  );
});

export const ControlFieldScrubAreaCursor = React.forwardRef<
  HTMLSpanElement,
  NumberField.ScrubAreaCursor.Props
>(function ControlFieldScrubAreaCursor({ className, ...props }, ref) {
  return (
    <NumberField.ScrubAreaCursor
      ref={ref}
      {...props}
      className={(state) =>
        cn(
          'drop-shadow-sm',
          typeof className === 'function' ? className(state) : className,
        )
      }
    />
  );
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
  HTMLDivElement,
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
