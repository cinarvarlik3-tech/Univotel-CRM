/**
 * Form for updating funnel status and loss reason on a lead.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormSelect } from '@/components/ui/form-select';
import { useTranslation } from '@/hooks/useTranslation';
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
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
  const { locale, t } = useTranslation();
  const [funnelStatus, setFunnelStatus] = useState(lead.funnel_status);
  const [lossReason, setLossReason] = useState(lead.loss_reason ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleStatusUpdate() {
    if (funnelStatus === 'lost' && !lossReason) {
      setError(t('leads.lossReasonRequiredError'));
      return;
    }

    setSaving(true);
    setError('');

    const body: Record<string, string> = { funnel_status: funnelStatus };
    if (funnelStatus === 'lost') {
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
      setError(json.error ?? t('leads.updateFailed'));
      return;
    }

    onSaved();
  }

  const formBody = (
    <>
      <FormSelect
        label={t('leads.funnelStatus')}
        id="funnel_status"
        value={funnelStatus}
        onValueChange={setFunnelStatus}
        options={FUNNEL_STATUSES.map((s) => ({
          value: s,
          label: formatEnumLabel(locale, 'funnel', s),
        }))}
      />
      {funnelStatus === 'lost' && (
        <FormSelect
          label={t('leads.lossReasonRequired')}
          id="loss_reason"
          value={lossReason}
          onValueChange={setLossReason}
          placeholder={t('leads.selectReason')}
          options={LOSS_REASONS.map((r) => ({
            value: r,
            label: formatEnumLabel(locale, 'loss', r),
          }))}
        />
      )}
      {error && <p className="text-xs text-brand-red">{error}</p>}
      <Button type="button" onClick={handleStatusUpdate} disabled={saving}>
        {saving ? t('common.saving') : t('leads.saveStatus')}
      </Button>
    </>
  );

  if (embedded) {
    return <div className="flex flex-col gap-4">{formBody}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('leads.updateStatus')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{formBody}</CardContent>
    </Card>
  );
}
