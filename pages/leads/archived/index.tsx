/**
 * Archived leads list page — manager-only.
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AppShell } from '@/components/layout/AppShell';
import {
  ArchivedLeadListToolbar,
  DEFAULT_ARCHIVED_LIST_STATE,
  type ArchivedLeadListFilterState,
} from '@/components/leads/ArchivedLeadListToolbar';
import { ArchivedLeadTable } from '@/components/leads/ArchivedLeadTable';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useArchivedLeads } from '@/hooks/useArchivedLeads';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { useSalespeople } from '@/hooks/useSalespeople';
import { buildArchivedLeadsQueryString } from '@/lib/ui/build-archived-leads-query-string';
import type { ArchivedLeadRow } from '@/types/domain';

/**
 * Builds query string from archived list filter state.
 * @param state - Applied filter state.
 * @param cursor - Optional pagination cursor.
 * @returns Query string for GET /api/leads/archived.
 */
function buildQueryFromState(state: ArchivedLeadListFilterState, cursor?: string) {
  return buildArchivedLeadsQueryString({
    search: state.search,
    fuzzy: state.fuzzy,
    archiveReason: state.archiveReason || undefined,
    leadSource: state.leadSource || undefined,
    assignedTo: state.assignedTo || undefined,
    archivedFrom: state.archivedFrom || undefined,
    archivedTo: state.archivedTo || undefined,
    cursor,
  });
}

/**
 * Renders paginated archived lead list with filters.
 * @returns Archived leads page wrapped in AppShell.
 */
export default function ArchivedLeadsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: salespeople } = useSalespeople();

  const [listState, setListState] = useState<ArchivedLeadListFilterState>(
    DEFAULT_ARCHIVED_LIST_STATE,
  );
  const [appliedState, setAppliedState] = useState<ArchivedLeadListFilterState>(
    DEFAULT_ARCHIVED_LIST_STATE,
  );
  const [accumulatedLeads, setAccumulatedLeads] = useState<ArchivedLeadRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const queryString = buildQueryFromState(appliedState);
  const { data, error, isLoading, mutate } = useArchivedLeads(
    queryString,
    isManagerOrAbove(user?.role),
  );

  useEffect(() => {
    if (user && !isManagerOrAbove(user.role)) {
      router.replace('/leads');
    }
  }, [user, router]);

  useEffect(() => {
    if (data) {
      setAccumulatedLeads(data.archivedLeads);
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
    const res = await fetch(`/api/leads/archived${moreQuery}`);
    const json = await res.json();

    if (res.ok) {
      setAccumulatedLeads((prev) => [...prev, ...json.data.archivedLeads]);
      setNextCursor(json.data.nextCursor);
    }

    setLoadingMore(false);
  }, [nextCursor, appliedState]);

  if (user && !isManagerOrAbove(user.role)) {
    return null;
  }

  return (
    <AppShell
      title={t('archived.title')}
      actions={
        <Link href="/leads" className="text-sm text-brand-blue hover:underline">
          {t('archived.backToActive')}
        </Link>
      }
    >
      <ArchivedLeadListToolbar
        state={listState}
        onChange={setListState}
        onApply={handleApply}
        salespeople={salespeople ?? []}
      />

      {isLoading && <Skeleton className="h-64 w-full" />}
      {error && <p className="text-sm text-brand-red">{t('archived.failedToLoad')}</p>}

      <ArchivedLeadTable
        leads={accumulatedLeads}
        onRowClick={(uuid) => router.push(`/leads/archived/${uuid}`)}
      />

      {nextCursor && (
        <div className="mt-4 flex justify-center">
          <Button type="button" variant="secondary" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? t('common.loading') : t('common.loadMore')}
          </Button>
        </div>
      )}
    </AppShell>
  );
}
