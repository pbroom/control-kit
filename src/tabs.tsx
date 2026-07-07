import * as React from 'react';
import { Tabs as TabsPrimitive } from 'radix-ui';
import { cn } from './utils.js';

export type TabsProps = React.ComponentProps<typeof TabsPrimitive.Root>;
export type TabsListProps = React.ComponentProps<typeof TabsPrimitive.List>;
export type TabsTriggerProps = React.ComponentProps<
  typeof TabsPrimitive.Trigger
>;
export type TabsContentProps = React.ComponentProps<
  typeof TabsPrimitive.Content
>;

export function Tabs({ className, ...props }: TabsProps) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex min-w-0 flex-col gap-2', className)}
      {...props}
    />
  );
}

export function TabsList({ className, ...props }: TabsListProps) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'inline-flex h-6 max-w-full items-start gap-1 bg-transparent p-0 text-[color:var(--ck-foreground,#ffffff)]/50',
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'inline-flex h-6 min-w-0 items-center justify-center gap-1 rounded-[5px] border border-transparent bg-transparent px-2 text-[11px] font-medium leading-4 tracking-[0.005em] text-[color:var(--ck-foreground,#ffffff)]/50 outline-none transition-[background-color,border-color,color] hover:bg-[var(--ck-surface,#383838)] hover:text-[color:var(--ck-foreground,#ffffff)]/90 focus-visible:border-[color:var(--ck-accent,#0d99ff)] disabled:pointer-events-none disabled:text-[color:var(--ck-foreground,#ffffff)]/25 data-[state=active]:bg-[var(--ck-surface,#383838)] data-[state=active]:font-semibold data-[state=active]:text-[color:var(--ck-foreground,#ffffff)]/90 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: TabsContentProps) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        'min-w-0 rounded-[7px] border border-[color:var(--ck-foreground,#ffffff)]/10 bg-[var(--ck-surface-content,#1f1f1f)] p-2 text-[11px] leading-4 text-[color:var(--ck-foreground,#ffffff)]/65 outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ck-accent,#0d99ff)]/80',
        className,
      )}
      {...props}
    />
  );
}
