/**
 * FMS grand total metric cards.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { formatTry } from '@/lib/finance/format';

interface FmsGrandTotalsProps {
  grandRevenue: number;
  grandOurCut: number;
  grandProfit: number;
}

export function FmsGrandTotals({ grandRevenue, grandOurCut, grandProfit }: FmsGrandTotalsProps) {
  const { t } = useTranslation();

  const metrics = [
    { label: t('fms.totalRevenue'), value: grandRevenue },
    { label: t('fms.totalOurCut'), value: grandOurCut },
    { label: t('fms.totalProfit'), value: grandProfit },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {metrics.map((metric) => (
        <Card key={metric.label}>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-text-secondary">
              {metric.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tracking-tight">{formatTry(metric.value)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
