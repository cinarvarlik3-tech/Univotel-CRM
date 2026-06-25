/**
 * KPI card with optional calculation note.
 */
import { KpiCard } from '@/components/ui/kpi-card';
import { CalcNote } from '@/components/analytics/overview/CalcNote';
import { cn } from '@/lib/utils';

interface AnalyticsKpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  variant?: 'blue' | 'red' | 'amber' | 'neutral';
  explanation?: string;
  showCalcNotes: boolean;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  headerExtra?: React.ReactNode;
}

export function AnalyticsKpiCard({
  label,
  value,
  sub,
  variant = 'neutral',
  explanation,
  showCalcNotes,
  className,
  labelClassName,
  valueClassName,
  headerExtra,
}: AnalyticsKpiCardProps) {
  return (
    <div className={cn('relative', className)}>
      <KpiCard
        label={label}
        value={value}
        sub={sub}
        variant={variant}
        labelClassName={labelClassName}
        valueClassName={valueClassName}
        className="min-h-[118px] px-5 py-5"
      />
      {headerExtra && <div className="absolute top-3 right-3">{headerExtra}</div>}
      {explanation && <CalcNote text={explanation} show={showCalcNotes} className="mt-1.5 px-1" />}
    </div>
  );
}
