import { useState } from 'react';
import { IconCalendar } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useTranslation } from '@/hooks/useTranslation';
import {
  type TimeFilterOption,
  type TimeFilterState,
  EMPTY_TIME_FILTER_STATE,
} from '@/lib/tasks/task-filters';
import { cn } from '@/lib/utils';

interface TimeFilterButtonProps {
  currentState: TimeFilterState;
  onApply: (state: TimeFilterState) => void;
}

const TIME_OPTIONS: TimeFilterOption[] = ['current', 'today', 'week', 'month', 'custom'];

export function TimeFilterButton({ currentState, onApply }: TimeFilterButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilterOption>(currentState.timeFilter);
  const [customFrom, setCustomFrom] = useState(currentState.customFrom);
  const [customTo, setCustomTo] = useState(currentState.customTo);

  function timeLabel(opt: TimeFilterOption): string {
    const map: Record<TimeFilterOption, string> = {
      current: t('tasks.timeFilterCurrent'),
      today: t('tasks.timeFilterToday'),
      week: t('tasks.timeFilterWeek'),
      month: t('tasks.timeFilterMonth'),
      custom: t('tasks.timeFilterCustom'),
    };
    return map[opt];
  }

  function activeBadgeLabel(): string | null {
    if (currentState.timeFilter === 'current') return null;
    if (currentState.timeFilter === 'custom') {
      if (currentState.customFrom && currentState.customTo)
        return `${currentState.customFrom} – ${currentState.customTo}`;
      if (currentState.customFrom) return currentState.customFrom;
      return t('tasks.timeFilterCustom');
    }
    return timeLabel(currentState.timeFilter);
  }

  function handleOpen() {
    setTimeFilter(currentState.timeFilter);
    setCustomFrom(currentState.customFrom);
    setCustomTo(currentState.customTo);
    setOpen(true);
  }

  function handleApply() {
    onApply({ timeFilter, customFrom, customTo });
    setOpen(false);
  }

  function handleClear() {
    onApply(EMPTY_TIME_FILTER_STATE);
    setOpen(false);
  }

  const badge = activeBadgeLabel();

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={handleOpen} className="gap-1.5">
        <IconCalendar size={14} />
        {t('tasks.timeFilterLabel')}
        {badge && (
          <span className="ml-1 rounded-full bg-brand-blue px-1.5 py-0.5 text-[10px] font-bold text-white">
            {badge}
          </span>
        )}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) setOpen(false);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconCalendar size={18} />
              {t('tasks.timeFilterLabel')}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {TIME_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setTimeFilter(opt)}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                    timeFilter === opt
                      ? 'border-brand-blue bg-brand-blue text-white'
                      : 'border-border-default bg-surface-card text-text-secondary hover:bg-surface-secondary',
                  )}
                >
                  {timeLabel(opt)}
                </button>
              ))}
            </div>

            {timeFilter === 'custom' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <label className="w-16 text-xs text-text-secondary">
                    {t('tasks.customDateFrom')}
                  </label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="h-8 flex-1 rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-16 text-xs text-text-secondary">
                    {t('tasks.customDateTo')}
                  </label>
                  <input
                    type="date"
                    value={customTo}
                    min={customFrom}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="h-8 flex-1 rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <p className="text-[11px] text-text-tertiary">{t('tasks.customDateToEmpty')}</p>
              </div>
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
    </>
  );
}
