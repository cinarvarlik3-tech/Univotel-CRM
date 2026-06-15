/**
 * Page topbar — title, count badge, global quick-search, and action buttons.
 */
import type { ReactNode } from 'react';
import { useCallback } from 'react';
import { useRouter } from 'next/router';
import { Badge } from '@/components/ui/badge';
import { GlobalQuickSearch } from '@/components/leads/GlobalQuickSearch';
import { useTranslation } from '@/hooks/useTranslation';
import { formatNumber } from '@/lib/i18n/format-date';
import { cn } from '@/lib/utils';

interface TopbarProps {
  title: string;
  count?: number;
  actions?: ReactNode;
  className?: string;
}

/**
 * Renders the 52px page header bar with title, global quick-search, and actions.
 * @param props - Title, optional count badge, and action slot.
 * @returns Topbar element.
 */
export function Topbar({ title, count, actions, className }: TopbarProps) {
  const { locale } = useTranslation();
  const router = useRouter();

  // D14: quick-search opens the lead's side panel via URL param (consistent with all stage pages)
  const handleSelectLead = useCallback(
    (uuid: string) => {
      // Navigate to a neutral route that can host the panel, or push selected= to current page
      const current = router.asPath.split('?')[0];
      router.push({ pathname: current, query: { ...router.query, selected: uuid } }, undefined, {
        shallow: true,
      });
    },
    [router],
  );

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
            {formatNumber(count, locale)}
          </Badge>
        )}
      </div>

      {/* D14 / §4.6: Global quick-search — always accessible, every screen */}
      <div className="flex flex-1 items-center justify-center px-4">
        <GlobalQuickSearch onSelectLead={handleSelectLead} />
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
