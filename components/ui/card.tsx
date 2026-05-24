/**
 * shadcn Card component for content containers.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Card root container with surface styling.
 * @param props - Div props.
 * @returns Card container element.
 */
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-[10px] border border-border-default bg-surface-card px-5 py-4 text-text-primary shadow-none',
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

/**
 * Card header section.
 * @param props - Div props.
 * @returns Card header element.
 */
const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-1.5 pb-3', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

/**
 * Card title heading.
 * @param props - Heading props.
 * @returns Card title element.
 */
const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('font-heading text-base font-bold leading-none tracking-tight', className)}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';

/**
 * Card description text.
 * @param props - Paragraph props.
 * @returns Card description element.
 */
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-xs text-text-secondary', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

/**
 * Card content body.
 * @param props - Div props.
 * @returns Card content element.
 */
const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('', className)} {...props} />,
);
CardContent.displayName = 'CardContent';

/**
 * Card footer section.
 * @param props - Div props.
 * @returns Card footer element.
 */
const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center pt-3', className)} {...props} />
  ),
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
