/**
 * Form for updating funnel status and loss reason on a lead.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { FUNNEL_STATUSES, LOSS_REASONS } from '@/lib/constants';
import type { LeadWithDetails } from '@/types/domain';

interface LeadStatusFormProps {
  lead: LeadWithDetails;
  leadId: string;
  onSaved: () => void;
}

/**
 * Renders funnel status update form with loss reason when status is terminal.
 * @param props - Lead data and save callback.
 * @returns Status form card.
 */
export function LeadStatusForm({ lead, leadId, onSaved }: LeadStatusFormProps) {
  const [funnelStatus, setFunnelStatus] = useState(lead.funnel_status);
  const [lossReason, setLossReason] = useState(lead.loss_reason ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleStatusUpdate() {
    if (funnelStatus === 'ziyaret-ama-almayacak' && !lossReason) {
      setError('Loss reason is required when status is ziyaret-ama-almayacak');
      return;
    }

    setSaving(true);
    setError('');

    const body: Record<string, string> = { funnel_status: funnelStatus };
    if (funnelStatus === 'ziyaret-ama-almayacak') {
      body.loss_reason = lossReason;
    }

    const res = await fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(json.error ?? 'Update failed');
      return;
    }

    onSaved();
  }

  return (
    <div className="card">
      <h3>Update status</h3>
      <Select
        label="Funnel status"
        id="funnel_status"
        value={funnelStatus}
        onChange={(e) => setFunnelStatus(e.target.value)}
      >
        {FUNNEL_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>
      {funnelStatus === 'ziyaret-ama-almayacak' && (
        <Select
          label="Loss reason *"
          id="loss_reason"
          value={lossReason}
          onChange={(e) => setLossReason(e.target.value)}
          required
        >
          <option value="">Select reason...</option>
          {LOSS_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      )}
      {error && <p className="error">{error}</p>}
      <Button type="button" onClick={handleStatusUpdate} disabled={saving}>
        {saving ? 'Saving...' : 'Save status'}
      </Button>
    </div>
  );
}
