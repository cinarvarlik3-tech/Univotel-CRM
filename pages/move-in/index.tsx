/**
 * Move-in Calendar — leads with scheduled move-in dates rendered as a full
 * Month / Week / Day / List calendar. Move-ins are all-day events; dragging a
 * pending move-in to a new day updates the lead's expected `move_in` date
 * (after a confirmation) so the change propagates globally.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { AppShell } from '@/components/layout/AppShell';
import { LeadDetailPanel } from '@/components/leads/LeadDetailPanel';
import { CalendarBoard } from '@/components/calendar';
import type { CalendarEvent, CalendarFilterGroup } from '@/components/calendar';
import { useAuth } from '@/hooks/useAuth';
import { useSalespeople } from '@/hooks/useSalespeople';
import { useTranslation } from '@/hooks/useTranslation';
import { isManagerOrAbove } from '@/lib/auth/roles';
import type { LeadRow } from '@/types/domain';

interface MoveInLead extends LeadRow {
  lead_details?: Record<string, unknown> | null;
}

/** Reads the `selected` lead UUID from the router query, if present. */
function selectedLeadFromQuery(
  query: Record<string, string | string[] | undefined>,
): string | null {
  const selected = query.selected;
  if (typeof selected === 'string' && selected.length > 0) return selected;
  return null;
}

/** Parses a 'YYYY-MM-DD' (or ISO) string into a local-midnight Date. */
function parseDateOnly(value: string): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Returns the `move_in` string for a lead, if any. */
function moveInDateOf(lead: MoveInLead): string | undefined {
  return (lead.lead_details as Record<string, unknown> | null)?.move_in as string | undefined;
}

export default function MoveInCalendarPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: salespeople } = useSalespeople();

  const [leads, setLeads] = useState<MoveInLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedLeadId = router.isReady ? selectedLeadFromQuery(router.query) : null;
  const panelOpen = selectedLeadId !== null;
  const isManager = user ? isManagerOrAbove(user.role) : false;

  /** Builds the leads list query string for the move-in calendar. */
  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    params.set('limit', '200');
    params.set('sort', 'move_in');
    params.set('show_all', '1');
    if (!isManager) params.set('mine', '1');
    params.set('filter[move_in_date_set][eq]', 'true');
    return `?${params.toString()}`;
  }, [isManager]);

  const fetchLeads = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/leads${buildQuery()}`);
    const json = await res.json();
    setLoading(false);

    if (res.ok) {
      setLeads(json.data?.leads ?? []);
    } else {
      setError(json.error ?? t('leads.failedToLoad'));
    }
  }, [user, buildQuery, t]);

  useEffect(() => {
    void fetchLeads();
  }, [fetchLeads]);

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

  /** Maps move-in leads into all-day calendar events. */
  const events = useMemo<CalendarEvent[]>(() => {
    return leads.flatMap((lead) => {
      const moveIn = moveInDateOf(lead);
      const start = moveIn ? parseDateOnly(moveIn) : null;
      if (!start) return [];

      const movedIn = Boolean(lead.has_moved_in);
      const actual = (lead.lead_details as Record<string, unknown> | null)?.actual_move_in_date as
        | string
        | undefined;

      return [
        {
          id: lead.uuid,
          leadUuid: lead.uuid,
          title: lead.lead_name ?? lead.lead_phone ?? '—',
          subtitle: actual ? `${t('moveInCalendar.actualMoveInDate')}: ${actual}` : null,
          start,
          allDay: true,
          accent: movedIn ? 'green' : 'blue',
          draggable: !movedIn,
          filterValues: { status: movedIn ? 'moved_in' : 'pending' },
          badges: [
            movedIn
              ? { label: t('moveInCalendar.movedInBadge'), variant: 'success' as const }
              : { label: t('moveInCalendar.pendingBadge'), variant: 'secondary' as const },
          ],
        },
      ];
    });
  }, [leads, t]);

  const filterGroups = useMemo<CalendarFilterGroup[]>(
    () => [
      {
        key: 'status',
        label: t('moveInCalendar.filterStatus'),
        options: [
          { value: 'pending', label: t('moveInCalendar.pendingBadge') },
          { value: 'moved_in', label: t('moveInCalendar.movedInBadge') },
        ],
      },
    ],
    [t],
  );

  /** Persists a dragged move-in date to the lead, then syncs local state. */
  const handleReschedule = useCallback(
    async (event: CalendarEvent, newStart: Date): Promise<boolean> => {
      if (!event.leadUuid) return false;
      const dateStr = format(newStart, 'yyyy-MM-dd');

      const res = await fetch(`/api/lead-details/${event.leadUuid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ move_in: dateStr }),
      });
      if (!res.ok) return false;

      setLeads((prev) =>
        prev.map((lead) =>
          lead.uuid === event.leadUuid
            ? { ...lead, lead_details: { ...(lead.lead_details ?? {}), move_in: dateStr } }
            : lead,
        ),
      );
      return true;
    },
    [],
  );

  if (!user) return null;

  return (
    <AppShell title={t('moveInCalendar.title')} count={events.length || undefined}>
      {error && <p className="mb-3 text-sm text-brand-red">{error}</p>}

      <CalendarBoard
        events={events}
        loading={loading}
        filterGroups={filterGroups}
        searchPlaceholder={t('moveInCalendar.searchPlaceholder')}
        emptyMessage={t('moveInCalendar.noLeads')}
        onEventClick={(event) => event.leadUuid && openLead(event.leadUuid)}
        onReschedule={handleReschedule}
      />

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
