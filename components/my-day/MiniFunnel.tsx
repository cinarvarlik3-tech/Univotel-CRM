/**
 * My Day mini funnel — personal compartment distribution bar.
 * Each segment deep-links to that compartment filtered to the user.
 */
import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

interface MiniFunnelProps {
  data: { compartment: string; count: number }[];
}

const COMPARTMENT_COLORS: Record<string, string> = {
  cold: 'bg-slate-400',
  'expecting-call': 'bg-amber-400',
  nurture: 'bg-blue-400',
  'will-visit': 'bg-violet-400',
  'failed-visit': 'bg-red-400',
  'post-visit-nurture': 'bg-sky-400',
  downpayment: 'bg-emerald-400',
  'deal-signed': 'bg-green-600',
};

const COMPARTMENT_LABELS: Record<string, string> = {
  cold: 'Cold',
  'expecting-call': 'Expecting call',
  nurture: 'Nurture',
  'will-visit': 'Will visit',
  'failed-visit': 'Failed visit',
  'post-visit-nurture': 'Post-visit',
  downpayment: 'Downpayment',
  'deal-signed': 'Deal signed',
};

export function MiniFunnel({ data }: MiniFunnelProps) {
  const { t } = useTranslation();
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-text-primary">{t('myDay.miniFunnel')}</p>
      {total === 0 ? (
        <p className="text-sm text-text-tertiary">{t('common.unassigned')}</p>
      ) : (
        <>
          <div className="flex h-3 w-full overflow-hidden rounded-full">
            {data
              .filter((d) => d.count > 0)
              .map((d) => (
                <div
                  key={d.compartment}
                  title={`${COMPARTMENT_LABELS[d.compartment] ?? d.compartment}: ${d.count}`}
                  style={{ width: `${(d.count / total) * 100}%` }}
                  className={cn(
                    'transition-all',
                    COMPARTMENT_COLORS[d.compartment] ?? 'bg-slate-300',
                  )}
                />
              ))}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
            {data
              .filter((d) => d.count > 0)
              .map((d) => (
                <Link
                  key={d.compartment}
                  href={`/leads/mine?compartment=${d.compartment}`}
                  className="flex items-center gap-1 text-[11px] text-text-secondary hover:text-text-primary"
                >
                  <span
                    className={cn(
                      'inline-block size-2 rounded-full',
                      COMPARTMENT_COLORS[d.compartment] ?? 'bg-slate-300',
                    )}
                  />
                  {COMPARTMENT_LABELS[d.compartment] ?? d.compartment}
                  <span className="font-medium text-text-primary">{d.count}</span>
                </Link>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
