import * as React from 'react';
import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import { Check } from 'lucide-react';
import { cn } from './utils.js';

export type CheckboxProps = Omit<
  React.ComponentProps<typeof CheckboxPrimitive.Root>,
  'checked' | 'className' | 'onChange'
> & {
  checked: boolean;
  indicatorClassName?: string;
  labelClassName?: string;
  className?: string;
};

export function Checkbox({
  checked,
  onCheckedChange,
  indicatorClassName,
  labelClassName,
  className,
  children,
  disabled,
  ...props
}: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      checked={checked}
      disabled={disabled}
      data-slot="checkbox"
      className={cn(
        'relative flex min-h-6 min-w-0 max-w-full cursor-default items-center gap-2 py-1 text-left text-[11px] font-medium leading-4 tracking-[0.005em] text-[color:var(--ck-foreground,#ffffff)]/80 outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ck-accent,#0d99ff)]/80 data-[disabled]:cursor-not-allowed data-[disabled]:text-[color:var(--ck-foreground,#ffffff)]/35',
        className,
      )}
      onCheckedChange={onCheckedChange}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        keepMounted
        data-slot="checkbox-indicator"
        className={cn(
          'flex size-4 shrink-0 items-center justify-center rounded-[5px] border text-[color:var(--ck-foreground,#ffffff)] transition-[background-color,border-color] data-[checked]:border-[color:var(--ck-accent-border,#007be5)] data-[checked]:bg-[var(--ck-accent,#0d99ff)] data-[unchecked]:border-[color:var(--ck-border,#4C4C4C)] data-[unchecked]:bg-[var(--ck-surface,#383838)] data-[checked]:data-[disabled]:border-[color:var(--ck-accent,#0d99ff)]/40 data-[checked]:data-[disabled]:bg-[var(--ck-accent,#0d99ff)]/40 data-[unchecked]:data-[disabled]:border-[color:var(--ck-foreground,#ffffff)]/15 data-[unchecked]:data-[disabled]:bg-[var(--ck-surface,#383838)]/60 [&[data-unchecked]>svg]:opacity-0',
          indicatorClassName,
        )}
      >
        <Check aria-hidden="true" className="size-3" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
      {children ? (
        <span
          data-slot="checkbox-label"
          className={cn('min-w-0', labelClassName)}
        >
          {children}
        </span>
      ) : null}
    </CheckboxPrimitive.Root>
  );
}
