/**
 * My Day performance tab — conversion funnel, visit show-rate, activity volume, task completion.
 */
import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { usePerformance, type PerformanceRange } from '@/hooks/usePerformance';

const FUNNEL_STAGE_LABELS: Record<string, string> = {
  claimed: 'Claimed',
  contacted: 'Contacted',
  visited: 'Visited',
  downpayment: 'Downpayment',
  deal_signed: 'Deal signed',
};

function StatRow({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between py-1.5 border-b border-border-default last:border-0">
      <span className="text-xs text-text-secondary">{label}</span>
      <span
        className={cn('text-sm font-semibold', accent ? 'text-brand-blue' : 'text-text-primary')}
      >
        {value}
        {sub && <span className="ml-1 text-xs font-normal text-text-tertiary">{sub}</span>}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border-default bg-surface-card px-4 py-3.5">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
        {title}
      </p>
      {children}
    </div>
  );
}

export function PerformanceTab() {
  const { t } = useTranslation();
  const [range, setRange] = useState<PerformanceRange>('this_week');
  const { data, isLoading, error } = usePerformance(range);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="flex rounded-md border border-border-default text-xs">
          {(['this_week', 'this_month'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                'px-3 py-1 transition-colors first:rounded-l-md last:rounded-r-md',
                range === r ? 'bg-brand-blue text-white' : 'text-text-secondary hover:bg-muted',
              )}
            >
              {r === 'this_week' ? t('myDay.thisWeek') : t('myDay.thisMonth')}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {error && <p className="text-sm text-brand-red">{t('myDay.failedToLoad')}</p>}

      {data && (
        <div className="space-y-3">
          {/* Conversion funnel */}
          <Section title={t('myDay.conversionFunnel')}>
            {data.conversionFunnel.every((s) => s.count === 0) ? (
              <p className="text-xs text-text-tertiary">{t('myDay.noPerformanceData')}</p>
            ) : (
              <>
                {data.conversionFunnel.map((step, i) => {
                  const prev = i > 0 ? data.conversionFunnel[i - 1].count : null;
                  const pct =
                    prev !== null && prev > 0 ? Math.round((step.count / prev) * 100) : null;
                  return (
                    <StatRow
                      key={step.stage}
                      label={FUNNEL_STAGE_LABELS[step.stage] ?? step.stage}
                      value={step.count}
                      sub={pct !== null ? `${pct}%` : undefined}
                      accent={step.stage === 'deal_signed'}
                    />
                  );
                })}
              </>
            )}
          </Section>

          {/* Visit show-rate */}
          <Section title={t('myDay.visitShowRate')}>
            {data.visitShowRate.attended + data.visitShowRate.failed === 0 ? (
              <p className="text-xs text-text-tertiary">{t('myDay.noPerformanceData')}</p>
            ) : (
              <>
                <StatRow label={t('myDay.attended')} value={data.visitShowRate.attended} />
                <StatRow label={t('myDay.failed')} value={data.visitShowRate.failed} />
                <StatRow
                  label={t('myDay.showRate')}
                  value={
                    data.visitShowRate.rate !== null
                      ? `${Math.round(data.visitShowRate.rate * 100)}%`
                      : '—'
                  }
                  accent
                />
              </>
            )}
          </Section>

          {/* Activity volume */}
          <Section title={t('myDay.activityVolume')}>
            {data.activityVolume.total === 0 ? (
              <p className="text-xs text-text-tertiary">{t('myDay.noPerformanceData')}</p>
            ) : (
              <>
                <StatRow label={t('myDay.calls')} value={data.activityVolume.calls} />
                <StatRow label={t('myDay.messages')} value={data.activityVolume.messages} />
                <StatRow label={t('myDay.contacts')} value={data.activityVolume.contacts} />
                <StatRow label={t('myDay.total')} value={data.activityVolume.total} accent />
              </>
            )}
          </Section>

          {/* Task completion */}
          <Section title={t('myDay.taskCompletion')}>
            {data.taskCompletion.total === 0 ? (
              <p className="text-xs text-text-tertiary">{t('myDay.noPerformanceData')}</p>
            ) : (
              <>
                <StatRow label={t('myDay.completed')} value={data.taskCompletion.completed} />
                <StatRow label={t('myDay.total')} value={data.taskCompletion.total} />
                <StatRow
                  label={t('myDay.rate')}
                  value={
                    data.taskCompletion.rate !== null
                      ? `${Math.round(data.taskCompletion.rate * 100)}%`
                      : '—'
                  }
                  accent
                />
              </>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
