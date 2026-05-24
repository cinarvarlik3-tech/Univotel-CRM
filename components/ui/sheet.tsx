/**
 * shadcn Sheet component — slide-over panel from screen edge.
 */
import * as React from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { IconX } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetPortal = SheetPrimitive.Portal;

/** Shared enter/exit animation classes for sheet surfaces. */
const sheetOverlayAnimation =
  'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:duration-300 data-[state=open]:duration-300 motion-reduce:animate-none motion-reduce:duration-0';

const sheetContentAnimation =
  'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:duration-300 data-[state=open]:duration-300 motion-reduce:animate-none motion-reduce:duration-0';

/**
 * Sheet overlay backdrop.
 * @param props - Overlay props from Radix.
 * @returns Overlay element.
 */
const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn('fixed inset-0 z-50 bg-black/40', sheetOverlayAnimation, className)}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = {
  right: cn(
    'inset-y-0 right-0 h-full w-[480px] max-w-[100vw] border-l border-border-default',
    'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
  ),
  left: cn(
    'inset-y-0 left-0 h-full w-[480px] max-w-[100vw] border-r border-border-default',
    'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
  ),
  top: cn(
    'inset-x-0 top-0 w-full border-b border-border-default',
    'data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
  ),
  bottom: cn(
    'inset-x-0 bottom-0 w-full border-t border-border-default',
    'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
  ),
};

interface SheetContentProps extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> {
  side?: keyof typeof sheetVariants;
  hideClose?: boolean;
}

/**
 * Sheet content panel sliding from an edge.
 * @param props - Content props including side placement.
 * @returns Sheet content element.
 */
const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = 'right', className, children, hideClose, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-50 flex flex-col bg-surface-card shadow-lg',
        sheetContentAnimation,
        sheetVariants[side],
        className,
      )}
      {...props}
    >
      {children}
      {!hideClose && (
        <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none">
          <IconX className="size-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      )}
    </SheetPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = SheetPrimitive.Content.displayName;

/**
 * Sheet header section.
 * @param props - Div props.
 * @returns Sheet header element.
 */
const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1.5', className)} {...props} />
);
SheetHeader.displayName = 'SheetHeader';

/**
 * Sheet title heading.
 * @param props - Title props from Radix.
 * @returns Sheet title element.
 */
const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn('font-heading text-base font-bold text-text-primary', className)}
    {...props}
  />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
};
