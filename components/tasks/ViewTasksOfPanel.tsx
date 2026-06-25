/**
 * Manager+ panel for selecting which agents' tasks to view.
 * Time filtering is handled separately by TimeFilterButton.
 */
import { useState } from 'react';
import { IconUsers } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useTranslation } from '@/hooks/useTranslation';
import { useSalespeople } from '@/hooks/useSalespeople';
import { cn } from '@/lib/utils';

interface ViewTasksOfPanelProps {
  open: boolean;
  onClose: () => void;
  currentAgentIds: string[];
  onApply: (agentIds: string[]) => void;
}

export function ViewTasksOfPanel({
  open,
  onClose,
  currentAgentIds,
  onApply,
}: ViewTasksOfPanelProps) {
  const { t } = useTranslation();
  const { data: salespeople } = useSalespeople();

  const [selectedIds, setSelectedIds] = useState<string[]>(currentAgentIds);
  const [search, setSearch] = useState('');

  const agents = salespeople ?? [];
  const filtered = search
    ? agents.filter((sp) => sp.full_name.toLowerCase().includes(search.toLowerCase()))
    : agents;

  function toggleAgent(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleApply() {
    onApply(selectedIds);
    onClose();
  }

  function handleClear() {
    onApply([]);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconUsers size={18} />
            {t('tasks.viewTasksOfTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
            {t('tasks.selectAgents')}
          </p>
          <input
            type="text"
            placeholder="Ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded-md border border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <div className="max-h-60 overflow-y-auto rounded-md border border-border-default">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-xs text-text-tertiary">No agents found</p>
            ) : (
              filtered.map((sp) => (
                <label
                  key={sp.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-row-hover',
                    selectedIds.includes(sp.id) && 'bg-blue-50',
                  )}
                >
                  <Checkbox
                    checked={selectedIds.includes(sp.id)}
                    onCheckedChange={() => toggleAgent(sp.id)}
                  />
                  <span className="flex-1 font-medium text-text-primary">{sp.full_name}</span>
                  <span className="text-[11px] text-text-tertiary">{sp.role}</span>
                </label>
              ))
            )}
          </div>
          {selectedIds.length > 0 && (
            <p className="text-xs text-text-secondary">
              {selectedIds.length} agent{selectedIds.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="secondary" onClick={handleClear}>
            {t('tasks.clearViewFilter')}
          </Button>
          <Button type="button" onClick={handleApply}>
            {t('tasks.applyViewFilter')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
