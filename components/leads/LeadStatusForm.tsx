/**
 * Form for updating funnel status and loss reason on a lead.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormSelect } from '@/components/ui/form-select';
import { FUNNEL_STATUSES, LOSS_REASONS } from '@/lib/constants';
import type { LeadWithDetails } from '@/types/domain';

interface LeadStatusFormProps {
  lead: LeadWithDetails;
  leadId: string;
  onSaved: () => void;
  embedded?: boolean;
}

/**
 * Renders funnel status update form with loss reason when status is terminal.
 * @param props - Lead data and save callback.
 * @returns Status form card.
 */
export function LeadStatusForm({ lead, leadId, onSaved, embedded }: LeadStatusFormProps) {
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

  const formBody = (
    <>
      <FormSelect
        label="Funnel status"
        id="funnel_status"
        value={funnelStatus}
        onValueChange={setFunnelStatus}
        options={FUNNEL_STATUSES.map((s) => ({ value: s, label: s }))}
      />
      {funnelStatus === 'ziyaret-ama-almayacak' && (
        <FormSelect
          label="Loss reason *"
          id="loss_reason"
          value={lossReason}
          onValueChange={setLossReason}
          placeholder="Select reason..."
          options={LOSS_REASONS.map((r) => ({ value: r, label: r }))}
        />
      )}
      {error && <p className="text-xs text-brand-red">{error}</p>}
      <Button type="button" onClick={handleStatusUpdate} disabled={saving}>
        {saving ? 'Saving...' : 'Save status'}
      </Button>
    </>
  );

  if (embedded) {
    return <div className="flex flex-col gap-4">{formBody}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update status</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{formBody}</CardContent>
    </Card>
  );
}
