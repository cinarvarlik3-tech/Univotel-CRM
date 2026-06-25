/**
 * Global analytics header controls — date picker popup + calculation notes toggle.
 */
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OverviewRangeFilter } from '@/components/analytics/overview/OverviewRangeFilter';
import { useTranslation } from '@/hooks/useTranslation';
import { DEFAULT_GLOBAL_RANGE, type OverviewRangeSelection } from '@/lib/analytics/overview-range';

interface AnalyticsGlobalHeaderControlsProps {
  global: OverviewRangeSelection;
  onGlobalChange: (next: OverviewRangeSelection) => void;
  showCalcNotes: boolean;
  onShowCalcNotesChange: (next: boolean) => void;
}

export function AnalyticsGlobalHeaderControls({
  global,
  onGlobalChange,
  showCalcNotes,
  onShowCalcNotesChange,
}: AnalyticsGlobalHeaderControlsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex shrink-0 items-center gap-3">
      <label className="flex cursor-pointer items-center gap-2 text-xs text-text-secondary">
        <Checkbox
          checked={showCalcNotes}
          onCheckedChange={(v) => onShowCalcNotesChange(v === true)}
        />
        {t('analytics.calcNotesToggle')}
      </label>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="sm"
            className="h-8 shrink-0 border-0 bg-brand-red px-3 text-xs text-white hover:bg-brand-red/90"
          >
            {t('analytics.pickDate')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={6}
          className="z-[100] w-auto min-w-[280px] p-3"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <p className="mb-2 text-xs font-medium text-text-secondary">
            {t('analytics.globalFilter')}
          </p>
          <OverviewRangeFilter
            tier="global"
            showOff={false}
            value={global}
            onChange={onGlobalChange}
            className="flex-wrap"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 h-8 w-full text-xs"
            onClick={() => onGlobalChange(DEFAULT_GLOBAL_RANGE)}
          >
            {t('analytics.resetFilters')}
          </Button>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
