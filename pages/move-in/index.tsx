/**
 * Move-in Calendar — leads with scheduled move-in dates, sorted by move_in date.
 */
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AppShell } from '@/components/layout/AppShell';
import { LeadDetailPanel } from '@/components/leads/LeadDetailPanel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useSalespeople } from '@/hooks/useSalespeople';
import { useTranslation } from '@/hooks/useTranslation';
import { isManagerOrAbove } from '@/lib/auth/roles';
import type { LeadRow } from '@/types/domain';

interface MoveInLead extends LeadRow {
  lead_details?: Record<string, unknown> | null;
}

function selectedLeadFromQuery(
  query: Record<string, string | string[] | undefined>,
): string | null {
  const selected = query.selected;
  if (typeof selected === 'string' && selected.length > 0) return selected;
  return null;
}

export default function MoveInCalendarPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: salespeople } = useSalespeople();

  const [leads, setLeads] = useState<MoveInLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const selectedLeadId = router.isReady ? selectedLeadFromQuery(router.query) : null;
  const panelOpen = selectedLeadId !== null;
  const isManager = user ? isManagerOrAbove(user.role) : false;

  function buildQuery(cursor?: string) {
    const params = new URLSearchParams();
    params.set('limit', '50');
    params.set('sort', 'move_in');
    params.set('show_all', '1');
    if (!isManager) params.set('mine', '1');
    if (cursor) params.set('cursor', cursor);
    params.set('filter[move_in_date_set][eq]', 'true');
    return `?${params.toString()}`;
  }

  async function fetchLeads() {
    if (!user) return;
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/leads${buildQuery()}`);
    const json = await res.json();
    setLoading(false);

    if (res.ok) {
      setLeads(json.data?.leads ?? []);
      setNextCursor(json.data?.nextCursor ?? null);
    } else {
      setError(json.error ?? t('leads.failedToLoad'));
    }
  }

  useEffect(() => {
    void fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const openLead = useCallback(
    (uuid: string) => {
      router.push({ pathname: '/move-in', query: { ...router.query, selected: uuid } }, undefined, {
        shallow: true,
      });
    },
    [router],
  );

  const closePanel = useCallback(() => {
    const nextQuery = { ...router.query };
    delete nextQuery.selected;
    router.push({ pathname: '/move-in', query: nextQuery }, undefined, { shallow: true });
  }, [router]);

  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    setLoadingMore(true);

    const res = await fetch(`/api/leads${buildQuery(nextCursor)}`);
    const json = await res.json();
    setLoadingMore(false);

    if (res.ok) {
      setLeads((prev) => [...prev, ...(json.data?.leads ?? [])]);
      setNextCursor(json.data?.nextCursor ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextCursor, isManager]);

  if (!user) return null;

  return (
    <AppShell title={t('moveInCalendar.title')} count={leads.length || undefined}>
      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      )}

      {error && <p className="text-sm text-brand-red">{error}</p>}

      {!loading && leads.length === 0 && (
        <p className="text-sm text-text-muted">{t('moveInCalendar.noLeads')}</p>
      )}

      {!loading && leads.length > 0 && (
        <div className="space-y-2">
          {leads.map((lead) => {
            const moveInDate = (lead.lead_details as Record<string, unknown> | null)?.move_in as
              | string
              | null
              | undefined;
            const actualDate = (lead.lead_details as Record<string, unknown> | null)
              ?.actual_move_in_date as string | null | undefined;
            const movedIn = lead.has_moved_in;

            return (
              <button
                key={lead.uuid}
                type="button"
                className="flex w-full items-center justify-between rounded-lg border border-border bg-surface p-3 text-left hover:bg-surface-hover"
                onClick={() => openLead(lead.uuid)}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {lead.lead_name ?? lead.lead_phone}
                  </p>
                  <p className="text-xs text-text-muted">
                    {t('moveInCalendar.moveInDate')}: {moveInDate ?? '—'}
                    {actualDate && ` · ${t('moveInCalendar.actualMoveInDate')}: ${actualDate}`}
                  </p>
                </div>

                <div className="ml-3 flex items-center gap-2">
                  {movedIn ? (
                    <span className="rounded-full bg-[var(--badge-success-bg)] px-2 py-0.5 text-xs font-medium text-[var(--badge-success-text)]">
                      {t('moveInCalendar.movedInBadge')}
                    </span>
                  ) : (
                    <span className="rounded-full bg-[var(--badge-neutral-bg)] px-2 py-0.5 text-xs font-medium text-[var(--badge-neutral-text)]">
                      {t('moveInCalendar.pendingBadge')}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
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
