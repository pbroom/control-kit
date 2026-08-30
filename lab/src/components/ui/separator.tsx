import * as React from 'react';
import { Separator as SeparatorPrimitive } from '@base-ui/react/separator';
import { cn } from '@/lib/utils';

function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive> & {
  decorative?: boolean;
}) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      role={decorative ? 'none' : 'separator'}
      aria-orientation={
        decorative || orientation === 'horizontal' ? undefined : orientation
      }
      className={cn(
        'shrink-0 bg-border',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
