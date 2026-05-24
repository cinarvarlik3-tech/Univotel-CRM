/**
 * shadcn Badge component for status pills.
 */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-[9px] py-[3px] text-[11px] font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-brand-blue-light text-brand-blue',
        call: 'bg-[var(--badge-call-bg)] text-[var(--badge-call-text)]',
        visit: 'bg-[var(--badge-visit-bg)] text-[var(--badge-visit-text)]',
        deal: 'bg-[var(--badge-deal-bg)] text-[var(--badge-deal-text)]',
        danger: 'bg-brand-red-light text-brand-red',
        success: 'bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]',
        warning: 'bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)]',
        secondary: 'bg-muted text-text-secondary',
        outline: 'border border-border-strong text-text-primary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

/**
 * Renders a pill-shaped status badge.
 * @param props - Badge props including variant.
 * @returns Badge element.
 */
function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
