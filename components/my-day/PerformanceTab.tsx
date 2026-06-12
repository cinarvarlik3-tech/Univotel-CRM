/**
 * Performansım — personal performance tab.
 * A per-salesperson mirror of the manager Team Panel, scoped to the logged-in agent.
 * Layout: time-range selector → KPI tile row → conversion + connect clusters → secondary cluster.
 */
import { useState } from 'react';
import Link from 'next/link';
import {
  IconUsers,
  IconMessage,
  IconPhone,
  IconCalendarCheck,
  IconCash,
  IconFileCheck,
  IconArrowUpRight,
  IconArrowDownRight,
  IconPhoneCall,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { usePerformance, type PerformanceRange } from '@/hooks/usePerformance';
import { Skeleton } from '@/components/ui/skeleton';

// ── Loss reason labels ──────────────────────────────────────────────────────

const LOSS_REASON_LABELS: Record<string, string> = {
  price: 'Fiyat',
  location: 'Konum',
  competitor: 'Rakip',
  no_response: 'Cevap yok',
  not_student: 'Öğrenci değil',
  already_placed: 'Zaten yerleşti',
  timing: 'Zamanlama',
  plans_changed: 'Plan değişti',
  other: 'Diğer',
};

// ── KPI tile ────────────────────────────────────────────────────────────────

interface KpiTileProps {
  label: string;
  value: number;
  chip: string;
  icon: React.ComponentType<{ className?: string }>;
}

function KpiTile({ label, value, chip, icon: Icon }: KpiTileProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border-default bg-surface-card p-4 shadow-sm">
      <span className={cn('grid h-9 w-9 place-items-center rounded-xl', chip)}>
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <div className="text-2xl font-semibold tabular-nums text-text-primary">{value}</div>
        <div className="text-xs text-text-tertiary">{label}</div>
      </div>
    </div>
  );
}

// ── Progress row (for conversion ratios) ────────────────────────────────────

