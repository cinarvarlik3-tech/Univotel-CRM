/**
 * FMS triple metric boxes — Client Revenue, Univotel Revenue, Client Profit.
 */
import { KpiCard } from '@/components/ui/kpi-card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/useTranslation';
import { formatTry } from '@/lib/finance/format';
import type { FmsMetricTriple } from '@/lib/finance/types';

interface FmsTripleBoxProps {
  metrics: FmsMetricTriple | undefined;
  /** True only on first load — keeps layout mounted while filters refetch. */
  isLoading?: boolean;
}

export function FmsTripleBox({ metrics, isLoading }: FmsTripleBoxProps) {
  const { t } = useTranslation();

  if (isLoading && metrics === undefined) {
    return (
      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[118px] rounded-[10px]" />
        ))}
      </div>
    );
  }

  const boxes = [
    {
      label: t('fms.clientRevenue'),
      value: formatTry(metrics?.revenue ?? 0),
      variant: 'blue' as const,
    },
    {
      label: t('fms.univotelRevenue'),
      value: formatTry(metrics?.ourCut ?? 0),
      variant: 'red' as const,
    },
    {
      label: t('fms.clientProfit'),
      value: formatTry(metrics?.profit ?? 0),
      variant: 'blue' as const,
    },
  ];

  return (
    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
      {boxes.map((box) => (
        <KpiCard
          key={box.label}
          label={box.label}
          value={box.value}
          variant={box.variant}
          className="flex min-h-[118px] flex-col items-start justify-start gap-2.5 px-5 py-5"
          labelClassName="text-[13px] font-semibold normal-case tracking-normal"
          valueClassName="text-3xl"
        />
      ))}
    </div>
  );
}
