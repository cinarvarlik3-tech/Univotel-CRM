/**
 * Builds FMS sidebar navigation from canonical revenue totals.
 */
import {
  IconBuilding,
  IconCurrencyLira,
  IconHelpCircle,
  IconLayoutDashboard,
} from '@tabler/icons-react';
import type { NavGroup } from '@/components/layout/nav-types';
import type { FmsTotals } from '@/lib/finance/types';

type Translate = (key: string) => string;

/**
 * Converts FMS totals into sidebar nav groups (Overview, partners + properties, Unattributed).
 */
export function buildFmsNavGroups(totals: FmsTotals | undefined, t: Translate): NavGroup[] {
  const partners = totals?.partners ?? [];

  const items: NavGroup['items'] = [
    {
      href: '/fms',
      label: t('fms.navOverview'),
      icon: IconLayoutDashboard,
    },
    {
      href: '/fms/prices',
      label: t('fms.navPrices'),
      icon: IconCurrencyLira,
    },
  ];

  for (const partner of partners) {
    if (!partner.partnerId) continue;
    items.push({
      href: `/fms/${partner.partnerId}`,
      label: partner.partnerName,
      icon: IconBuilding,
      subItems: partner.properties.map((property) => ({
        href: `/fms/${partner.partnerId}/${property.propertyId}`,
        label: property.propertyName,
        icon: IconBuilding,
      })),
    });
  }

  if (totals?.unattributed && totals.unattributed.revenue > 0) {
    items.push({
      href: '/fms/unattributed',
      label: t('fms.navUnattributed'),
      icon: IconHelpCircle,
    });
  }

  return [{ items }];
}
