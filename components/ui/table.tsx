/**
 * shadcn Table component for data lists.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Table wrapper with horizontal scroll.
 * @param props - Div props.
 * @returns Table container element.
 */
const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  ),
);
Table.displayName = 'Table';

/**
 * Table header section.
 * @param props - THead props.
 * @returns Table head element.
 */
const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn('[&_tr]:border-b-0', className)} {...props} />
));
TableHeader.displayName = 'TableHeader';

/**
 * Table body section.
 * @param props - TBody props.
 * @returns Table body element.
 */
const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
));
TableBody.displayName = 'TableBody';

/**
 * Table row element.
 * @param props - TR props.
 * @returns Table row element.
 */
const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        'h-[58px] border-b border-border-default transition-colors hover:bg-row-hover data-[state=selected]:border-l-[3px] data-[state=selected]:border-l-brand-blue data-[state=selected]:bg-row-selected',
        className,
      )}
      {...props}
    />
  ),
);
TableRow.displayName = 'TableRow';

/**
 * Table header cell.
 * @param props - TH props.
 * @returns Table head cell element.
 */
const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'h-[34px] bg-surface-page px-4 text-left align-middle text-[10px] font-medium uppercase tracking-wide text-text-tertiary',
      className,
    )}
    {...props}
  />
));
TableHead.displayName = 'TableHead';

/**
 * Table data cell.
 * @param props - TD props.
 * @returns Table cell element.
 */
const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn('px-4 align-middle text-sm text-text-primary', className)}
    {...props}
  />
));
TableCell.displayName = 'TableCell';

export { Table, TableHeader, TableBody, TableHead, TableRow, TableCell };
