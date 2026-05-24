/**
 * Lead list page — filters, sort, search, and cursor pagination.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { IconPlus } from '@tabler/icons-react';
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
import { isManagerOrAbove } from '@/lib/auth/roles';
import { useLeads } from '@/hooks/useLeads';
import { useSalespeople } from '@/hooks/useSalespeople';
import { buildQueryFromLeadListState } from '@/lib/ui/lead-list-query';
import type { LeadRow } from '@/types/domain';

/**
 * Reads selected lead UUID from router query.
 * @param query - Next.js router query object.
 * @returns Selected lead UUID or null.
 */
function selectedLeadFromQuery(
  query: Record<string, string | string[] | undefined>,
): string | null {
  const selected = query.selected;
  if (typeof selected === 'string' && selected.length > 0) return selected;
  return null;
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

  const selectedLeadId = router.isReady ? selectedLeadFromQuery(router.query) : null;
  const panelOpen = selectedLeadId !== null;

  const queryString = buildQueryFromLeadListState(appliedState);

  const { data, error, isLoading, mutate } = useLeads(queryString);

  useEffect(() => {
    if (data) {
      setAccumulatedLeads(data.leads);
      setNextCursor(data.nextCursor);
    }
  }, [data]);

  const kpis = useMemo(() => {
    const active = accumulatedLeads.length;
    const breached = accumulatedLeads.filter((l) => l.sla_status === 'breached').length;
    const atRisk = accumulatedLeads.filter((l) => l.sla_status === 'at_risk').length;
    const onTime = accumulatedLeads.filter((l) => l.sla_status === 'on_time').length;
    return { active, breached, atRisk, onTime };
  }, [accumulatedLeads]);

  function handleApply() {
    setAppliedState(listState);
    setAccumulatedLeads([]);
    setNextCursor(null);
    mutate();
  }

  const openLead = useCallback(
    (uuid: string) => {
      router.push({ pathname: '/leads', query: { ...router.query, selected: uuid } }, undefined, {
        shallow: true,
      });
    },
    [router],
  );

  const closePanel = useCallback(() => {
    const nextQuery = { ...router.query };
    delete nextQuery.selected;
    router.push({ pathname: '/leads', query: nextQuery }, undefined, { shallow: true });
  }, [router]);

  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    setLoadingMore(true);

    const moreQuery = buildQueryFromLeadListState(appliedState, { cursor: nextCursor });

    const res = await fetch(`/api/leads${moreQuery}`);
    const json = await res.json();

    if (res.ok) {
      setAccumulatedLeads((prev) => [...prev, ...json.data.leads]);
      setNextCursor(json.data.nextCursor);
    }

    setLoadingMore(false);
  }, [nextCursor, appliedState]);

  return (
    <AppShell
      title="Leads"
      count={accumulatedLeads.length || undefined}
      actions={
        <Button asChild>
          <Link href="/leads/new">
            <IconPlus size={16} />
            Add lead
          </Link>
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Active leads" value={kpis.active} variant="blue" sub="Current page" />
        <KpiCard label="SLA breached" value={kpis.breached} variant="red" sub="Needs attention" />
        <KpiCard
          label="At risk"
          value={kpis.atRisk}
          variant="neutral"
          valueClassName="text-[var(--badge-warning-text)]"
        />
        <KpiCard
          label="On time"
          value={kpis.onTime}
          variant="neutral"
          valueClassName="text-[var(--badge-success-text)]"
        />
      </div>

      <div className="mt-4">
        <LeadListToolbar
          state={listState}
          onChange={setListState}
          onApply={handleApply}
          salespeople={salespeople}
          isManager={isManagerOrAbove(user?.role)}
        />
      </div>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-[58px] w-full" />
          <Skeleton className="h-[58px] w-full" />
          <Skeleton className="h-[58px] w-full" />
        </div>
      )}
      {error && <p className="text-sm text-brand-red">Failed to load leads</p>}

      {!isLoading && (
        <LeadTable
          leads={accumulatedLeads}
          selectedId={selectedLeadId ?? undefined}
          onRowClick={openLead}
        />
      )}

      {nextCursor && (
        <div className="mt-4 flex justify-center">
          <Button type="button" variant="secondary" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading...' : 'Load more'}
          </Button>
        </div>
      )}

      <LeadDetailPanel
        leadId={selectedLeadId}
        open={panelOpen}
        onClose={closePanel}
        isManager={isManagerOrAbove(user?.role)}
        salespeople={salespeople}
      />
    </AppShell>
  );
}
