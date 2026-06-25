/**
 * Three-tier date range filter for analytics overview sections/widgets.
 */
import { useEffect, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import {
  isGlobalRangeOverriding,
  isRangeOverridden,
  type OverviewRangePreset,
  type OverviewRangeSelection,
} from '@/lib/analytics/overview-range';

const PRESETS: OverviewRangePreset[] = ['today', 'this_week', 'this_month', 'all_time'];

const PRESET_I18N: Record<OverviewRangePreset, string> = {
  today: 'analytics.rangeToday',
  this_week: 'analytics.rangeThisWeek',
  this_month: 'analytics.rangeThisMonth',
  all_time: 'analytics.rangeAllTime',
  custom: 'analytics.rangeCustom',
};

interface OverviewRangeFilterProps {
  value: OverviewRangeSelection;
  onChange: (next: OverviewRangeSelection) => void;
  disabled?: boolean;
  tier?: 'global' | 'section' | 'widget';
  global?: OverviewRangeSelection;
  section?: OverviewRangeSelection;
  showOff?: boolean;
  /** White background / dark text — for chart headers on brand-blue. */
  appearance?: 'default' | 'inverse';
  size?: 'default' | 'sm' | 'xs';
  className?: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function OverviewRangeFilter({
  value,
  onChange,
  disabled = false,
  tier = 'section',
  global = { mode: 'off' },
  section = { mode: 'off' },
  showOff = tier !== 'widget',
  appearance = 'default',
  size = 'default',
  className,
}: OverviewRangeFilterProps) {
  const { t } = useTranslation();
  const [customOpen, setCustomOpen] = useState(false);

  const overridden =
    disabled ||
    (tier === 'section' && isGlobalRangeOverriding(global)) ||
    (tier === 'widget' && isRangeOverridden('widget', global, section));

  const customFrom = value.mode === 'custom' ? value.from : '';
  const customTo = value.mode === 'custom' ? value.to : '';

  const activePreset =
    value.mode === 'preset' ? value.preset : value.mode === 'custom' ? 'custom' : 'off';
  const isXs = size === 'xs';
  const isSm = size === 'sm' || isXs;
  const isInverse = appearance === 'inverse';

  const buttonSize = isXs
    ? 'h-6 px-1 text-[9px] leading-none'
    : isSm
      ? 'h-8 px-2 text-[11px]'
      : 'px-2.5 py-1.5 text-xs';
  const presetGroupClass = cn(
    'flex items-stretch rounded-md border',
    isXs ? 'text-[9px]' : 'text-xs',
    isInverse ? 'border-white/40 bg-white text-gray-900' : 'border-border-default',
  );
  const dividerClass = isInverse ? 'border-l border-gray-200' : 'border-l border-border-default';
  const inactiveClass = isInverse ? 'bg-white text-gray-900 hover:bg-gray-50' : '';
  const activeClass = 'bg-brand-blue text-white';

  useEffect(() => {
    if (value.mode !== 'custom') {
      setCustomOpen(false);
    }
  }, [value.mode]);

  const handleCustomOpenChange = (open: boolean) => {
    if (overridden) return;
    if (open) {
      const today = todayIso();
      if (value.mode !== 'custom') {
        onChange({
          mode: 'custom',
          from: customFrom || today,
          to: customTo || today,
        });
      }
      setCustomOpen(true);
      return;
    }
    setCustomOpen(false);
  };

  return (
    <div
      className={cn(
        'flex flex-nowrap items-center',
        isXs ? 'gap-1' : 'gap-2',
        overridden && 'pointer-events-none opacity-45',
        className,
      )}
    >
      <div className={presetGroupClass}>
        {showOff && (
          <button
            type="button"
            disabled={overridden}
            className={cn(
              buttonSize,
              'transition-colors',
              activePreset === 'off' ? activeClass : inactiveClass,
            )}
            onClick={() => onChange({ mode: 'off' })}
          >
            {t('analytics.rangeOff')}
          </button>
        )}
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={overridden}
            className={cn(
              dividerClass,
              buttonSize,
              'transition-colors',
              activePreset === preset ? activeClass : inactiveClass,
            )}
            onClick={() => onChange({ mode: 'preset', preset })}
          >
            {t(PRESET_I18N[preset])}
          </button>
        ))}
        <DropdownMenu modal={false} open={customOpen} onOpenChange={handleCustomOpenChange}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={overridden}
              className={cn(
                dividerClass,
                buttonSize,
                'transition-colors',
                activePreset === 'custom' ? activeClass : inactiveClass,
              )}
            >
              {t('analytics.rangeCustom')}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={6}
            className="z-[100] w-auto min-w-[220px] p-3"
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <div className="flex flex-col gap-2.5">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-secondary">
                  {t('analytics.rangeFrom')}
                </span>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) =>
                    onChange({
                      mode: 'custom',
                      from: e.target.value,
                      to: customTo || e.target.value,
                    })
                  }
                  className="h-9 w-full rounded-md border border-border-default bg-surface-card px-2 text-sm text-text-primary"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-secondary">
                  {t('analytics.rangeTo')}
                </span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) =>
                    onChange({
                      mode: 'custom',
                      from: customFrom || e.target.value,
                      to: e.target.value,
                    })
                  }
                  className="h-9 w-full rounded-md border border-border-default bg-surface-card px-2 text-sm text-text-primary"
                />
              </label>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
