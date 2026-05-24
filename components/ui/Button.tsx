/**
 * shadcn Button component — primary, secondary, and destructive variants.
 */
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-brand-blue text-primary-foreground hover:bg-brand-blue-hover border-0 px-3.5 py-[7px]',
        secondary:
          'bg-surface-card text-text-primary border border-border-strong hover:bg-muted px-3 py-[7px]',
        destructive:
          'border border-brand-red text-brand-red bg-transparent hover:bg-brand-red-light px-3 py-[7px]',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-brand-blue underline-offset-4 hover:underline',
        outline: 'border border-border-strong bg-surface-card text-text-primary hover:bg-muted',
      },
      size: {
        default: 'h-auto',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-lg px-6 text-sm',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

/**
 * Renders a styled button with variant support.
 * @param props - Button props including variant and size.
 * @returns Button element.
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
