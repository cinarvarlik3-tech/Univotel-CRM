/**
 * FMS customer list — scrollable rows with finance columns and lead panel action.
 */
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/useTranslation';
import { formatTry } from '@/lib/finance/format';
import type { CustomerListRow } from '@/lib/finance/types';

interface FmsCustomerListProps {
  customers: CustomerListRow[] | undefined;
  isLoading?: boolean;
  onViewLead: (leadId: string) => void;
}

export function FmsCustomerList({ customers, isLoading, onViewLead }: FmsCustomerListProps) {
  const { t } = useTranslation();

  if (isLoading && customers === undefined) {
    return <Skeleton className="min-h-[380px] w-full rounded-2xl" />;
  }

  const rows = customers ?? [];

  return (
    <div className="flex min-h-[380px] w-full flex-col rounded-2xl border border-border-default bg-surface-card shadow-sm">
      <div className="rounded-t-2xl bg-brand-blue px-5 py-4">
        <h3 className="text-base font-semibold text-white">{t('fms.customerList')}</h3>
      </div>

      {rows.length === 0 ? (
        <p className="flex flex-1 items-center justify-center px-5 text-sm text-text-tertiary">
          {t('fms.noCustomers')}
        </p>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="sticky top-0 z-10 bg-surface-card text-left text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
              <tr className="border-b border-border-default">
                <th className="px-4 py-2.5 font-medium">{t('fms.colName')}</th>
                <th className="px-4 py-2.5 font-medium">{t('fms.colProperty')}</th>
                <th className="px-4 py-2.5 font-medium">{t('fms.colRoom')}</th>
                <th className="px-4 py-2.5 font-medium text-right">{t('fms.colAmountMonthly')}</th>
                <th className="px-4 py-2.5 font-medium text-right">{t('fms.colAmountYearly')}</th>
                <th className="px-4 py-2.5 font-medium">{t('fms.colDealDuration')}</th>
                <th className="px-4 py-2.5 font-medium">{t('fms.colStage')}</th>
                <th className="px-4 py-2.5 font-medium text-right">{t('fms.viewInfo')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={`${row.propertyId}-${row.leadId}`}
                  className="border-b border-border-default/60 hover:bg-row-hover"
                >
                  <td className="px-4 py-2.5">
                    <span className="font-medium text-text-primary">{row.name ?? row.phone}</span>
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary">{row.propertyName}</td>
                  <td className="px-4 py-2.5 text-text-secondary">{row.roomTypeName}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {formatTry(row.effectiveMonthly)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                    {formatTry(row.leadRevenue)}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-text-secondary">
                    {row.dealDuration} {t('fms.monthsAbbr')}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge
                      status={row.funnelStatus}
                      type="funnel"
                      className="text-[10px] py-0 px-1.5"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() => onViewLead(row.leadId)}
                    >
                      {t('fms.viewInfo')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
