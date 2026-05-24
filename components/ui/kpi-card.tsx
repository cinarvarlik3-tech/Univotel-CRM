/**
 * KPI metric card — colored (blue/red) or neutral variants.
 */
import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  variant?: 'blue' | 'red' | 'neutral';
  valueClassName?: string;
  className?: string;
}

/**
 * Renders a dashboard KPI card per style guide spec.
 * @param props - Label, value, subtext, and color variant.
 * @returns KPI card element.
 */
export function KpiCard({
  label,
  value,
  sub,
  variant = 'neutral',
  valueClassName,
  className,
}: KpiCardProps) {
  const isColored = variant === 'blue' || variant === 'red';

  return (
    <div
      className={cn(
        'rounded-[10px] border px-4 py-3.5',
        variant === 'blue' && 'border-brand-blue bg-brand-blue',
        variant === 'red' && 'border-brand-red bg-brand-red',
        variant === 'neutral' && 'border-border-default bg-surface-card',
        className,
      )}
    >
      <p
        className={cn(
          'text-[11px] font-medium uppercase tracking-wide',
          isColored ? 'text-white/75' : 'text-text-secondary',
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          'font-heading text-2xl font-bold',
          isColored ? 'text-white' : (valueClassName ?? 'text-text-primary'),
        )}
      >
        {value}
      </p>
      {sub && (
        <p className={cn('mt-0.5 text-[11px]', isColored ? 'text-white/60' : 'text-text-tertiary')}>
          {sub}
        </p>
      )}
    </div>
  );
}
