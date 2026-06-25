/**
 * Linked Kapora / Sözleşme / Moved-in selector for conversion rate + total deals.
 */
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import { analyticsChartSelectClass } from '@/components/analytics/overview/analytics-chart-controls';
import type { ConversionStageDepth } from '@/lib/analytics/overview';

interface ConversionStageSelectorProps {
  value: ConversionStageDepth;
  onChange: (value: ConversionStageDepth) => void;
  disabled?: boolean;
}

const OPTIONS: ConversionStageDepth[] = ['kapora-alindi', 'sozlesme-imzalandi', 'moved_in'];

const LABEL_KEYS: Record<ConversionStageDepth, string> = {
  'kapora-alindi': 'analytics.conversionStageKapora',
  'sozlesme-imzalandi': 'analytics.conversionStageContract',
  moved_in: 'analytics.conversionStageMovedIn',
};

export function ConversionStageSelector({
  value,
  onChange,
  disabled,
}: ConversionStageSelectorProps) {
  const { t } = useTranslation();

  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as ConversionStageDepth)}
      disabled={disabled}
    >
      <SelectTrigger className={analyticsChartSelectClass('w-[72px]')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {t(LABEL_KEYS[opt])}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
