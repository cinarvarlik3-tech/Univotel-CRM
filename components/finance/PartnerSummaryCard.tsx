/**
 * FMS partner summary card for dashboard and partner pages.
 */
import Link from 'next/link';
import { IconBuilding } from '@tabler/icons-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { formatTry } from '@/lib/finance/format';
import type { PartnerSummary } from '@/lib/finance/types';

interface PartnerSummaryCardProps {
  partner: PartnerSummary;
  href?: string;
}

export function PartnerSummaryCard({ partner, href }: PartnerSummaryCardProps) {
  const { t } = useTranslation();
  const content = (
    <Card className={href ? 'transition-colors hover:border-brand-blue/40' : undefined}>
      <CardHeader className="flex flex-row items-start gap-3 pb-2">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
          <IconBuilding size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate">{partner.partnerName}</CardTitle>
          <p className="text-xs text-text-secondary">
            {t('fms.customerCount', {
              count: partner.properties.reduce((s, p) => s + p.customerCount, 0),
            })}
          </p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs text-text-secondary">{t('fms.revenue')}</p>
          <p className="font-semibold">{formatTry(partner.revenue)}</p>
        </div>
        <div>
          <p className="text-xs text-text-secondary">{t('fms.ourCut')}</p>
          <p className="font-semibold">{formatTry(partner.ourCut)}</p>
        </div>
        <div>
          <p className="text-xs text-text-secondary">{t('fms.profit')}</p>
          <p className="font-semibold">{formatTry(partner.profit)}</p>
        </div>
      </CardContent>
    </Card>
  );

  if (href && partner.partnerId) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
