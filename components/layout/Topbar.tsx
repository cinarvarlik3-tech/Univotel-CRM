/**
 * Page topbar — title, count badge, and action buttons.
 */
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TopbarProps {
  title: string;
  count?: number;
  actions?: ReactNode;
  className?: string;
}

/**
 * Renders the 52px page header bar with title and actions.
 * @param props - Title, optional count badge, and action slot.
 * @returns Topbar element.
 */
export function Topbar({ title, count, actions, className }: TopbarProps) {
  return (
    <header
      className={cn(
        'flex h-[52px] shrink-0 items-center justify-between border-b border-border-default bg-surface-card px-5',
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        <h1 className="font-heading text-[15px] font-bold">{title}</h1>
        {count !== undefined && (
          <Badge className="rounded-full bg-brand-blue px-2 py-0.5 text-[11px] font-medium text-primary-foreground">
            {count.toLocaleString('tr-TR')}
          </Badge>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
