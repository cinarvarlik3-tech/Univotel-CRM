import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useTranslation } from '@/hooks/useTranslation';
import { useSalespeople } from '@/hooks/useSalespeople';
import type { SalespersonOption } from '@/types/domain';

interface ReassignTaskDialogProps {
  taskId: string;
  currentAssigneeId: string;
  open: boolean;
  onClose: () => void;
  onReassigned: () => void;
}

export function ReassignTaskDialog({
  taskId,
  currentAssigneeId,
  open,
  onClose,
  onReassigned,
}: ReassignTaskDialogProps) {
  const { t } = useTranslation();
  const { data: salespeople } = useSalespeople();
  const [selectedId, setSelectedId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || selectedId === currentAssigneeId) {
      onClose();
      return;
    }
    setSaving(true);
    setError('');
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_to: selectedId }),
    });
    setSaving(false);
    if (res.ok) {
      setSelectedId('');
      onReassigned();
      onClose();
    } else {
      const json = await res.json();
      setError(json.error ?? 'Failed to reassign task');
    }
  }

  function handleClose() {
    setSelectedId('');
    setError('');
    onClose();
  }

  const options: SalespersonOption[] = salespeople ?? [];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('tasks.reassignTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">{t('tasks.reassignTo')}</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">{t('common.select')}</option>
              {options.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.full_name}
                  {sp.id === currentAssigneeId ? ' (current)' : ''}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-xs text-brand-red">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={handleClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving || !selectedId}>
              {saving ? t('common.saving') : t('tasks.reassign')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
