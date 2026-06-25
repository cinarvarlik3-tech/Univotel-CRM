/**
 * KPI tile for salesperson analytics — value + optional benchmark delta chip.
 */
import { cn } from '@/lib/utils';
import { CalcNote } from '@/components/analytics/overview/CalcNote';

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  benchmarkLabel?: string;
  deltaPct?: number | null;
  note?: string;
  showCalcNotes?: boolean;
  isSnapshot?: boolean;
  snapshotLabel?: string;
  variant?: 'neutral' | 'blue' | 'red' | 'amber' | 'green';
  className?: string;
}

export function MetricCard({
  label,
  value,
  sub,
  benchmarkLabel,
  deltaPct,
  note,
  showCalcNotes = false,
  isSnapshot = false,
  snapshotLabel = 'Now',
  variant = 'neutral',
  className,
}: MetricCardProps) {
  const isUp = (deltaPct ?? 0) >= 0;
  const isSolid = variant === 'blue' || variant === 'red' || variant === 'green';

  return (
    <div className={cn('relative flex flex-col', className)}>
      <div
        className={cn(
          // min-h floors every card to the height of a card that has a benchmark row
          // (e.g. the Global section's top cards), so simpler cards line up with them.
          'flex min-h-[104px] flex-1 flex-col rounded-[10px] border px-4 py-3.5',
          variant === 'blue' && 'border-brand-blue bg-brand-blue',
          variant === 'red' && 'border-brand-red bg-brand-red',
          variant === 'green' && 'border-emerald-600 bg-emerald-600',
          variant === 'amber' && 'border-[var(--badge-warning-text)] bg-[var(--badge-warning-bg)]',
          variant === 'neutral' && 'border-border-default bg-surface-card',
        )}
      >
        <div className="mb-1 flex items-start justify-between gap-1">
          <p
            className={cn(
              'text-[11px] font-medium uppercase tracking-wide',
              variant === 'neutral' && 'text-text-secondary',
              isSolid && 'text-white/75',
              variant === 'amber' && 'text-[var(--badge-warning-text)]/80',
            )}
          >
            {label}
          </p>
          {isSnapshot && (
            <span
              className={cn(
                'rounded px-1 py-0.5 text-[9px] uppercase',
                isSolid ? 'bg-white/20 text-white/80' : 'bg-muted text-text-tertiary',
              )}
            >
              {snapshotLabel}
            </span>
          )}
        </div>

        <p
          className={cn(
            'font-heading text-2xl font-bold tabular-nums',
            variant === 'neutral' && 'text-text-primary',
            isSolid && 'text-white',
            variant === 'amber' && 'text-[var(--badge-warning-text)]',
          )}
        >
          {value}
        </p>

        {sub && (
          <p
            className={cn(
              'mt-0.5 text-[11px]',
              variant === 'neutral' && 'text-text-tertiary',
              isSolid && 'text-white/60',
              variant === 'amber' && 'text-[var(--badge-warning-text)]/70',
            )}
          >
            {sub}
          </p>
        )}

        {(benchmarkLabel !== undefined || deltaPct != null) && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px]">
            {benchmarkLabel && (
              <span className={cn('text-text-tertiary', isSolid && 'text-white/50')}>
                {benchmarkLabel}
              </span>
            )}
            {deltaPct != null && (
              <span
                className={cn(
                  'font-medium',
                  isUp ? 'text-emerald-600' : 'text-brand-red',
                  isSolid && (isUp ? 'text-emerald-300' : 'text-red-300'),
                )}
              >
                {isUp ? '▲' : '▼'} {Math.abs(deltaPct).toFixed(0)}%
              </span>
            )}
          </div>
        )}
      </div>

      {note && showCalcNotes && (
        <CalcNote text={note} show={showCalcNotes} className="mt-1.5 px-1" />
      )}
    </div>
  );
}