function ConversionRow({
  label,
  numerator,
  denominator,
}: {
  label: string;
  numerator: number;
  denominator: number;
}) {
  const pct = denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
  return (
    <div className="py-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-secondary">{label}</span>
        <span className="font-semibold tabular-nums text-text-primary">
          {pct}%
          <span className="ml-1 font-normal text-text-tertiary">
            ({numerator}/{denominator})
          </span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border-default/40">
        <div
          className="h-full rounded-full bg-brand-blue transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Card section shell ───────────────────────────────────────────────────────

function SectionCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border-default bg-surface-card p-5 shadow-sm',
        className,
      )}
    >
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
        {title}
      </p>
      {children}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function PerformanceTab() {
  const [range, setRange] = useState<PerformanceRange>('this_week');
  const { data, isLoading, error } = usePerformance(range);

  const funnel = data?.conversionFunnel ?? [];
  const claimed = funnel.find((s) => s.stage === 'claimed')?.count ?? 0;
  const visited = funnel.find((s) => s.stage === 'visited')?.count ?? 0;
  const downpayment = funnel.find((s) => s.stage === 'downpayment')?.count ?? 0;
  const dealSigned = funnel.find((s) => s.stage === 'deal_signed')?.count ?? 0;

  const kpi = data?.kpi;

  return (
    <div className="space-y-5">
      {/* Time-range selector */}
      <div className="flex justify-end">
        <div className="flex rounded-lg border border-border-default text-xs overflow-hidden">
          {(['this_week', 'this_month'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                'px-4 py-1.5 transition-colors',
                range === r ? 'bg-brand-blue text-white' : 'text-text-secondary hover:bg-row-hover',
              )}
            >
              {r === 'this_week' ? 'Bu hafta' : 'Bu ay'}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-brand-red">
          Veriler yüklenemedi.{' '}
          <button type="button" onClick={() => window.location.reload()} className="underline">
            Tekrar dene
          </button>
        </p>
      )}

      {data && (
        <>
          {/* KPI tile row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <KpiTile
              label="Leadlerim"
              value={kpi?.leads ?? 0}
              chip="bg-brand-blue/10 text-brand-blue"
              icon={IconUsers}
            />
            <KpiTile
              label="Mesaj"
              value={kpi?.messages ?? 0}
              chip="bg-teal-600/10 text-teal-700"
              icon={IconMessage}
            />
            <KpiTile
              label="Arama"
              value={kpi?.calls ?? 0}
              chip="bg-indigo-500/10 text-indigo-600"
              icon={IconPhone}
            />
            <KpiTile
              label="Ziyaret"
              value={kpi?.visits ?? 0}
              chip="bg-violet-500/10 text-violet-600"
              icon={IconCalendarCheck}
            />
            <KpiTile
              label="Kapora"
              value={kpi?.downpayments ?? 0}
              chip="bg-amber-500/10 text-amber-600"
              icon={IconCash}
            />
            <KpiTile
              label="Sözleşme"
              value={kpi?.dealsSigned ?? 0}
              chip="bg-emerald-500/10 text-emerald-600"
              icon={IconFileCheck}
            />
          </div>

          {/* Conversion + connect rate cluster */}
          <div className="grid gap-4 md:grid-cols-2">
            <SectionCard title="Dönüşümler">
              {claimed === 0 ? (
                <p className="text-xs text-text-tertiary">Bu dönemde veri yok.</p>
              ) : (
                <div className="divide-y divide-border-default/60">
                  <ConversionRow
                    label="Yeni → Sözleşme"
                    numerator={dealSigned}
                    denominator={claimed}
                  />
                  <ConversionRow
                    label="Yeni → Kapora"
                    numerator={downpayment}
                    denominator={claimed}
                  />
                  <ConversionRow
                    label="Ziyaret → Kapora"
                    numerator={downpayment}
                    denominator={visited}
                  />
                  <ConversionRow
                    label="Kapora → Sözleşme"
                    numerator={dealSigned}
                    denominator={downpayment}
                  />
                </div>
              )}
            </SectionCard>

            <SectionCard title="Bağlantı Oranı">
              {data.connectRate.total === 0 ? (
                <p className="text-xs text-text-tertiary">Bu dönemde giden arama yok.</p>
              ) : (
                <div className="flex flex-col items-center gap-4 py-2">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-4xl font-bold tabular-nums text-text-primary">
                        {Math.round((data.connectRate.rate ?? 0) * 100)}%
                      </span>
                      {(data.connectRate.rate ?? 0) >= 0.5 ? (
                        <IconArrowUpRight className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <IconArrowDownRight className="h-5 w-5 text-rose-600" />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-text-tertiary">
                      {data.connectRate.answered} / {data.connectRate.total} arama cevaplandı
                    </p>
                  </div>

                  <div className="flex w-full items-center gap-3">
                    <span className="flex items-center gap-1 text-xs text-emerald-600">
                      <IconPhoneCall className="h-3.5 w-3.5" />
                      {data.connectRate.answered} cevap
                    </span>
                    <div className="flex-1 overflow-hidden rounded-full bg-rose-100 dark:bg-rose-950/30">
                      <div
                        className="h-2 rounded-full bg-emerald-500 transition-all"
                        style={{
                          width: `${Math.round((data.connectRate.rate ?? 0) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-rose-600">
                      {data.connectRate.total - data.connectRate.answered} cevapsız
                    </span>
                  </div>
                </div>
              )}
            </SectionCard>
          </div>

          {/* Loss reasons + stuck leads */}
          <div className="grid gap-4 md:grid-cols-2">
            <SectionCard title="Kayıp Nedenleri">
              {data.lossReasons.length === 0 ? (
                <p className="text-xs text-text-tertiary">Bu dönemde kayıp yok.</p>
              ) : (
                <div className="space-y-2">
                  {data.lossReasons.map(({ reason, count }) => {
                    const total = data.lossReasons.reduce((s, r) => s + r.count, 0);
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={reason}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-secondary">
                            {LOSS_REASON_LABELS[reason] ?? reason}
                          </span>
                          <span className="font-medium text-text-primary tabular-nums">
                            {count}
                            <span className="ml-1 text-text-tertiary">({pct}%)</span>
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border-default/40">
                          <div
                            className="h-full rounded-full bg-rose-400 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Takılı Leadler">
              <div className="flex flex-col items-center gap-3 py-2 text-center">
                <span
                  className={cn(
                    'text-4xl font-bold tabular-nums',
                    data.stuckNewLeads > 0 ? 'text-amber-600' : 'text-text-tertiary',
                  )}
                >
                  {data.stuckNewLeads}
                </span>
                <p className="text-xs text-text-tertiary">
                  lead 7+ gündür &ldquo;Yeni&rdquo; aşamasında
                </p>
                {data.stuckNewLeads > 0 && (
                  <Link
                    href="/leads/mine?funnel_status=yeni"
                    className="text-xs font-medium text-brand-blue hover:underline"
                  >
                    Bunları gör →
                  </Link>
                )}
              </div>
            </SectionCard>
          </div>

          {/* Visit show-rate (secondary) */}
          <SectionCard title="Ziyaret Gösterim Oranı">
            {data.visitShowRate.attended + data.visitShowRate.failed === 0 ? (
              <p className="text-xs text-text-tertiary">Bu dönemde ziyaret yok.</p>
            ) : (
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-2xl font-semibold tabular-nums text-emerald-600">
                    {data.visitShowRate.attended}
                  </div>
                  <div className="text-xs text-text-tertiary">Geldi</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold tabular-nums text-rose-600">
                    {data.visitShowRate.failed}
                  </div>
                  <div className="text-xs text-text-tertiary">Gelmedi</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold tabular-nums text-text-primary">
                    {data.visitShowRate.rate !== null
                      ? `${Math.round(data.visitShowRate.rate * 100)}%`
                      : '—'}
                  </div>
                  <div className="text-xs text-text-tertiary">Gösterim oranı</div>
                </div>
              </div>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}
