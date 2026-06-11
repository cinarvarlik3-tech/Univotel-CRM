/**
 * Modal dialog for scheduling a property visit.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useProperties } from '@/hooks/useProperties';
import { useTranslation } from '@/hooks/useTranslation';

interface VisitScheduleDialogProps {
  open: boolean;
  leadUuid: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function VisitScheduleDialog({
  open,
  leadUuid,
  onClose,
  onSuccess,
}: VisitScheduleDialogProps) {
  const { t } = useTranslation();
  const { data: properties } = useProperties();

  const [scheduledDate, setScheduledDate] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!scheduledDate) return;

    setSaving(true);
    setError(null);

    const res = await fetch('/api/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_uuid: leadUuid,
        property_id: propertyId || null,
        scheduled_date: scheduledDate,
        notes: notes || null,
      }),
    });

    setSaving(false);

    if (res.ok) {
      setScheduledDate('');
      setPropertyId('');
      setNotes('');
      onSuccess();
      onClose();
    } else {
      const json = await res.json();
      setError(json.error ?? t('visits.scheduleFailed'));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('visits.scheduleTitle')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              {t('visits.scheduledDate')}
            </label>
            <input
              type="datetime-local"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              {t('visits.property')}
            </label>
            <select
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
            >
              <option value="">{t('visits.noProperty')}</option>
              {properties?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.hotel_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              {t('visits.notes')}
            </label>
            <textarea
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <p className="text-xs text-brand-red">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving || !scheduledDate}>
              {saving ? t('common.saving') : t('visits.schedule')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
