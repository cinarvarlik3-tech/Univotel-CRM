/**
 * Old leads list page — filters, sort, search, and cursor pagination.
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AppShell } from '@/components/layout/AppShell';
import {
  DEFAULT_OLD_LEAD_LIST_STATE,
  OldLeadListToolbar,
  type OldLeadListFilterState,
} from '@/components/leads/OldLeadListToolbar';
import { OldLeadDetailPanel } from '@/components/leads/OldLeadDetailPanel';
import { OldLeadTable } from '@/components/leads/OldLeadTable';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { useOldLeads } from '@/hooks/useOldLeads';
import { useSalespeople } from '@/hooks/useSalespeople';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { buildQueryFromOldLeadListState } from '@/lib/ui/old-lead-list-query';
import type { OldLeadRow } from '@/types/domain';

/**
 * Renders paginated old leads list with filters.
 * @returns Old leads page wrapped in AppShell.
 */
export default function OldLeadsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: salespeople } = useSalespeople();

  const [listState, setListState] = useState<OldLeadListFilterState>(DEFAULT_OLD_LEAD_LIST_STATE);
  const [appliedState, setAppliedState] = useState<OldLeadListFilterState>(
    DEFAULT_OLD_LEAD_LIST_STATE,
  );
  const [accumulatedLeads, setAccumulatedLeads] = useState<OldLeadRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasLoadedMore, setHasLoadedMore] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const canAccess = isManagerOrAbove(user?.role);
  const queryString = buildQueryFromOldLeadListState(appliedState);
  const { data, error, isLoading, mutate } = useOldLeads(queryString, canAccess);

  useEffect(() => {
    if (user && !canAccess) {
      router.replace('/leads');
    }
  }, [user, canAccess, router]);

  useEffect(() => {
    if (data && !hasLoadedMore) {
      setAccumulatedLeads(data.oldLeads);
      setNextCursor(data.nextCursor);
    }
  }, [data, hasLoadedMore]);

  function handleApply() {
    setHasLoadedMore(false);
    setAppliedState(listState);
    setAccumulatedLeads([]);
    setNextCursor(null);
    mutate();
  }

  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    setLoadingMore(true);

    const moreQuery = buildQueryFromOldLeadListState(appliedState, { cursor: nextCursor });
    const res = await fetch(`/api/old-leads${moreQuery}`);
    const json = await res.json();

    if (res.ok) {
      const page = json.data.oldLeads as OldLeadRow[];
      setHasLoadedMore(true);
      setAccumulatedLeads((prev) => {
        const seen = new Set(prev.map((lead) => lead.uuid));
        const unique = page.filter((lead) => !seen.has(lead.uuid));
        return [...prev, ...unique];
      });
      setNextCursor(json.data.nextCursor);
    }

    setLoadingMore(false);
  }, [nextCursor, appliedState]);

  function openLead(uuid: string) {
    setSelectedLeadId(uuid);
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
    setSelectedLeadId(null);
  }

  if (user && !canAccess) {
    return null;
  }

  return (
    <AppShell
      title={t('oldLeads.title')}
      count={accumulatedLeads.length || undefined}
      actions={
        <Link href="/leads" className="text-sm text-brand-blue hover:underline">
          {t('oldLeads.backToActive')}
        </Link>
      }
    >
      <p className="mb-4 text-sm text-text-secondary">{t('oldLeads.description')}</p>

      <OldLeadListToolbar
        state={listState}
        onChange={setListState}
        onApply={handleApply}
        salespeople={salespeople}
      />

      {isLoading && <Skeleton className="h-64 w-full" />}
      {error && <p className="text-sm text-brand-red">{t('oldLeads.failedToLoad')}</p>}

      {!isLoading && (
        <OldLeadTable
          leads={accumulatedLeads}
          selectedId={selectedLeadId ?? undefined}
          onRowClick={openLead}
        />
      )}

      {nextCursor && (
        <div className="mt-4 flex justify-center">
          <Button type="button" variant="secondary" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? t('common.loading') : t('common.loadMore')}
          </Button>
        </div>
      )}

      <OldLeadDetailPanel leadId={selectedLeadId} open={panelOpen} onClose={closePanel} />
    </AppShell>
  );
}
