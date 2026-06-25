/**
 * Stage visibility toggle for the median-time-in-stage chart header.
 */
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { analyticsChartButtonClass } from '@/components/analytics/overview/analytics-chart-controls';
import { useTranslation } from '@/hooks/useTranslation';
import {
  getFunnelStageChartColor,
  MEDIAN_TIME_CHART_STAGES,
} from '@/lib/analytics/funnel-stage-chart-colors';
import { formatEnumLabel } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface MedianTimeStageSelectorProps {
  visibleStages: ReadonlySet<string>;
  onToggleStage: (stage: string) => void;
  disabled?: boolean;
}

export function MedianTimeStageSelector({
  visibleStages,
  onToggleStage,
  disabled = false,
}: MedianTimeStageSelectorProps) {
  const { locale, t } = useTranslation();
  const hiddenCount = MEDIAN_TIME_CHART_STAGES.length - visibleStages.size;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(analyticsChartButtonClass(), hiddenCount > 0 && 'font-medium')}
          aria-label={t('analytics.showStages')}
        >
          {t('analytics.showStages')}
          {hiddenCount > 0 ? ` (${visibleStages.size})` : ''}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="z-[100] max-h-[min(320px,70vh)] w-auto min-w-[220px] overflow-y-auto p-1"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {MEDIAN_TIME_CHART_STAGES.map((stage) => (
          <DropdownMenuCheckboxItem
            key={stage}
            checked={visibleStages.has(stage)}
            onCheckedChange={() => onToggleStage(stage)}
            onSelect={(e) => e.preventDefault()}
            className="gap-2 text-xs"
          >
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: getFunnelStageChartColor(stage) }}
              aria-hidden
            />
            {formatEnumLabel(locale, 'funnel', stage)}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
