/**
 * Manager-only actions: reassign lead, archive, and soft delete.
 */
import { useRouter } from 'next/router';
import { useState } from 'react';
import { ArchiveLeadModal } from '@/components/leads/ArchiveLeadModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormSelect } from '@/components/ui/form-select';
import { useTranslation } from '@/hooks/useTranslation';
import type { LeadWithDetails, SalespersonOption } from '@/types/domain';

interface ManagerLeadActionsProps {
  lead: LeadWithDetails;
  leadId: string;
  salespeople: SalespersonOption[];
  onReassigned: () => void;
  embedded?: boolean;
  /** Called after archive/delete when used inside slide-over panel. */
  onArchived?: () => void;
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
  embedded,
  onArchived,
}: ManagerLeadActionsProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [assignedTo, setAssignedTo] = useState(lead.assigned_to ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

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
      setError(json.error ?? t('leads.reassignFailed'));
      return;
    }

    onReassigned();
  }

  async function handleDelete() {
    if (!window.confirm(t('leads.deleteConfirm'))) {
      return;
    }

    const res = await fetch(`/api/leads/${leadId}`, { method: 'DELETE' });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? t('leads.deleteFailed'));
      return;
    }

    if (embedded && onArchived) {
      onArchived();
    } else {
      router.push('/leads');
    }
  }

  function handleArchiveComplete(uuid: string) {
    if (embedded && onArchived) {
      onArchived();
    } else {
      router.push(`/leads/archived/${uuid}`);
    }
  }

  const formBody = (
    <>
      <FormSelect
        label={t('leads.reassignTo')}
        id="assigned_to"
        value={assignedTo || '__none__'}
        onValueChange={(v) => setAssignedTo(v === '__none__' ? '' : v)}
        options={[
          { value: '__none__', label: t('common.unassigned') },
          ...salespeople.map((sp) => ({ value: sp.id, label: sp.full_name })),
        ]}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={handleReassign} disabled={saving}>
          {saving ? t('common.saving') : t('leads.saveAssignment')}
        </Button>
        <Button type="button" onClick={() => setArchiveOpen(true)}>
          {t('leads.archiveLead')}
        </Button>
        <Button type="button" variant="destructive" onClick={handleDelete}>
          {t('leads.deleteLead')}
        </Button>
      </div>
      {error && <p className="text-xs text-brand-red">{error}</p>}
      <ArchiveLeadModal
        leadId={leadId}
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onArchived={handleArchiveComplete}
      />
    </>
  );

  if (embedded) {
    return <div className="flex flex-col gap-4">{formBody}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('leads.managerActions')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{formBody}</CardContent>
    </Card>
  );
}
