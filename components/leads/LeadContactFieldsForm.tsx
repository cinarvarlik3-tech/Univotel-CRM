/**
 * Form for editing lead contact fields on the leads table (parent_phone).
 */
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { LeadWithDetails } from '@/types/domain';

interface LeadContactFieldsFormProps {
  lead: LeadWithDetails;
  leadId: string;
  onSaved: () => void;
}

/**
 * Renders parent_phone edit form PATCHing /api/leads/[id].
 * @param props - Lead data and callbacks.
 * @returns Contact fields form card.
 */
export function LeadContactFieldsForm({ lead, leadId, onSaved }: LeadContactFieldsFormProps) {
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
      setError(json.error ?? 'Failed to save');
      return;
    }

    onSaved();
  }

  return (
    <div className="card">
      <h3>Contact</h3>
      <Input
        label="Parent phone"
        id="parent_phone"
        value={parentPhone}
        onChange={(e) => setParentPhone(e.target.value)}
      />
      {error && <p className="error">{error}</p>}
      <Button type="button" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save contact'}
      </Button>
    </div>
  );
}
