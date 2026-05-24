/**
 * Old leads list page — historical Chatwoot imports, manager/superadmin only.
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
import { OldLeadTable } from '@/components/leads/OldLeadTable';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useOldLeads } from '@/hooks/useOldLeads';
import { isManagerOrAbove } from '@/lib/auth/roles';
import { buildOldLeadsQueryString } from '@/lib/ui/build-old-leads-query-string';
import type { OldLeadRow } from '@/types/domain';

/**
 * Builds query string from old lead list filter state.
 * @param state - Applied filter state.
 * @param cursor - Optional pagination cursor.
 * @returns Query string for GET /api/old-leads.
 */
function buildQueryFromState(state: OldLeadListFilterState, cursor?: string) {
  return buildOldLeadsQueryString({
    search: state.search,
    leadSource: state.leadSource || undefined,
    messageFrom: state.messageFrom || undefined,
    cursor,
  });
}

/**
 * Renders paginated old leads list with filters.
 * @returns Old leads page wrapped in AppShell.
 */
export default function OldLeadsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [listState, setListState] = useState<OldLeadListFilterState>(DEFAULT_OLD_LEAD_LIST_STATE);
  const [appliedState, setAppliedState] = useState<OldLeadListFilterState>(
    DEFAULT_OLD_LEAD_LIST_STATE,
  );
  const [accumulatedLeads, setAccumulatedLeads] = useState<OldLeadRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const canAccess = isManagerOrAbove(user?.role);
  const queryString = buildQueryFromState(appliedState);
  const { data, error, isLoading, mutate } = useOldLeads(queryString, canAccess);

  useEffect(() => {
    if (user && !canAccess) {
      router.replace('/leads');
    }
  }, [user, canAccess, router]);

  useEffect(() => {
    if (data) {
      setAccumulatedLeads(data.oldLeads);
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
    const res = await fetch(`/api/old-leads${moreQuery}`);
    const json = await res.json();

    if (res.ok) {
      setAccumulatedLeads((prev) => [...prev, ...json.data.oldLeads]);
      setNextCursor(json.data.nextCursor);
    }

    setLoadingMore(false);
  }, [nextCursor, appliedState]);

  if (user && !canAccess) {
    return null;
  }

  return (
    <AppShell
      title="Old leads"
      count={accumulatedLeads.length || undefined}
      actions={
        <Link href="/leads" className="text-sm text-brand-blue hover:underline">
          Back to active leads
        </Link>
      }
    >
      <p className="mb-4 text-sm text-text-secondary">
        Historical leads imported from Chatwoot. Read-only archive separate from the active
        pipeline.
      </p>

      <OldLeadListToolbar state={listState} onChange={setListState} onApply={handleApply} />

      {isLoading && <Skeleton className="h-64 w-full" />}
      {error && <p className="text-sm text-brand-red">Failed to load old leads</p>}

      {!isLoading && <OldLeadTable leads={accumulatedLeads} />}

      {nextCursor && (
        <div className="mt-4 flex justify-center">
          <Button type="button" variant="secondary" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading...' : 'Load more'}
          </Button>
        </div>
      )}
    </AppShell>
  );
}
