/**
 * Manager-only actions: reassign lead and soft delete.
 */
import { useRouter } from 'next/router';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import type { LeadWithDetails, SalespersonOption } from '@/types/domain';

interface ManagerLeadActionsProps {
  lead: LeadWithDetails;
  leadId: string;
  salespeople: SalespersonOption[];
  onReassigned: () => void;
}

/**
 * Renders manager reassignment dropdown and delete button.
 * @param props - Lead, salespeople list, and callbacks.
 * @returns Manager actions card or null if not applicable.
 */
export function ManagerLeadActions({
  lead,
  leadId,
  salespeople,
  onReassigned,
}: ManagerLeadActionsProps) {
  const router = useRouter();
  const [assignedTo, setAssignedTo] = useState(lead.assigned_to ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleReassign() {
    setSaving(true);
    setError('');

    const res = await fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assigned_to: assignedTo || null,
      }),
    });

    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(json.error ?? 'Reassign failed');
      return;
    }

    onReassigned();
  }

  async function handleDelete() {
    if (!window.confirm('Soft-delete this lead? It will be hidden from lists.')) {
      return;
    }

    const res = await fetch(`/api/leads/${leadId}`, { method: 'DELETE' });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? 'Delete failed');
      return;
    }

    router.push('/leads');
  }

  return (
    <div className="card">
      <h3>Manager actions</h3>
      <Select
        label="Reassign to"
        id="assigned_to"
        value={assignedTo}
        onChange={(e) => setAssignedTo(e.target.value)}
      >
        <option value="">Unassigned</option>
        {salespeople.map((sp) => (
          <option key={sp.id} value={sp.id}>
            {sp.full_name}
          </option>
        ))}
      </Select>
      <Button type="button" onClick={handleReassign} disabled={saving}>
        {saving ? 'Saving...' : 'Save assignment'}
      </Button>
      <Button type="button" className="danger" onClick={handleDelete}>
        Delete lead
      </Button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
