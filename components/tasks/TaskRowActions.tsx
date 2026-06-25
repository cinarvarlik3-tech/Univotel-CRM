/**
 * Row action buttons for task lists: Complete, Add Note, Cancel, Reassign.
 * Which actions are shown depends on task state and user role.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AddNoteDialog } from '@/components/tasks/AddNoteDialog';
import { CancelTaskDialog } from '@/components/tasks/CancelTaskDialog';
import { ReassignTaskDialog } from '@/components/tasks/ReassignTaskDialog';
import { useTranslation } from '@/hooks/useTranslation';
import type { TaskRow } from '@/types/domain';

interface TaskRowActionsProps {
  task: TaskRow;
  isManager: boolean;
  onComplete: (taskId: string) => void;
  onRefresh: () => void;
}

export function TaskRowActions({ task, isManager, onComplete, onRefresh }: TaskRowActionsProps) {
  const { t } = useTranslation();
  const [noteOpen, setNoteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);

  const canComplete = !task.is_completed && !task.is_cancelled;
  const canCancel = !task.is_cancelled;

  return (
    <div className="flex items-center gap-1.5">
      {canComplete && (
        <Button
          type="button"
          size="sm"
          className="h-6 px-2 text-[11px]"
          onClick={() => onComplete(task.id)}
        >
          {t('tasks.complete')}
        </Button>
      )}

      {!task.is_cancelled && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-6 px-2 text-[11px]"
          onClick={() => setNoteOpen(true)}
        >
          {t('tasks.addNote')}
        </Button>
      )}

      {canCancel && (
        <Button
          type="button"
          size="sm"
          variant="destructive"
          className="h-6 px-2 text-[11px]"
          onClick={() => setCancelOpen(true)}
        >
          {t('tasks.cancelTask')}
        </Button>
      )}

      {isManager && !task.is_cancelled && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-6 px-2 text-[11px]"
          onClick={() => setReassignOpen(true)}
        >
          {t('tasks.reassign')}
        </Button>
      )}

      {task.is_completed && !task.is_cancelled && (
        <span className="text-[11px] text-text-secondary">{t('tasks.statusCompleted')}</span>
      )}

      <AddNoteDialog
        taskId={task.id}
        currentNote={task.notes}
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        onSaved={onRefresh}
      />
      <CancelTaskDialog
        taskId={task.id}
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onCancelled={onRefresh}
      />
      {isManager && (
        <ReassignTaskDialog
          taskId={task.id}
          currentAssigneeId={task.assigned_to}
          open={reassignOpen}
          onClose={() => setReassignOpen(false)}
          onReassigned={onRefresh}
        />
      )}
    </div>
  );
}
