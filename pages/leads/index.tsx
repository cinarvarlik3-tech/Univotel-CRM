/**
 * Lead list page — filters, sort, search, and cursor pagination.
 */
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AppShell } from '@/components/layout/AppShell';
import {
  DEFAULT_LEAD_LIST_STATE,
  LeadListToolbar,
  type LeadListFilterState,
} from '@/components/leads/LeadListToolbar';
import { LeadTable } from '@/components/leads/LeadTable';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useLeads } from '@/hooks/useLeads';
import { useSalespeople } from '@/hooks/useSalespeople';
import { buildLeadsQueryString } from '@/lib/ui/build-leads-query-string';
import type { LeadRow } from '@/types/domain';

/**
 * Builds query string from applied list filter state.
 * @param state - Applied filter state.
 * @param cursor - Optional pagination cursor.
 * @returns Query string for GET /api/leads.
 */
function buildQueryFromState(state: LeadListFilterState, cursor?: string) {
  const dateFilters = [];

  if (state.createdFrom || state.createdTo) {
    dateFilters.push({
      field: 'created_at',
      from: state.createdFrom ? `${state.createdFrom}T00:00:00Z` : undefined,
      to: state.createdTo ? `${state.createdTo}T23:59:59Z` : undefined,
    });
  }

  if (state.slaFrom || state.slaTo) {
    dateFilters.push({
      field: 'sla_deadline',
      from: state.slaFrom ? `${state.slaFrom}T00:00:00Z` : undefined,
      to: state.slaTo ? `${state.slaTo}T23:59:59Z` : undefined,
    });
  }

  return buildLeadsQueryString({
    sort: state.sort,
    search: state.search,
    fuzzy: state.fuzzy,
    filters: state.filters,
    dateFilters,
    scoreMin: state.scoreMin || undefined,
    cursor,
  });
}

/**
 * Renders paginated lead list with filters and load-more.
 * @returns Lead list page wrapped in AppShell.
 */
export default function LeadsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: salespeople } = useSalespeople();

  const [listState, setListState] = useState<LeadListFilterState>(DEFAULT_LEAD_LIST_STATE);
  const [appliedState, setAppliedState] = useState<LeadListFilterState>(DEFAULT_LEAD_LIST_STATE);
  const [accumulatedLeads, setAccumulatedLeads] = useState<LeadRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const queryString = buildQueryFromState(appliedState);

  const { data, error, isLoading, mutate } = useLeads(queryString);

  useEffect(() => {
    if (data) {
      setAccumulatedLeads(data.leads);
      setNextCursor(data.nextCursor);
    }
  }, [data]);

  function handleApply() {
    setAppliedState(listState);
    setAccumulatedLeads([]);
    setNextCursor(null);
    mutate();
  }

  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    setLoadingMore(true);

    const moreQuery = buildQueryFromState(appliedState, nextCursor);

    const res = await fetch(`/api/leads${moreQuery}`);
    const json = await res.json();

    if (res.ok) {
      setAccumulatedLeads((prev) => [...prev, ...json.data.leads]);
      setNextCursor(json.data.nextCursor);
    }

    setLoadingMore(false);
  }, [nextCursor, appliedState]);

  return (
    <AppShell>
      <h1>Leads</h1>

      <LeadListToolbar
        state={listState}
        onChange={setListState}
        onApply={handleApply}
        salespeople={salespeople}
        isManager={user?.role === 'manager'}
      />

      {isLoading && <p>Loading...</p>}
      {error && <p className="error">Failed to load leads</p>}

      <LeadTable
        leads={accumulatedLeads}
        onRowClick={(uuid) => router.push(`/leads/${uuid}`)}
      />

      {nextCursor && (
        <Button type="button" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? 'Loading...' : 'Load more'}
        </Button>
      )}
    </AppShell>
  );
}
