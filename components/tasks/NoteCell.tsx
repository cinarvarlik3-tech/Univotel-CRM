import { useState } from 'react';
import { IconArrowsMaximize } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { AddNoteDialog } from '@/components/tasks/AddNoteDialog';

interface NoteCellProps {
  text: string | null | undefined;
  label?: string;
  /** When provided, an "Edit Note" button appears in the view popup. */
  taskId?: string;
  onRefresh?: () => void;
}

const MAX_CHARS = 30;

function getPreview(text: string): { preview: string; truncated: boolean } {
  if (text.length <= MAX_CHARS) return { preview: text, truncated: false };
  return { preview: text.slice(0, MAX_CHARS), truncated: true };
}

export function NoteCell({ text, label = 'Not', taskId, onRefresh }: NoteCellProps) {
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  if (!text) {
    return <span className="text-text-tertiary">—</span>;
  }

  const { preview, truncated } = getPreview(text);
  const canEdit = !!taskId && !!onRefresh;

  function openEdit() {
    setViewOpen(false);
    setEditOpen(true);
  }

  return (
    <>
      <div className="relative pr-5">
        <span className="text-text-secondary">
          {preview}
          {truncated && <span className="text-text-tertiary">…</span>}
        </span>
        {truncated && (
          <button
            type="button"
            onClick={() => setViewOpen(true)}
            className="absolute right-0 top-0 rounded p-0.5 text-text-tertiary transition-colors hover:bg-surface-secondary hover:text-text-primary"
            title="Tümünü gör"
          >
            <IconArrowsMaximize size={12} />
          </button>
        )}
      </div>

      {/* View dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>
          <p className="max-h-60 overflow-y-auto break-words text-sm leading-relaxed text-text-primary">
            {text}
          </p>
          {canEdit && (
            <DialogFooter className="justify-start">
              <Button type="button" variant="secondary" size="sm" onClick={openEdit}>
                Notu Düzenle
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog — only mounted when canEdit */}
      {canEdit && (
        <AddNoteDialog
          taskId={taskId}
          currentNote={text}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            onRefresh!();
          }}
        />
      )}
    </>
  );
}
