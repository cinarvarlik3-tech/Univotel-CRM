/**
 * Displays hotel recommendation contenders from lead_details.rec_hotel.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import type { RecHotelItem } from '@/types/domain';

interface LeadRecHotelProps {
  recommendations: RecHotelItem[] | null;
  onSelect: (propertyId: string) => void;
}

/**
 * Renders up to three hotel recommendation cards with match tags.
 * @param props - Recommendations and select handler.
 * @returns Recommendation list or empty placeholder.
 */
export function LeadRecHotel({ recommendations, onSelect }: LeadRecHotelProps) {
  const { t } = useTranslation();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  if (!recommendations || recommendations.length === 0) {
    return <p className="text-sm text-text-secondary">{t('leads.recEmpty')}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {recommendations.map((item) => {
        const cardKey = item.property_id;
        const isSelected = selectedKey === cardKey;

        return (
          <div
            key={cardKey}
            className={cn(
              'rounded-lg border p-4 transition-colors',
              isSelected
                ? 'border-brand-blue bg-brand-blue/5 ring-1 ring-brand-blue'
                : 'border-border-default bg-surface-card',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-semibold text-text-primary">{item.hotel_name}</p>
                <p className="text-xs text-text-secondary">{item.district}</p>
              </div>
              {isSelected && (
                <span className="shrink-0 text-xs font-medium text-brand-blue">
                  {t('leads.recSelected')}
                </span>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.tags.length === 0 ? (
                <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  {t('leads.recAllMatch')}
                </span>
              ) : (
                item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800"
                  >
                    ✗ {tag}
                  </span>
                ))
              )}
            </div>

            <Button
              type="button"
              variant={isSelected ? 'secondary' : 'default'}
              size="sm"
              className="mt-3"
              onClick={() => {
                setSelectedKey(cardKey);
                // TODO: persist selected rec to lead_details.rec_hotel_selected once field is added
                onSelect(item.property_id);
              }}
            >
              {t('leads.recSelect')}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
