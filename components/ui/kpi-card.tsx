/**
 * KPI metric card — colored (blue/red/amber) or neutral variants.
 */
import Link from 'next/link';
import { IconArrowUpRight } from '@tabler/icons-react';

import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  variant?: 'blue' | 'red' | 'amber' | 'green' | 'neutral';
  valueClassName?: string;
  labelClassName?: string;
  className?: string;
  href?: string;
  navigable?: boolean;
}

/**
 * Renders a dashboard KPI card per style guide spec.
 * @param props - Label, value, subtext, color variant, and optional navigation.
 * @returns KPI card element.
 */
export function KpiCard({
  label,
  value,
  sub,
  variant = 'neutral',
  valueClassName,
  labelClassName,
  className,
  href,
  navigable = false,
}: KpiCardProps) {
  const isColored =
    variant === 'blue' || variant === 'red' || variant === 'amber' || variant === 'green';

  const card = (
    <div
      className={cn(
        'relative rounded-[10px] border px-4 py-3.5',
        variant === 'blue' && 'border-brand-blue bg-brand-blue',
        variant === 'red' && 'border-brand-red bg-brand-red',
        variant === 'amber' && 'border-[var(--badge-warning-text)] bg-[var(--badge-warning-bg)]',
        variant === 'green' && 'border-emerald-600 bg-emerald-600',
        variant === 'neutral' && 'border-border-default bg-surface-card',
        href && 'transition-opacity hover:opacity-90',
        className,
      )}
    >
      {navigable && (
        <IconArrowUpRight
          className={cn(
            'absolute top-3.5 right-3.5 size-4',
            variant === 'amber' && 'text-[var(--badge-warning-text)]',
            variant !== 'amber' && variant !== 'green' && isColored && 'text-current opacity-70',
            variant === 'green' && 'text-white/70',
            variant === 'neutral' && 'text-text-tertiary',
          )}
          aria-hidden
        />
      )}
      <p
        className={cn(
          'text-[11px] font-medium uppercase tracking-wide',
          variant === 'blue' && 'text-white/75',
          variant === 'red' && 'text-white/75',
          variant === 'amber' && 'text-[var(--badge-warning-text)]/80',
          variant === 'green' && 'text-white/75',
          variant === 'neutral' && 'text-text-secondary',
          labelClassName,
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          'font-heading text-2xl font-bold',
          variant === 'blue' && 'text-white',
          variant === 'red' && 'text-white',
          variant === 'amber' && 'text-[var(--badge-warning-text)]',
          variant === 'green' && 'text-white',
          variant === 'neutral' && 'text-text-primary',
          valueClassName,
        )}
      >
        {value}
      </p>
      {sub && (
        <p
          className={cn(
            'mt-0.5 text-[11px]',
            variant === 'blue' && 'text-white/60',
            variant === 'red' && 'text-white/60',
            variant === 'amber' && 'text-[var(--badge-warning-text)]/70',
            variant === 'green' && 'text-white/60',
            variant === 'neutral' && 'text-text-tertiary',
          )}
        >
          {sub}
        </p>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {card}
      </Link>
    );
  }

  return card;
}
