/**
 * FMS property customer table — per-lead contracted revenue.
 */
import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';
import { formatTry } from '@/lib/finance/format';
import type { PropertyCustomer } from '@/lib/finance/types';

interface PropertyCustomerTableProps {
  customers: PropertyCustomer[];
}

export function PropertyCustomerTable({ customers }: PropertyCustomerTableProps) {
  const { t } = useTranslation();

  if (customers.length === 0) {
    return <p className="text-sm text-text-secondary">{t('fms.noCustomers')}</p>;
  }

  const sorted = [...customers].sort((a, b) => b.leadRevenue - a.leadRevenue);

  return (
    <div className="overflow-hidden rounded-[10px] border border-border-default">
      <table className="w-full text-sm">
        <thead className="bg-surface-secondary text-left text-xs uppercase tracking-wide text-text-secondary">
          <tr>
            <th className="px-4 py-2.5 font-medium">{t('fms.customer')}</th>
            <th className="px-4 py-2.5 font-medium">{t('fms.roomType')}</th>
            <th className="px-4 py-2.5 font-medium">{t('fms.duration')}</th>
            <th className="px-4 py-2.5 font-medium text-right">{t('fms.monthly')}</th>
            <th className="px-4 py-2.5 font-medium text-right">{t('fms.discount')}</th>
            <th className="px-4 py-2.5 font-medium text-right">{t('fms.revenue')}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((customer) => (
            <tr key={customer.leadId} className="border-t border-border-default">
              <td className="px-4 py-3">
                <Link
                  href={`/leads/${customer.leadId}`}
                  className="font-medium hover:text-brand-blue"
                >
                  {customer.name ?? customer.phone}
                </Link>
                <p className="text-xs text-text-secondary">{customer.phone}</p>
              </td>
              <td className="px-4 py-3 text-text-secondary">{customer.roomTypeName}</td>
              <td className="px-4 py-3 text-text-secondary">
                {customer.dealDuration} {t('fms.monthsAbbr')}
              </td>
              <td className="px-4 py-3 text-right">{formatTry(customer.monthlyPayment)}</td>
              <td className="px-4 py-3 text-right">{formatTry(customer.discount)}</td>
              <td className="px-4 py-3 text-right font-medium">
                {formatTry(customer.leadRevenue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
