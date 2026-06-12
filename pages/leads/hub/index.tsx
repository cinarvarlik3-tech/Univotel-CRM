/**
 * Lead Hub page — unclaimed leads that salespeople can self-assign.
 */
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { LeadHubTable } from '@/components/leads/LeadHubTable';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { useLeads } from '@/hooks/useLeads';
import { buildQueryFromLeadListState } from '@/lib/ui/lead-list-query';
import { DEFAULT_LEAD_LIST_STATE } from '@/components/leads/LeadListToolbar';
import type { LeadRow } from '@/types/domain';

const HUB_QUERY = buildQueryFromLeadListState(DEFAULT_LEAD_LIST_STATE, { unassigned: true });

/**
 * Renders the Lead Hub — a pool of unclaimed leads for salesperson self-assignment.
 * @returns Lead Hub page wrapped in AppShell.
 */
export default function LeadHubPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [accumulatedLeads, setAccumulatedLeads] = useState<LeadRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const canFetch = Boolean(user);
  const { data, error, isLoading, mutate } = useLeads(canFetch ? HUB_QUERY : null);

  useEffect(() => {
    if (data) {
      setAccumulatedLeads(data.leads);
      setNextCursor(data.nextCursor);
    }
  }, [data]);

  const handleClaimSuccess = useCallback(() => {
    setAccumulatedLeads([]);
    setNextCursor(null);
    mutate();
  }, [mutate]);

  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    setLoadingMore(true);

    const moreQuery = buildQueryFromLeadListState(DEFAULT_LEAD_LIST_STATE, {
      cursor: nextCursor,
      unassigned: true,
    });

    const res = await fetch(`/api/leads${moreQuery}`);
    const json = await res.json();

    if (res.ok) {
      setAccumulatedLeads((prev) => [...prev, ...json.data.leads]);
      setNextCursor(json.data.nextCursor);
    }

    setLoadingMore(false);
  }, [nextCursor]);

  if (!user) return null;

  return (
    <AppShell title={t('leadHub.title')} count={data?.totalCount ?? undefined}>
      {/* D17: header card strip removed — count shown in title badge */}
      <div className="mt-0">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-[58px] w-full" />
            <Skeleton className="h-[58px] w-full" />
            <Skeleton className="h-[58px] w-full" />
          </div>
        )}
        {error && <p className="text-sm text-brand-red">{t('leads.failedToLoad')}</p>}

        {!isLoading && (
          <LeadHubTable leads={accumulatedLeads} onClaimSuccess={handleClaimSuccess} />
        )}

        {nextCursor && (
          <div className="mt-4 flex justify-center">
            <Button type="button" variant="secondary" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? t('common.loading') : t('common.loadMore')}
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
