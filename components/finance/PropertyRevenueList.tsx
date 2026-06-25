/**
 * FMS property list with revenue drill-down links.
 */
import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';
import { formatTry } from '@/lib/finance/format';
import type { PropertyRevenue } from '@/lib/finance/types';

interface PropertyRevenueListProps {
  properties: PropertyRevenue[];
  partnerId: string | null;
}

export function PropertyRevenueList({ properties, partnerId }: PropertyRevenueListProps) {
  const { t } = useTranslation();

  if (properties.length === 0) {
    return <p className="text-sm text-text-secondary">{t('fms.noProperties')}</p>;
  }

  const sorted = [...properties].sort((a, b) => b.propertyRevenue - a.propertyRevenue);

  return (
    <div className="overflow-hidden rounded-[10px] border border-border-default">
      <table className="w-full text-sm">
        <thead className="bg-surface-secondary text-left text-xs uppercase tracking-wide text-text-secondary">
          <tr>
            <th className="px-4 py-2.5 font-medium">{t('fms.property')}</th>
            <th className="px-4 py-2.5 font-medium">{t('fms.customers')}</th>
            <th className="px-4 py-2.5 font-medium text-right">{t('fms.revenue')}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((property) => {
            const href =
              partnerId != null
                ? `/fms/${partnerId}/${property.propertyId}`
                : `/fms/unattributed/${property.propertyId}`;
            return (
              <tr key={property.propertyId} className="border-t border-border-default">
                <td className="px-4 py-3">
                  <Link href={href} className="font-medium hover:text-brand-blue">
                    {property.propertyName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-text-secondary">{property.customerCount}</td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatTry(property.propertyRevenue)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
