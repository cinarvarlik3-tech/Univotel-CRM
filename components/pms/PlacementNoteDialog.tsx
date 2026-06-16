/**
 * Placement note editor dialog.
 */
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/useTranslation';
import type { PmsUnplacedLead } from '@/types/domain';

interface PlacementNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: PmsUnplacedLead | null;
  onSave: (leadId: string, note: string | null) => Promise<void>;
}

export function PlacementNoteDialog({
  open,
  onOpenChange,
  lead,
  onSave,
}: PlacementNoteDialogProps) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setNote(lead?.placementNote ?? '');
  }, [lead]);

  async function handleSave() {
    if (!lead) return;
    setLoading(true);
    try {
      await onSave(lead.leadUuid, note.trim() || null);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('pms.noteTitle')}</DialogTitle>
        </DialogHeader>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder={t('pms.notePlaceholder')}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button disabled={loading} onClick={handleSave}>
            {loading ? t('common.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
