/**
 * My Leads page — assigned leads only for the signed-in salesperson.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconLayoutColumns,
  IconLayoutGrid,
  IconList,
} from '@tabler/icons-react';
import { AppShell } from '@/components/layout/AppShell';
import { LeadDetailPanel } from '@/components/leads/LeadDetailPanel';
import {
  DEFAULT_LEAD_LIST_STATE,
  LeadListToolbar,
  type LeadListFilterState,
} from '@/components/leads/LeadListToolbar';
import { LeadTable } from '@/components/leads/LeadTable';
import { PipelineView } from '@/components/leads/PipelineView';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/ui/kpi-card';
import { TasksDueTodayKpiCard } from '@/components/leads/TasksDueTodayKpiCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { useLeads } from '@/hooks/useLeads';
import { useSalespeople } from '@/hooks/useSalespeople';
import { buildQueryFromLeadListState } from '@/lib/ui/lead-list-query';
import type { LeadRow } from '@/types/domain';

type ViewMode = 'list' | 'pipeline';
const VIEW_MODE_KEY = 'mine_leads_view_mode';

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
 * Renders paginated list of leads assigned to the current salesperson.
 * @returns My Leads page wrapped in AppShell.
 */
export default function MyLeadsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: salespeople } = useSalespeople();

  const [listState, setListState] = useState<LeadListFilterState>(DEFAULT_LEAD_LIST_STATE);
  const [appliedState, setAppliedState] = useState<LeadListFilterState>(DEFAULT_LEAD_LIST_STATE);
  const [accumulatedLeads, setAccumulatedLeads] = useState<LeadRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [compactPipeline, setCompactPipeline] = useState(false);
  const [compartmentMode, setCompartmentMode] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(VIEW_MODE_KEY);
    if (stored === 'pipeline' || stored === 'list') setViewMode(stored);
    const storedCompact = localStorage.getItem('pipeline_compact');
    if (storedCompact === 'true') setCompactPipeline(true);
  }, []);

  function toggleViewMode() {
    setViewMode((prev) => {
      const next: ViewMode = prev === 'list' ? 'pipeline' : 'list';
      localStorage.setItem(VIEW_MODE_KEY, next);
      return next;
    });
  }

  function toggleCompact() {
    setCompactPipeline((prev) => {
      const next = !prev;
      localStorage.setItem('pipeline_compact', String(next));
      return next;
    });
  }

  const [showAll, setShowAll] = useState(false);

  const selectedLeadId = router.isReady ? selectedLeadFromQuery(router.query) : null;
  const panelOpen = selectedLeadId !== null;
  const canFetch = Boolean(user);

  const queryString = canFetch
    ? buildQueryFromLeadListState(appliedState, { mine: true, showAll })
    : '';

  const { data, error, isLoading, mutate } = useLeads(canFetch ? queryString : null);

  useEffect(() => {
    if (data) {
      setAccumulatedLeads(data.leads);
      setNextCursor(data.nextCursor);
    }
  }, [data]);

  const kpis = useMemo(() => {
    const active = data?.totalCount ?? 0;
    const breached = data?.kpiCounts?.breached ?? 0;
    const onTime = data?.kpiCounts?.onTime ?? 0;
    return { active, breached, onTime };
  }, [data?.totalCount, data?.kpiCounts]);

  function handleApply() {
    setAppliedState(listState);
    setAccumulatedLeads([]);
    setNextCursor(null);
    mutate();
  }

  function toggleShowAll() {
    setShowAll((prev) => !prev);
    setAccumulatedLeads([]);
    setNextCursor(null);
  }

  const openLead = useCallback(
    (uuid: string) => {
      router.push(
        { pathname: '/leads/mine', query: { ...router.query, selected: uuid } },
        undefined,
        {
          shallow: true,
        },
      );
    },
    [router],
  );

  const closePanel = useCallback(() => {
    const nextQuery = { ...router.query };
    delete nextQuery.selected;
    router.push({ pathname: '/leads/mine', query: nextQuery }, undefined, { shallow: true });
  }, [router]);

  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    setLoadingMore(true);

    const moreQuery = buildQueryFromLeadListState(appliedState, {
      cursor: nextCursor,
      mine: true,
      showAll,
    });

    const res = await fetch(`/api/leads${moreQuery}`);
    const json = await res.json();

    if (res.ok) {
      setAccumulatedLeads((prev) => [...prev, ...json.data.leads]);
      setNextCursor(json.data.nextCursor);
    }

    setLoadingMore(false);
  }, [nextCursor, appliedState, showAll]);

  if (!user) {
    return null;
  }

  return (
    <AppShell
      title={t('leads.myLeads')}
      count={data?.totalCount ?? undefined}
      actions={
        <>
          <Button
            type="button"
            variant={showAll ? 'default' : 'secondary'}
            size="sm"
            onClick={toggleShowAll}
          >
            {showAll ? t('leads.showRelevantOnly') : t('leads.showAllLeads')}
          </Button>
          {viewMode === 'pipeline' && (
            <>
              <Button
                type="button"
                variant={compartmentMode ? 'default' : 'secondary'}
                size="icon"
                onClick={() => setCompartmentMode((p) => !p)}
                title={compartmentMode ? 'Stage view' : 'Compartment view'}
              >
                <IconLayoutGrid size={16} />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={toggleCompact}
                title={compactPipeline ? 'Normal görünüm' : 'Ekrana sığdır'}
              >
                {compactPipeline ? (
                  <IconArrowsMinimize size={16} />
                ) : (
                  <IconArrowsMaximize size={16} />
                )}
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={toggleViewMode}
            title={viewMode === 'list' ? 'Pipeline görünümü' : 'Liste görünümü'}
          >
            {viewMode === 'list' ? <IconLayoutColumns size={16} /> : <IconList size={16} />}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label={t('leads.myLeadsKpi')}
          value={kpis.active}
          variant="blue"
          sub={t('leads.totalMatching')}
        />
        <KpiCard
          label={t('leads.slaBreached')}
          value={kpis.breached}
          variant="red"
          sub={t('leads.needsAttention')}
        />
        <TasksDueTodayKpiCard mine assigneeId={user.userId} />
        <KpiCard
          label={t('leads.onTime')}
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
          isManager={isManagerOrAbove(user.role)}
        />
      </div>

      {viewMode === 'list' ? (
        <>
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
              hideAssignee
            />
          )}

          {nextCursor && (
            <div className="mt-4 flex justify-center">
              <Button type="button" variant="secondary" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? t('common.loading') : t('common.loadMore')}
              </Button>
            </div>
          )}
        </>
      ) : (
        <PipelineView
          appliedState={appliedState}
          mine
          compact={compactPipeline}
          compartmentMode={compartmentMode}
          selectedId={selectedLeadId}
          onLeadClick={openLead}
        />
      )}

      <LeadDetailPanel
        leadId={selectedLeadId}
        open={panelOpen}
        onClose={closePanel}
        isManager={isManagerOrAbove(user.role)}
        salespeople={salespeople}
      />
    </AppShell>
  );
}
