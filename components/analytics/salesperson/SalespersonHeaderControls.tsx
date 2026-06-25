/**
 * Salesperson analytics global-header controls — rendered in the AppShell actions slot.
 * Right-to-left order: kapora toggle, calc-notes toggle, date picker, rep picker, back-to-leaderboard.
 */
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OverviewRangeFilter } from '@/components/analytics/overview/OverviewRangeFilter';
import { useTranslation } from '@/hooks/useTranslation';
import type { OverviewRangeSelection } from '@/lib/analytics/overview-range';

interface RepOption {
  id: string;
  fullName: string;
  isActive: boolean;
}

interface SalespersonHeaderControlsProps {
  reps: RepOption[];
  selectedRepId: string | null;
  onSelectRep: (id: string | null) => void;
  range: OverviewRangeSelection;
  onRangeChange: (next: OverviewRangeSelection) => void;
  defaultRange: OverviewRangeSelection;
  includeKapora: boolean;
  onKaporaChange: (next: boolean) => void;
  showCalcNotes: boolean;
  onCalcNotesChange: (next: boolean) => void;
  showBack?: boolean;
  onBack?: () => void;
}

const ALL_TEAM = '__all__';

export function SalespersonHeaderControls({
  reps,
  selectedRepId,
  onSelectRep,
  range,
  onRangeChange,
  defaultRange,
  includeKapora,
  onKaporaChange,
  showCalcNotes,
  onCalcNotesChange,
  showBack = false,
  onBack,
}: SalespersonHeaderControlsProps) {
  const { t } = useTranslation();

  const selectValue = selectedRepId ?? ALL_TEAM;

  return (
    // Rendered inside the right-aligned actions slot; DOM order is left→right,
    // so back-to-leaderboard is leftmost and the kapora toggle ends at the right corner.
    <div className="flex shrink-0 items-center gap-3">
      {/* Back to leaderboard */}
      {showBack && (
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 text-xs text-text-secondary hover:text-text-primary"
        >
          {t('analytics.spBackToLeaderboard')}
        </button>
      )}

      {/* Agent (rep) picker */}
      <Select value={selectValue} onValueChange={(v) => onSelectRep(v === ALL_TEAM ? null : v)}>
        <SelectTrigger className="h-8 w-48 shrink-0 text-xs">
          <SelectValue placeholder={t('analytics.spSelectRep')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_TEAM}>{t('analytics.spLeaderboard')}</SelectItem>
          {reps.map((rep) => (
            <SelectItem key={rep.id} value={rep.id}>
              {rep.fullName}
              {!rep.isActive && (
                <span className="ml-1 text-[10px] uppercase text-text-tertiary">
                  {t('analytics.inactive')}
                </span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Global date picker */}
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
            value={range}
            onChange={onRangeChange}
            className="flex-wrap"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 h-8 w-full text-xs"
            onClick={() => onRangeChange(defaultRange)}
          >
            {t('analytics.resetFilters')}
          </Button>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Calc notes toggle */}
      <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-text-secondary">
        <Checkbox checked={showCalcNotes} onCheckedChange={(v) => onCalcNotesChange(v === true)} />
        {t('analytics.calcNotesToggle')}
      </label>

      {/* Kapora toggle */}
      <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-text-secondary">
        <Checkbox checked={includeKapora} onCheckedChange={(v) => onKaporaChange(v === true)} />
        {t('analytics.spKaporaToggle')}
      </label>
    </div>
  );
}
