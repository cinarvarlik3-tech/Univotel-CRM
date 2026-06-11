/**
 * Shared stage page component — wraps AppShell + toolbar + table with a pre-applied stage filter.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { AppShell } from '@/components/layout/AppShell';
import { LeadDetailPanel } from '@/components/leads/LeadDetailPanel';
import {
  DEFAULT_LEAD_LIST_STATE,
  LeadListToolbar,
  type LeadListFilterState,
} from '@/components/leads/LeadListToolbar';
import { LeadTable } from '@/components/leads/LeadTable';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/ui/kpi-card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useLeads } from '@/hooks/useLeads';
import { useSalespeople } from '@/hooks/useSalespeople';
import { useTranslation } from '@/hooks/useTranslation';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { buildQueryFromLeadListState } from '@/lib/ui/lead-list-query';
import type { LeadRow } from '@/types/domain';

const HIDDEN_FILTER_FIELDS = new Set(['funnel_status', 'has_moved_in', 'is_24h_restricted']);

interface StageLeadPageProps {
  titleKey: string;
  /** Extra query param string appended to the API call, e.g. '&filter[funnel_status][in]=aranacak,arandi-acmadi' */
  stageFilter: string;
  /** Base path for routing (e.g. '/leads/expecting-call') */
  basePath: string;
  /** Whether to show assignee column (default: true for manager) */
  hideAssignee?: boolean;
}

function selectedLeadFromQuery(
  query: Record<string, string | string[] | undefined>,
): string | null {
  const selected = query.selected;
  if (typeof selected === 'string' && selected.length > 0) return selected;
  return null;
}

export function StageLeadPage({
  titleKey,
  stageFilter,
  basePath,
  hideAssignee,
}: StageLeadPageProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: salespeople } = useSalespeople();

  const [listState, setListState] = useState<LeadListFilterState>(DEFAULT_LEAD_LIST_STATE);
  const [appliedState, setAppliedState] = useState<LeadListFilterState>(DEFAULT_LEAD_LIST_STATE);
  const [accumulatedLeads, setAccumulatedLeads] = useState<LeadRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const selectedLeadId = router.isReady ? selectedLeadFromQuery(router.query) : null;
  const panelOpen = selectedLeadId !== null;
  const isManager = user ? isManagerOrAbove(user.role) : false;
  const canFetch = Boolean(user);

  // Build query: salesperson scoped to mine, both show_all=1 to bypass relevance filter.
  const baseQuery = canFetch
    ? buildQueryFromLeadListState(appliedState, {
        mine: !isManager,
        showAll: true,
      }) + stageFilter
    : '';

  const { data, error, isLoading, mutate } = useLeads(canFetch ? baseQuery : null);

  useEffect(() => {
    if (data) {
      setAccumulatedLeads(data.leads);
      setNextCursor(data.nextCursor);
    }
  }, [data]);

  const totalCount = useMemo(() => data?.totalCount ?? 0, [data?.totalCount]);

  function handleApply() {
    setAppliedState(listState);
    setAccumulatedLeads([]);
    setNextCursor(null);
    mutate();
  }

  const openLead = useCallback(
    (uuid: string) => {
      router.push({ pathname: basePath, query: { ...router.query, selected: uuid } }, undefined, {
        shallow: true,
      });
    },
    [router, basePath],
  );

  const closePanel = useCallback(() => {
    const nextQuery = { ...router.query };
    delete nextQuery.selected;
    router.push({ pathname: basePath, query: nextQuery }, undefined, { shallow: true });
  }, [router, basePath]);

  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    setLoadingMore(true);

    const moreQuery =
      buildQueryFromLeadListState(appliedState, {
        cursor: nextCursor,
        mine: !isManager,
        showAll: true,
      }) + stageFilter;

    const res = await fetch(`/api/leads${moreQuery}`);
    const json = await res.json();

    if (res.ok) {
      setAccumulatedLeads((prev) => [...prev, ...json.data.leads]);
      setNextCursor(json.data.nextCursor);
    }
    setLoadingMore(false);
  }, [nextCursor, appliedState, isManager, stageFilter]);

  if (!user) return null;

  return (
    <AppShell title={t(titleKey)} count={totalCount || undefined}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label={t(titleKey)}
          value={totalCount}
          variant="blue"
          sub={t('leads.totalMatching')}
        />
      </div>

      <div className="mt-4">
        <LeadListToolbar
          state={listState}
          onChange={setListState}
          onApply={handleApply}
          salespeople={salespeople}
          isManager={isManager}
          hiddenFields={HIDDEN_FILTER_FIELDS}
        />
      </div>

      {isLoading && (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-[58px] w-full" />
          <Skeleton className="h-[58px] w-full" />
          <Skeleton className="h-[58px] w-full" />
        </div>
      )}

      {error && <p className="mt-4 text-sm text-brand-red">{t('leads.failedToLoad')}</p>}

      {!isLoading && (
        <LeadTable
          leads={accumulatedLeads}
          selectedId={selectedLeadId ?? undefined}
          onRowClick={openLead}
          hideAssignee={hideAssignee ?? !isManager}
        />
      )}

      {nextCursor && (
        <div className="mt-4 flex justify-center">
          <Button type="button" variant="secondary" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? t('common.loading') : t('common.loadMore')}
          </Button>
        </div>
      )}

      <LeadDetailPanel
        leadId={selectedLeadId}
        open={panelOpen}
        onClose={closePanel}
        isManager={isManager}
        salespeople={salespeople}
      />
    </AppShell>
  );
}
