/**
 * Visit Calendar — scheduled / attended / failed property visits rendered as a
 * full Month / Week / Day / List calendar. Visits are timed events; dragging a
 * scheduled visit to a new slot updates its `scheduled_date` (after a
 * confirmation) so the change propagates globally.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { AppShell } from '@/components/layout/AppShell';
import { LeadDetailPanel } from '@/components/leads/LeadDetailPanel';
import { ScheduleVisitButton } from '@/components/leads/ScheduleVisitButton';
import { CalendarBoard } from '@/components/calendar';
import { VisitCalendarEventActions } from '@/components/calendar/VisitCalendarEventActions';
import type { VisitResultOutcome } from '@/components/modals/VisitResultModal';
import { useActionToast } from '@/hooks/useActionToast';
import type { CalendarAccent, CalendarEvent, CalendarFilterGroup } from '@/components/calendar';
import type { CalendarBadgeVariant } from '@/components/calendar';
import { useAuth } from '@/hooks/useAuth';
import { useProperties } from '@/hooks/useProperties';
import { useSalespeople } from '@/hooks/useSalespeople';
import { useTranslation } from '@/hooks/useTranslation';
import { isManagerOrAbove } from '@/lib/auth/roles';

type VisitStatus = 'scheduled' | 'attended' | 'failed';

interface VisitLeadDetails {
  room_type?: string[] | null;
}

interface Visit {
  id: string;
  lead_uuid: string;
  scheduled_date: string;
  status: VisitStatus;
  notes: string | null;
  property_id: string | null;
  leads: {
    uuid: string;
    lead_name: string | null;
    lead_phone: string | null;
    funnel_status: string;
    assigned_to: string | null;
    lead_details?: VisitLeadDetails | VisitLeadDetails[] | null;
  } | null;
}

/** Extracts joined room_type preferences as a display string. */
function roomPreferenceOf(lead: Visit['leads']): string | null {
  const raw = lead?.lead_details;
  if (!raw) return null;
  const details = Array.isArray(raw) ? raw[0] : raw;
  const types = details?.room_type;
  if (!types?.length) return null;
  return types.join(', ');
}

const STATUS_ACCENT: Record<VisitStatus, CalendarAccent> = {
  scheduled: 'blue',
  attended: 'green',
  failed: 'red',
};

const STATUS_BADGE: Record<VisitStatus, CalendarBadgeVariant> = {
  scheduled: 'visit',
  attended: 'success',
  failed: 'danger',
};

/** Reads the `selected` lead UUID from the router query, if present. */
function selectedLeadFromQuery(
  query: Record<string, string | string[] | undefined>,
): string | null {
  const selected = query.selected;
  if (typeof selected === 'string' && selected.length > 0) return selected;
  return null;
}

