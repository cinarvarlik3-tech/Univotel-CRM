/**
 * Form for editing lead contact fields on the leads table (parent_phone).
 */
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/hooks/useTranslation';
import type { LeadWithDetails } from '@/types/domain';

interface LeadContactFieldsFormProps {
  lead: LeadWithDetails;
  leadId: string;
  onSaved: () => void;
  embedded?: boolean;
}

/**
 * Renders parent_phone edit form PATCHing /api/leads/[id].
 * @param props - Lead data and callbacks.
 * @returns Contact fields form card.
 */
export function LeadContactFieldsForm({
  lead,
  leadId,
  onSaved,
  embedded,
}: LeadContactFieldsFormProps) {
  const { t } = useTranslation();
  const [parentPhone, setParentPhone] = useState(lead.parent_phone ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setParentPhone(lead.parent_phone ?? '');
  }, [lead.parent_phone, lead.updated_at]);

  async function handleSave() {
    setSaving(true);
    setError('');

    const res = await fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parent_phone: parentPhone || null }),
    });

    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(json.error ?? t('leads.saveFailed'));
      return;
    }

    onSaved();
  }

  const formBody = (
    <>
      <FormField label={t('leads.parentPhone')} htmlFor="parent_phone">
        <Input
          id="parent_phone"
          value={parentPhone}
          onChange={(e) => setParentPhone(e.target.value)}
        />
      </FormField>
      {error && <p className="text-xs text-brand-red">{error}</p>}
      <Button type="button" onClick={handleSave} disabled={saving}>
        {saving ? t('common.saving') : t('leads.saveContact')}
      </Button>
    </>
  );

  if (embedded) {
    return <div className="flex flex-col gap-4">{formBody}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('leads.contact')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{formBody}</CardContent>
    </Card>
  );
}
