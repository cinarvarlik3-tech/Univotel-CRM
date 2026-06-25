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

interface CancelTaskDialogProps {
  taskId: string;
  open: boolean;
  onClose: () => void;
  onCancelled: () => void;
}

export function CancelTaskDialog({ taskId, open, onClose, onCancelled }: CancelTaskDialogProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError(t('tasks.cancelReasonPlaceholder'));
      return;
    }
    setSaving(true);
    setError('');
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_cancelled: true, cancel_reason: reason.trim() }),
    });
    setSaving(false);
    if (res.ok) {
      setReason('');
      onCancelled();
      onClose();
    } else {
      const json = await res.json();
      setError(json.error ?? 'Failed to cancel task');
    }
  }

  function handleClose() {
    setReason('');
    setError('');
    onClose();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('tasks.cancelTask')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">
              {t('tasks.cancelReason')}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('tasks.cancelReasonPlaceholder')}
              rows={3}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              required
            />
          </div>
          {error && <p className="text-xs text-brand-red">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={handleClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="destructive" disabled={saving || !reason.trim()}>
              {saving ? t('common.saving') : t('tasks.cancelConfirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
