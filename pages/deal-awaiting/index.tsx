/**
 * Deal Awaiting page — leads parked until property deals close.
 * These leads are NOT lost; they are temporarily held and will be
 * reached out to as soon as the required accommodations become available.
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
import { useTranslation } from '@/hooks/useTranslation';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { useLeads } from '@/hooks/useLeads';
import { useLeadRowActions } from '@/hooks/useLeadRowActions';
import { useSalespeople } from '@/hooks/useSalespeople';
import { buildQueryFromLeadListState } from '@/lib/ui/lead-list-query';
import type { LeadRow } from '@/types/domain';

const DEAL_AWAITING_DEFAULT_STATE: LeadListFilterState = {
  ...DEFAULT_LEAD_LIST_STATE,
  fieldFilters: {
    deal_awaiting: { mode: 'match', value: 'true' },
  },
};

function selectedLeadFromQuery(
  query: Record<string, string | string[] | undefined>,
): string | null {
  const selected = query.selected;
  if (typeof selected === 'string' && selected.length > 0) return selected;
  return null;
}

function withDealAwaitingFilter(state: LeadListFilterState): LeadListFilterState {
  return {
    ...state,
    fieldFilters: {
      ...state.fieldFilters,
      deal_awaiting: { mode: 'match', value: 'true' },
    },
  };
}

export default function DealAwaitingPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: salespeople } = useSalespeople();
  const { renderRowActions, dialogs: rowActionDialogs } = useLeadRowActions({
    preset: 'manager',
    salespeople,
  });

  const [listState, setListState] = useState<LeadListFilterState>(DEAL_AWAITING_DEFAULT_STATE);
  const [appliedState, setAppliedState] = useState<LeadListFilterState>(
    DEAL_AWAITING_DEFAULT_STATE,
  );
  const [accumulatedLeads, setAccumulatedLeads] = useState<LeadRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const selectedLeadId = router.isReady ? selectedLeadFromQuery(router.query) : null;
  const panelOpen = selectedLeadId !== null;
  const canFetch = Boolean(user);

  const queryString = canFetch
    ? buildQueryFromLeadListState(withDealAwaitingFilter(appliedState))
    : '';

  const { data, error, isLoading, mutate } = useLeads(canFetch ? queryString : null);

  useEffect(() => {
    if (data) {
      setAccumulatedLeads(data.leads);
      setNextCursor(data.nextCursor);
    }
  }, [data]);

  const kpis = useMemo(() => {
    return { total: accumulatedLeads.length };
  }, [accumulatedLeads]);

  function handleApply() {
    setAppliedState(listState);
    setAccumulatedLeads([]);
    setNextCursor(null);
    mutate();
  }

  const openLead = useCallback(
    (uuid: string) => {
      router.push(
        { pathname: '/deal-awaiting', query: { ...router.query, selected: uuid } },
        undefined,
        { shallow: true },
      );
    },
    [router],
  );

  const closePanel = useCallback(() => {
    const nextQuery = { ...router.query };
    delete nextQuery.selected;
    router.push({ pathname: '/deal-awaiting', query: nextQuery }, undefined, { shallow: true });
  }, [router]);

  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    setLoadingMore(true);

    const moreQuery = buildQueryFromLeadListState(withDealAwaitingFilter(appliedState), {
      cursor: nextCursor,
    });

    const res = await fetch(`/api/leads${moreQuery}`);
    const json = await res.json();

    if (res.ok) {
      setAccumulatedLeads((prev) => [...prev, ...json.data.leads]);
      setNextCursor(json.data.nextCursor);
    }

    setLoadingMore(false);
  }, [nextCursor, appliedState]);

  if (!user) return null;

  return (
    <AppShell title={t('leads.dealAwaiting')} count={kpis.total || undefined}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label={t('leads.dealAwaitingTotal')}
          value={kpis.total}
          variant="red"
          sub={t('leads.dealAwaitingSub')}
        />
      </div>

      <div className="mt-4">
        <LeadListToolbar
          state={listState}
          onChange={setListState}
          onApply={handleApply}
          salespeople={salespeople}
          isManager={isManagerOrAbove(user.role)}
          hiddenFields={new Set(['deal_awaiting'])}
        />
      </div>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-[58px] w-full" />
          <Skeleton className="h-[58px] w-full" />
          <Skeleton className="h-[58px] w-full" />
        </div>
      )}
      {error && <p className="text-sm text-brand-red">{t('leads.failedToLoad')}</p>}

      {!isLoading && (
        <LeadTable
          leads={accumulatedLeads}
          selectedId={selectedLeadId ?? undefined}
          onRowClick={openLead}
          renderRowActions={(lead) => renderRowActions(lead, mutate)}
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
        isManager={isManagerOrAbove(user.role)}
        salespeople={salespeople}
      />
      {rowActionDialogs}
    </AppShell>
  );
}
