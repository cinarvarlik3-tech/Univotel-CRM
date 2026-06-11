/**
 * Tri-state filter mode toggle: match / filled / empty.
 */
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import type { FilterMode } from '@/types/filter';

interface FilterModeToggleProps {
  mode: FilterMode;
  onChange: (mode: FilterMode) => void;
  className?: string;
}

const MODES: FilterMode[] = ['match', 'filled', 'empty'];

/**
 * Renders Değer / Dolu / Boş mode buttons for a filter field.
 */
export function FilterModeToggle({ mode, onChange, className }: FilterModeToggleProps) {
  const { t } = useTranslation();

  const labels: Record<FilterMode, string> = {
    match: t('filters.modeMatch'),
    filled: t('filters.modeFilled'),
    empty: t('filters.modeEmpty'),
  };

  return (
    <div className={cn('flex rounded-md border border-border-default p-0.5', className)}>
      {MODES.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn(
            'flex-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors',
            mode === m
              ? 'bg-brand-primary text-white'
              : 'text-text-secondary hover:bg-row-hover/60',
          )}
        >
          {labels[m]}
        </button>
      ))}
    </div>
  );
}
