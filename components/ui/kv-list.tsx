/**
 * Key-value description list for detail pages.
 */
import type { ReactNode } from 'react';
import React from 'react';
import { cn } from '@/lib/utils';

interface KvItem {
  term: string;
  value: ReactNode;
}

interface KvListProps {
  items: KvItem[];
  className?: string;
  /** stacked = label above value (for narrow panels); inline = two-column grid */
  layout?: 'inline' | 'stacked';
}

/**
 * Renders a key-value list in inline or stacked layout.
 * @param props - Array of term/value pairs and layout mode.
 * @returns Description list element.
 */
export function KvList({ items, className, layout = 'inline' }: KvListProps) {
  if (layout === 'stacked') {
    return (
      <dl className={cn('space-y-3', className)}>
        {items.map(({ term, value }) => (
          <div key={term}>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
              {term}
            </dt>
            <dd className="mt-0.5 text-sm text-text-primary">{value}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <dl className={cn('grid grid-cols-[140px_1fr] gap-x-3 gap-y-2 text-sm', className)}>
      {items.map(({ term, value }) => (
        <React.Fragment key={term}>
          <dt className="font-medium text-text-secondary">{term}</dt>
          <dd className="m-0 text-text-primary">{value}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}
