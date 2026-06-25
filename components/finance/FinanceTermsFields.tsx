/**
 * Finance terms inputs — move-in month, deal duration, and discount.
 */
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/useTranslation';
import { DEFAULT_DEAL_DURATION, DEFAULT_DISCOUNT } from '@/lib/finance/kapora-gate';
import { defaultMoveInMonth } from '@/lib/finance/move-in-month';

export type FinanceTermsValue = {
  moveInMonth: string;
  dealDuration: number;
  discount: number;
};

interface FinanceTermsFieldsProps {
  value: FinanceTermsValue;
  onChange: (value: FinanceTermsValue) => void;
  maxDiscount?: number | null;
  roomTypeId?: string | null;
}

/**
 * Collects move-in month, deal duration, and discount for finance rows.
 */
export function FinanceTermsFields({
  value,
  onChange,
  maxDiscount,
  roomTypeId,
}: FinanceTermsFieldsProps) {
  const { t } = useTranslation();
  const [resolvedMax, setResolvedMax] = useState<number | null>(maxDiscount ?? null);
  const [priceError, setPriceError] = useState<string | null>(null);

  useEffect(() => {
    if (maxDiscount != null) {
      setResolvedMax(maxDiscount);
      return;
    }
    if (!roomTypeId || !value.moveInMonth) {
      setResolvedMax(null);
      setPriceError(null);
      return;
    }

    let cancelled = false;
    const qs = new URLSearchParams({
      roomTypeId,
      moveInMonth: value.moveInMonth,
    });
    void fetch(`/api/finance/price-for-month?${qs}`)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setResolvedMax(null);
          setPriceError(json.error ?? t('finance.priceUnavailable'));
          return;
        }
        setResolvedMax(json.data?.price ?? null);
        setPriceError(json.data?.price == null ? t('finance.priceUnavailable') : null);
      })
      .catch(() => {
        if (!cancelled) setPriceError(t('finance.priceUnavailable'));
      });

    return () => {
      cancelled = true;
    };
  }, [maxDiscount, roomTypeId, value.moveInMonth, t]);

  const discountCap = maxDiscount ?? resolvedMax;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="move_in_month">{t('finance.moveInMonth')}</Label>
        <Input
          id="move_in_month"
          type="month"
          value={value.moveInMonth}
          onChange={(e) => onChange({ ...value, moveInMonth: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">{t('finance.moveInMonthHint')}</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="deal_duration">{t('finance.dealDuration')}</Label>
        <Input
          id="deal_duration"
          type="number"
          min={1}
          max={12}
          value={value.dealDuration}
          onChange={(e) =>
            onChange({
              ...value,
              dealDuration: Number(e.target.value) || DEFAULT_DEAL_DURATION,
            })
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="discount">{t('finance.discount')}</Label>
        <Input
          id="discount"
          type="number"
          min={0}
          max={discountCap ?? undefined}
          step="0.01"
          value={value.discount}
          onChange={(e) =>
            onChange({
              ...value,
              discount: Number(e.target.value) || DEFAULT_DISCOUNT,
            })
          }
        />
        {discountCap != null && (
          <p className="text-xs text-muted-foreground">
            {t('finance.discountMaxHint', { max: discountCap })}
          </p>
        )}
        {priceError && <p className="text-xs text-brand-red">{priceError}</p>}
      </div>
    </div>
  );
}

export function defaultFinanceTerms(): FinanceTermsValue {
  return {
    moveInMonth: defaultMoveInMonth(),
    dealDuration: DEFAULT_DEAL_DURATION,
    discount: DEFAULT_DISCOUNT,
  };
}
