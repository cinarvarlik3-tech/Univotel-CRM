/**
 * Contact history timeline with note creation form.
 */
import { useState } from 'react';
import { ContactHistoryList } from '@/components/leads/ContactHistoryList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { FormSelect } from '@/components/ui/form-select';
import { Textarea } from '@/components/ui/textarea';
import { INTERACTION_TYPES } from '@/lib/constants';
import type { ContactHistoryEntry } from '@/types/domain';

interface ContactHistorySectionProps {
  leadId: string;
  entries: ContactHistoryEntry[];
  onAdded: () => void;
  embedded?: boolean;
}

/**
 * Renders contact history list and form to add a manual note.
 * @param props - Lead ID, entries, and refresh callback.
 * @returns Contact history section card.
 */
export function ContactHistorySection({
  leadId,
  entries,
  onAdded,
  embedded,
}: ContactHistorySectionProps) {
  const [note, setNote] = useState('');
  const [interactionType, setInteractionType] = useState('message_sent');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleAddNote() {
    if (!note.trim()) return;

    setSaving(true);
    setError('');

    const res = await fetch(`/api/contact-history/${leadId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notes: note,
        interaction_type: interactionType,
      }),
    });

    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(json.error ?? 'Failed to add note');
      return;
    }

    setNote('');
    onAdded();
  }

  const content = (
    <>
      <ContactHistoryList entries={entries} />

      <div className="space-y-4 border-t border-border-default pt-4">
        <h4 className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
          Add note
        </h4>
        <FormSelect
          label="Interaction type"
          id="interaction_type"
          value={interactionType}
          onValueChange={setInteractionType}
          options={INTERACTION_TYPES.map((t) => ({ value: t, label: t }))}
        />
        <FormField label="Note" htmlFor="contact_note">
          <Textarea
            id="contact_note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
        </FormField>
        {error && <p className="text-xs text-brand-red">{error}</p>}
        <Button type="button" onClick={handleAddNote} disabled={saving}>
          {saving ? 'Adding...' : 'Add note'}
        </Button>
      </div>
    </>
  );

  if (embedded) {
    return <div className="flex flex-col gap-4">{content}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact history</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{content}</CardContent>
    </Card>
  );
}
