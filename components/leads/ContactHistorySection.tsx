/**
 * Contact history timeline with note creation form.
 */
import { useState } from 'react';
import { ContactHistoryList } from '@/components/leads/ContactHistoryList';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { INTERACTION_TYPES } from '@/lib/constants';
import type { ContactHistoryEntry } from '@/types/domain';

interface ContactHistorySectionProps {
  leadId: string;
  entries: ContactHistoryEntry[];
  onAdded: () => void;
}

/**
 * Renders contact history list and form to add a manual note.
 * @param props - Lead ID, entries, and refresh callback.
 * @returns Contact history section card.
 */
export function ContactHistorySection({ leadId, entries, onAdded }: ContactHistorySectionProps) {
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

  return (
    <div className="card">
      <h3>Contact history</h3>
      <ContactHistoryList entries={entries} />

      <h4>Add note</h4>
      <Select
        label="Interaction type"
        id="interaction_type"
        value={interactionType}
        onChange={(e) => setInteractionType(e.target.value)}
      >
        {INTERACTION_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </Select>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
      {error && <p className="error">{error}</p>}
      <Button type="button" onClick={handleAddNote} disabled={saving}>
        {saving ? 'Adding...' : 'Add note'}
      </Button>
    </div>
  );
}
