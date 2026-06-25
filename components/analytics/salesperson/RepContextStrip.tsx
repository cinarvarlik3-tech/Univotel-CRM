/**
 * Muted context strip shown above the rep detail sections.
 * Displays rep avatar (initials), capacity, shift, tenure, and source mix bar.
 */
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import type { SalespersonRepInfo } from '@/lib/analytics/salesperson';

interface RepContextStripProps {
  rep: SalespersonRepInfo;
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function RepContextStrip({ rep }: RepContextStripProps) {
  const { t } = useTranslation();

  const totalLeads = rep.sourceMix.reduce((s, m) => s + m.count, 0);

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border-default bg-surface-card/50 px-4 py-3">
      {/* Avatar + name */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-blue text-sm font-semibold text-white">
          {initials(rep.fullName)}
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary">{rep.fullName}</p>
          {!rep.isActive && (
            <span className="text-[10px] uppercase text-text-tertiary">
              {t('analytics.inactive')}
            </span>
          )}
        </div>
      </div>

      <div className="h-6 w-px bg-border-default" aria-hidden />

      {/* Capacity */}
      <div className="flex flex-col">
        <span className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
          {t('analytics.spRepCapacity')}
        </span>
        <span className="text-sm font-semibold tabular-nums text-text-primary">
          {rep.activeLeadCount}/{rep.maxActiveLeads}
        </span>
      </div>

      {/* Shift */}
      <div className="flex flex-col">
        <span className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
          {t('analytics.spRepShift')}
        </span>
        <span className="text-sm font-semibold text-text-primary">
          {rep.shiftStart}–{rep.shiftEnd}
        </span>
      </div>

      {/* Tenure */}
      <div className="flex flex-col">
        <span className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
          {t('analytics.spRepTenure')}
        </span>
        <span className="text-sm font-semibold tabular-nums text-text-primary">
          {rep.tenureDays} {t('analytics.spRepDays')}
        </span>
      </div>

      {/* Source mix bar */}
      {rep.sourceMix.length > 0 && totalLeads > 0 && (
        <>
          <div className="h-6 w-px bg-border-default" aria-hidden />
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
              {t('analytics.spRepSourceMix')}
            </span>
            <div className="flex h-2 w-40 overflow-hidden rounded-full">
              {rep.sourceMix.map((s, i) => (
                <SourceSegment
                  key={s.source}
                  source={s.source}
                  pct={(s.count / totalLeads) * 100}
                  index={i}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              {rep.sourceMix.slice(0, 3).map((s) => (
                <span key={s.source} className="text-[10px] text-text-tertiary">
                  {s.source} ({s.count})
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const SEGMENT_COLORS = [
  'bg-brand-blue',
  'bg-[#6b7fe3]',
  'bg-[#b83228]',
  'bg-[#0e7490]',
  'bg-[#6d28d9]',
  'bg-[#b06000]',
];

function SourceSegment({ pct, index }: { source: string; pct: number; index: number }) {
  return (
    <div
      className={cn('h-full shrink-0', SEGMENT_COLORS[index % SEGMENT_COLORS.length])}
      style={{ width: `${pct}%` }}
    />
  );
}
