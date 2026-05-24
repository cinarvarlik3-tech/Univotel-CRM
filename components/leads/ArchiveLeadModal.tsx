/**
 * Manual archive modal for manager lead actions.
 */
import { useState } from 'react';
import { ARCHIVE_REASONS, MANUAL_LOSS_REASONS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormSelect } from '@/components/ui/form-select';

interface ArchiveLeadModalProps {
  leadId: string;
  open: boolean;
  onClose: () => void;
  onArchived: (uuid: string) => void;
}

/**
 * Modal form for manual lead archive with outcome and loss reason.
 * @param props - Lead id, visibility, and callbacks.
 * @returns Dialog modal element.
 */
export function ArchiveLeadModal({ leadId, open, onClose, onArchived }: ArchiveLeadModalProps) {
  const [archiveReason, setArchiveReason] = useState<(typeof ARCHIVE_REASONS)[number]>('won');
  const [lossReason, setLossReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (archiveReason === 'lost' && !lossReason) {
      setError('Loss reason is required when outcome is Lost');
      return;
    }

    setSaving(true);
    setError('');

    const body: Record<string, string> = { archive_reason: archiveReason };
    if (archiveReason === 'lost') body.loss_reason = lossReason;

    const res = await fetch(`/api/leads/${leadId}/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(json.error ?? 'Archive failed');
      return;
    }

    onArchived(leadId);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archive lead</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <FormSelect
            label="Outcome"
            id="archive_reason"
            value={archiveReason}
            onValueChange={(v) => setArchiveReason(v as (typeof ARCHIVE_REASONS)[number])}
            options={[
              { value: 'won', label: 'Won' },
              { value: 'lost', label: 'Lost' },
            ]}
          />
          {archiveReason === 'lost' && (
            <FormSelect
              label="Loss reason"
              id="archive_loss_reason"
              value={lossReason}
              onValueChange={setLossReason}
              placeholder="Select..."
              options={MANUAL_LOSS_REASONS.map((reason) => ({ value: reason, label: reason }))}
            />
          )}
          {error && <p className="text-xs text-brand-red">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Archiving...' : 'Archive'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
