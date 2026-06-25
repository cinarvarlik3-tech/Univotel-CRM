/**
 * Range selector for the Genel Performans tab — rendered in the My Day page header.
 * Presets: Bu hafta | Bu ay | Tüm zamanlar | Özel aralık (date picker).
 */
import { IconCalendar } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

export type GenelPreset = 'today' | 'this_week' | 'this_month' | 'all_time' | 'custom';

const PRESETS: { value: Exclude<GenelPreset, 'custom'>; label: string }[] = [
  { value: 'today', label: 'Bugün' },
  { value: 'this_week', label: 'Bu hafta' },
  { value: 'this_month', label: 'Bu ay' },
  { value: 'all_time', label: 'Tüm zamanlar' },
];

interface GenelRangeSelectorProps {
  preset: GenelPreset;
  onPresetChange: (preset: GenelPreset) => void;
  customFrom: string;
  onCustomFromChange: (value: string) => void;
  customTo: string;
  onCustomToChange: (value: string) => void;
}

export function GenelRangeSelector({
  preset,
  onPresetChange,
  customFrom,
  onCustomFromChange,
  customTo,
  onCustomToChange,
}: GenelRangeSelectorProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <div className="flex overflow-hidden rounded-lg border border-border-default text-xs">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => onPresetChange(p.value)}
            className={cn(
              'px-4 py-1.5 transition-colors',
              preset === p.value
                ? 'bg-brand-blue text-white'
                : 'text-text-secondary hover:bg-row-hover',
            )}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPresetChange('custom')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-1.5 transition-colors',
            preset === 'custom'
              ? 'bg-brand-blue text-white'
              : 'text-text-secondary hover:bg-row-hover',
          )}
        >
          <IconCalendar className="h-3.5 w-3.5" />
          Özel
        </button>
      </div>

      {preset === 'custom' && (
        <div className="flex items-center gap-2 text-xs">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => onCustomFromChange(e.target.value)}
            className="rounded-lg border border-border-default bg-surface-card px-2.5 py-1.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
          <span className="text-text-tertiary">—</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => onCustomToChange(e.target.value)}
            className="rounded-lg border border-border-default bg-surface-card px-2.5 py-1.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </div>
      )}
    </div>
  );
}
