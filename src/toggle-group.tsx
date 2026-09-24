import * as React from 'react';
import {
  ToggleGroup as ToggleGroupPrimitive,
  type ToggleGroupChangeEventDetails,
} from '@base-ui/react/toggle-group';
import { Toggle as TogglePrimitive } from '@base-ui/react/toggle';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './utils.js';

const toggleGroupVariants = cva('flex items-center justify-center gap-1', {
  variants: {
    variant: {
      default: 'rounded-lg bg-[var(--ck-surface-content,#1f1f1f)] p-1',
      outline: 'rounded-lg border border-[color:var(--ck-border,#4c4c4c)] p-1',
    },
    size: {
      default: 'h-9',
      sm: 'h-8',
      lg: 'h-10',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

const toggleGroupItemVariants = cva(
  'inline-flex items-center justify-center rounded-md px-2.5 py-1 text-sm font-medium text-[color:var(--ck-foreground,#ffffff)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ck-accent,#0d99ff)]/60 data-[pressed]:bg-[var(--ck-surface,#383838)] data-[pressed]:shadow-sm disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      size: {
        default: 'h-7 min-w-7',
        sm: 'h-6 min-w-6 text-xs',
        lg: 'h-8 min-w-8',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

export type ToggleGroupSingleProps = Omit<
  React.ComponentProps<typeof ToggleGroupPrimitive>,
  'className' | 'defaultValue' | 'multiple' | 'onValueChange' | 'value'
> & {
  type?: 'single';
  /**
   * The pressed item's value. `null` means the group is controlled and
   * nothing is pressed; `undefined` means the group is uncontrolled.
   */
  value?: string | null;
  defaultValue?: string | null;
  /**
   * When `true`, the pressed item cannot be deselected by clicking it again
   * or by toggling it with the keyboard — the group always keeps a
   * selection. Has no effect on switching between items.
   * @default false
   */
  required?: boolean;
  onValueChange?: (
    value: string | null,
    eventDetails: ToggleGroupChangeEventDetails,
  ) => void;
};

export type ToggleGroupMultipleProps = Omit<
  React.ComponentProps<typeof ToggleGroupPrimitive>,
  'className' | 'defaultValue' | 'multiple' | 'onValueChange' | 'value'
> & {
  type: 'multiple';
  value?: string[];
  defaultValue?: string[];
  /** Not supported in multiple mode. */
  required?: never;
  onValueChange?: (
    value: string[],
    eventDetails: ToggleGroupChangeEventDetails,
  ) => void;
};

export type ToggleGroupProps = (
  | ToggleGroupSingleProps
  | ToggleGroupMultipleProps
) &
  VariantProps<typeof toggleGroupVariants> & {
    className?: string;
    loop?: boolean;
  };

export function ToggleGroup({
  className,
  variant,
  size,
  children,
  defaultValue,
  loop,
  onValueChange,
  required,
  type = 'single',
  value,
  ...props
}: ToggleGroupProps) {
  const multiple = type === 'multiple';

  // Single mode is always driven as a controlled Base UI ToggleGroup so that
  // deselecting the pressed item (`null`) never flips the primitive between
  // controlled and uncontrolled. When the consumer doesn't pass `value`, we
  // track the pressed item ourselves and feed it back in as the primitive's
  // controlled value.
  const [internalSingleValue, setInternalSingleValue] = React.useState<
    string | null
  >(() =>
    multiple ? null : ((defaultValue as string | null | undefined) ?? null),
  );
  const [internalMultipleValue, setInternalMultipleValue] = React.useState<
    string[]
  >(() => (multiple ? ((defaultValue as string[] | undefined) ?? []) : []));

  const isSingleControlled = !multiple && value !== undefined;
  const isMultipleControlled = multiple && value !== undefined;

  const currentSingleValue = isSingleControlled
    ? ((value as string | null | undefined) ?? null)
    : internalSingleValue;
  const currentMultipleValue = isMultipleControlled
    ? ((value as string[] | undefined) ?? [])
    : internalMultipleValue;

  const primitiveValue = multiple
    ? currentMultipleValue
    : currentSingleValue === null
      ? []
      : [currentSingleValue];

  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      className={cn(toggleGroupVariants({ variant, size }), className)}
      loopFocus={loop}
      multiple={multiple}
      value={primitiveValue}
      onValueChange={(nextValue, eventDetails) => {
        if (multiple) {
          if (!isMultipleControlled) {
            setInternalMultipleValue(nextValue);
          }
          (
            onValueChange as
              | ToggleGroupMultipleProps['onValueChange']
              | undefined
          )?.(nextValue, eventDetails);
          return;
        }

        const nextSingleValue = nextValue[0] ?? null;

        if (required && nextSingleValue === null) {
          // Keep the current selection: no state update, no callback.
          return;
        }

        if (!isSingleControlled) {
          setInternalSingleValue(nextSingleValue);
        }

        (
          onValueChange as ToggleGroupSingleProps['onValueChange'] | undefined
        )?.(nextSingleValue, eventDetails);
      }}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive>
  );
}

export function ToggleGroupItem({
  className,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive> &
  VariantProps<typeof toggleGroupItemVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      className={cn(toggleGroupItemVariants({ size }), className)}
      {...props}
    />
  );
}
