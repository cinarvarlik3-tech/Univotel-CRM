/**
 * Six source attribution KPI cards with brand styling.
 */
import {
  IconBrandGoogle,
  IconBrandInstagram,
  IconBrandMeta,
  IconBrandWhatsapp,
  IconPhone,
  IconQuestionMark,
} from '@tabler/icons-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { CalcNote } from '@/components/analytics/overview/CalcNote';
import { useTranslation } from '@/hooks/useTranslation';
import { formatNumber } from '@/lib/i18n';
import { SOURCE_BUCKET_IDS, type SourceBucketId } from '@/lib/analytics/source-buckets';
import { cn } from '@/lib/utils';

const CARD_STYLES: Record<
  SourceBucketId,
  { className: string; iconClass: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  meta_ads: {
    className: 'border-[#1877F2] bg-[#1877F2]',
    iconClass: 'text-white',
    Icon: IconBrandMeta,
  },
  google_ads: {
    className: 'border-border-default bg-surface-card',
    iconClass: 'text-text-primary',
    Icon: IconBrandGoogle,
  },
  netgsm_call: {
    className: 'border-slate-400 bg-slate-500',
    iconClass: 'text-white',
    Icon: IconPhone,
  },
  whatsapp_dm: {
    className: 'border-[#25D366] bg-[#25D366]',
    iconClass: 'text-white',
    Icon: IconBrandWhatsapp,
  },
  instagram_dm: {
    className: 'border-transparent bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCAF45]',
    iconClass: 'text-white',
    Icon: IconBrandInstagram,
  },
  other: {
    className: 'border-border-default bg-surface-card',
    iconClass: 'text-text-secondary',
    Icon: IconQuestionMark,
  },
};

const LABEL_KEYS: Record<SourceBucketId, string> = {
  meta_ads: 'analytics.sourceMetaAds',
  google_ads: 'analytics.sourceGoogleAds',
  netgsm_call: 'analytics.sourceNetgsmCall',
  whatsapp_dm: 'analytics.sourceWhatsappDm',
  instagram_dm: 'analytics.sourceInstagramDm',
  other: 'analytics.sourceOther',
};

interface SourceAttributionCardsProps {
  counts: Record<SourceBucketId, number>;
  showCalcNotes?: boolean;
}

export function SourceAttributionCards({
  counts,
  showCalcNotes = false,
}: SourceAttributionCardsProps) {
  const { locale, t } = useTranslation();

  return (
    <div className="flex flex-col gap-2">
      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {SOURCE_BUCKET_IDS.map((id) => {
          const style = CARD_STYLES[id];
          const isNeutral = id === 'google_ads' || id === 'other';
          const { Icon } = style;

          return (
            <div
              key={id}
              className={cn(
                'relative flex min-h-[100px] flex-col justify-between rounded-[10px] border px-4 py-3.5',
                style.className,
              )}
            >
              <Icon className={cn('size-5', style.iconClass)} aria-hidden />
              <div>
                <p
                  className={cn(
                    'text-[11px] font-medium uppercase tracking-wide',
                    isNeutral ? 'text-text-secondary' : 'text-white/75',
                  )}
                >
                  {t(LABEL_KEYS[id])}
                </p>
                <p
                  className={cn(
                    'font-heading text-2xl font-bold tabular-nums',
                    isNeutral ? 'text-text-primary' : 'text-white',
                  )}
                >
                  {formatNumber(counts[id] ?? 0, locale)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <CalcNote text={t('analytics.explainSourceCards')} show={showCalcNotes} />
    </div>
  );
}
