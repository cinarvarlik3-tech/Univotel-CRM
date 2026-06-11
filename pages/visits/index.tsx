/**
 * Visit Calendar — list of scheduled, attended, and failed property visits.
 */
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useProperties } from '@/hooks/useProperties';
import { useTranslation } from '@/hooks/useTranslation';
import { isManagerOrAbove } from '@/lib/auth/roles';

type VisitStatus = 'scheduled' | 'attended' | 'failed';

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
    funnel_status: string;
    assigned_to: string | null;
  } | null;
}

export default function VisitCalendarPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: properties } = useProperties();

  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [propertyFilter, setPropertyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<VisitStatus | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const isManager = user ? isManagerOrAbove(user.role) : false;

  async function fetchVisits() {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (propertyFilter) params.set('property_id', propertyFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);

    const qs = params.toString();
    const res = await fetch(`/api/visits${qs ? `?${qs}` : ''}`);
    const json = await res.json();

    setLoading(false);

    if (res.ok) {
      setVisits(json.data ?? []);
    } else {
      setError(json.error ?? t('leads.failedToLoad'));
    }
  }

  useEffect(() => {
    if (user) void fetchVisits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleMarkStatus(id: string, status: 'attended' | 'failed') {
    setUpdatingId(id);
    const res = await fetch(`/api/visits/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setUpdatingId(null);
    if (res.ok) void fetchVisits();
  }

  function statusBadgeClass(status: VisitStatus) {
    if (status === 'attended')
      return 'bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]';
    if (status === 'failed') return 'bg-[var(--badge-danger-bg)] text-[var(--badge-danger-text)]';
    return 'bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-text)]';
  }

  function statusLabel(status: VisitStatus) {
    if (status === 'attended') return t('visits.statusAttended');
    if (status === 'failed') return t('visits.statusFailed');
    return t('visits.statusScheduled');
  }

  if (!user) return null;

  return (
    <AppShell title={t('visitCalendar.title')} count={visits.length || undefined}>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
        >
          <option value="">{t('visits.noProperty')}</option>
          {properties?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.hotel_name}
            </option>
          ))}
        </select>

        <select
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as VisitStatus | '')}
        >
          <option value="">{t('common.all')}</option>
          <option value="scheduled">{t('visits.statusScheduled')}</option>
          <option value="attended">{t('visits.statusAttended')}</option>
          <option value="failed">{t('visits.statusFailed')}</option>
        </select>

        <input
          type="date"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <span className="self-center text-sm text-text-muted">→</span>
        <input
          type="date"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />

        <Button
          type="button"
          variant="secondary"
          onClick={() => void fetchVisits()}
          disabled={loading}
        >
          {t('common.apply')}
        </Button>
      </div>

      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      )}

      {error && <p className="text-sm text-brand-red">{error}</p>}

      {!loading && visits.length === 0 && (
        <p className="text-sm text-text-muted">{t('visitCalendar.noVisits')}</p>
      )}

      {!loading && visits.length > 0 && (
        <div className="space-y-2">
          {visits.map((visit) => (
            <div
              key={visit.id}
              className="flex items-center justify-between rounded-lg border border-border bg-surface p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {visit.leads?.lead_name ?? visit.lead_uuid}
                </p>
                <p className="text-xs text-text-muted">
                  {new Date(visit.scheduled_date).toLocaleString()}
                  {visit.notes && ` · ${visit.notes}`}
                </p>
              </div>

              <div className="ml-3 flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(visit.status)}`}
                >
                  {statusLabel(visit.status)}
                </span>

                {visit.status === 'scheduled' &&
                  (isManager || visit.leads?.assigned_to === user?.userId) && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => void handleMarkStatus(visit.id, 'attended')}
                        disabled={updatingId === visit.id}
                      >
                        {t('visits.markAttended')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => void handleMarkStatus(visit.id, 'failed')}
                        disabled={updatingId === visit.id}
                      >
                        {t('visits.markFailed')}
                      </Button>
                    </>
                  )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