export default function VisitCalendarPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: properties } = useProperties();
  const { data: salespeople } = useSalespeople();

  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { show: showToast, node: toastNode } = useActionToast();

  const selectedLeadId = router.isReady ? selectedLeadFromQuery(router.query) : null;
  const panelOpen = selectedLeadId !== null;
  const isManager = user ? isManagerOrAbove(user.role) : false;

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/visits');
    const json = await res.json();
    setLoading(false);
    if (res.ok) setVisits(json.data ?? []);
    else setError(json.error ?? t('leads.failedToLoad'));
  }, [t]);

  useEffect(() => {
    if (user) void fetchVisits();
  }, [user, fetchVisits]);

  const openLead = useCallback(
    (uuid: string) => {
      router.push({ pathname: '/visits', query: { ...router.query, selected: uuid } }, undefined, {
        shallow: true,
      });
    },
    [router],
  );

  const closePanel = useCallback(() => {
    const nextQuery = { ...router.query };
    delete nextQuery.selected;
    router.push({ pathname: '/visits', query: nextQuery }, undefined, { shallow: true });
  }, [router]);

  /** Property id → hotel name lookup for subtitles and filters. */
  const propertyName = useMemo(() => {
    const map = new Map<string, string>();
    properties?.forEach((p) => map.set(p.id, p.hotel_name));
    return map;
  }, [properties]);

  /** Maps visits into timed calendar events. */
  const events = useMemo<CalendarEvent[]>(() => {
    return visits.map((visit) => {
      const property = visit.property_id ? propertyName.get(visit.property_id) : undefined;
      const subtitleParts = [property, visit.notes].filter(Boolean) as string[];
      const canDrag =
        visit.status === 'scheduled' && (isManager || visit.leads?.assigned_to === user?.userId);

      return {
        id: visit.id,
        leadUuid: visit.lead_uuid,
        title: visit.leads?.lead_name ?? visit.lead_uuid,
        subtitle: subtitleParts.length > 0 ? subtitleParts.join(' · ') : null,
        start: new Date(visit.scheduled_date),
        allDay: false,
        accent: STATUS_ACCENT[visit.status],
        draggable: canDrag,
        filterValues: { status: visit.status, property: visit.property_id ?? '' },
        badges: [
          { label: t(`visits.status${cap(visit.status)}`), variant: STATUS_BADGE[visit.status] },
        ],
        cardDetails: {
          phone: visit.leads?.lead_phone ?? null,
          roomPreference: roomPreferenceOf(visit.leads),
        },
        visitStatus: visit.status,
      };
    });
  }, [visits, propertyName, isManager, user?.userId, t]);

  const filterGroups = useMemo<CalendarFilterGroup[]>(() => {
    const groups: CalendarFilterGroup[] = [
      {
        key: 'status',
        label: t('visitCalendar.filterStatus'),
        options: [
          { value: 'scheduled', label: t('visits.statusScheduled') },
          { value: 'attended', label: t('visits.statusAttended') },
          { value: 'failed', label: t('visits.statusFailed') },
        ],
      },
    ];
    if (properties && properties.length > 0) {
      groups.push({
        key: 'property',
        label: t('visitCalendar.filterProperty'),
        options: properties.map((p) => ({ value: p.id, label: p.hotel_name })),
      });
    }
    return groups;
  }, [properties, t]);

  /** Persists a rescheduled visit datetime from the action popover. */
  const handleRescheduleIso = useCallback(
    async (event: CalendarEvent, newDateIso: string): Promise<boolean> => {
      const res = await fetch(`/api/visits/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_date: newDateIso }),
      });
      if (!res.ok) return false;

      setVisits((prev) =>
        prev.map((v) => (v.id === event.id ? { ...v, scheduled_date: newDateIso } : v)),
      );
      showToast(t('calendar.rescheduleDateUpdated'));
      return true;
    },
    [showToast, t],
  );

  const handleVisitResult = useCallback(
    (outcome: VisitResultOutcome) => {
      void fetchVisits();
      const labels: Record<VisitResultOutcome, string> = {
        decision_pending: t('actions.visitOutcomeDecision'),
        downpayment: t('actions.visitOutcomeDownpayment'),
        dropped: t('actions.visitOutcomeDropped'),
      };
      showToast(`${t('actions.visitResultRecorded')} — ${labels[outcome]}`);
    },
    [fetchVisits, showToast, t],
  );

  const renderEventActions = useCallback(
    (event: CalendarEvent) => (
      <VisitCalendarEventActions
        event={event}
        onReschedule={handleRescheduleIso}
        onResultSuccess={handleVisitResult}
      />
    ),
    [handleRescheduleIso, handleVisitResult],
  );

  /** Persists a dragged visit's new datetime, then syncs local state. */
  const handleReschedule = useCallback(
    async (event: CalendarEvent, newStart: Date): Promise<boolean> => {
      const res = await fetch(`/api/visits/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_date: newStart.toISOString() }),
      });
      if (!res.ok) return false;

      setVisits((prev) =>
        prev.map((v) => (v.id === event.id ? { ...v, scheduled_date: newStart.toISOString() } : v)),
      );
      return true;
    },
    [],
  );

  if (!user) return null;

  return (
    <AppShell title={t('visitCalendar.title')} count={events.length || undefined}>
      {toastNode}
      {error && <p className="mb-3 text-sm text-brand-red">{error}</p>}

      <CalendarBoard
        events={events}
        loading={loading}
        defaultView="week"
        eventStyle="card"
        filterGroups={filterGroups}
        searchPlaceholder={t('calendar.searchPlaceholder')}
        emptyMessage={t('visitCalendar.noVisits')}
        actions={<ScheduleVisitButton onScheduled={fetchVisits} />}
        onEventClick={(event) => event.leadUuid && openLead(event.leadUuid)}
        onReschedule={handleReschedule}
        renderEventActions={renderEventActions}
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

/** Capitalizes the first letter (for building `visits.statusXxx` keys). */
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
