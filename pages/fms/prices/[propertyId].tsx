/**
 * FMS seasonal room price admin — manage room_type_prices for one property.
 */
import { useRouter } from 'next/router';
import { useState } from 'react';
import { FmsShell } from '@/components/finance/FmsShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useRoomTypePrices } from '@/hooks/useFms';
import { useTranslation } from '@/hooks/useTranslation';
import { defaultMoveInMonth } from '@/lib/finance/move-in-month';
import { formatTry } from '@/lib/finance/format';

function monthInputFromDate(date: string): string {
  return date.slice(0, 7);
}

export default function FmsPropertyPricesPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const propertyId = typeof router.query.propertyId === 'string' ? router.query.propertyId : null;
  const { data, error, isLoading, mutate } = useRoomTypePrices(propertyId);

  const [addingForRoom, setAddingForRoom] = useState<string | null>(null);
  const [form, setForm] = useState({
    price: '',
    validFrom: defaultMoveInMonth(),
    validUntil: '',
    label: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleAdd(roomTypeId: string) {
    const price = Number(form.price);
    if (!price || price < 0) {
      setFormError(t('fms.pricesAmount'));
      return;
    }
    setSaving(true);
    setFormError(null);
    const res = await fetch('/api/fms/room-type-prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_type_id: roomTypeId,
        price,
        valid_from_month: form.validFrom,
        valid_until_month: form.validUntil || null,
        label: form.label || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setFormError(json.error ?? t('fms.failedToLoad'));
      return;
    }
    setAddingForRoom(null);
    setForm({ price: '', validFrom: defaultMoveInMonth(), validUntil: '', label: '' });
    void mutate();
  }

  return (
    <FmsShell title={t('fms.pricesTitle')}>
      {isLoading && <Skeleton className="h-64 w-full" />}
      {error && <p className="text-sm text-brand-red">{t('fms.failedToLoad')}</p>}

      {data && (
        <div className="space-y-6">
          {data.roomTypes.map((room) => {
            const periods = data.prices.filter((p) => p.room_type_id === room.id);
            return (
              <section key={room.id} className="rounded-lg border border-border-default p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold">{room.name}</h2>
                  <Button size="sm" variant="secondary" onClick={() => setAddingForRoom(room.id)}>
                    {t('fms.pricesAddPeriod')}
                  </Button>
                </div>

                {periods.length === 0 && (
                  <p className="text-sm text-text-secondary">{t('fms.pricesNoPeriods')}</p>
                )}

                <ul className="space-y-2 text-sm">
                  {periods.map((p) => (
                    <li key={p.id} className="flex flex-wrap gap-x-3 gap-y-1">
                      <span className="font-medium">{formatTry(Number(p.price))}</span>
                      <span className="text-text-secondary">
                        {monthInputFromDate(p.valid_from_month)} →{' '}
                        {p.valid_until_month
                          ? monthInputFromDate(p.valid_until_month)
                          : t('fms.pricesOpenEnded')}
                      </span>
                      {p.label && <span className="text-text-tertiary">({p.label})</span>}
                    </li>
                  ))}
                </ul>

                {addingForRoom === room.id && (
                  <div className="mt-4 grid gap-3 border-t border-border-default pt-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>{t('fms.pricesAmount')}</Label>
                      <Input
                        type="number"
                        min={0}
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t('fms.pricesLabel')}</Label>
                      <Input
                        value={form.label}
                        placeholder="summer / academic"
                        onChange={(e) => setForm({ ...form, label: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t('fms.pricesFromMonth')}</Label>
                      <Input
                        type="month"
                        value={form.validFrom}
                        onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t('fms.pricesUntilMonth')}</Label>
                      <Input
                        type="month"
                        value={form.validUntil}
                        onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                      />
                    </div>
                    {formError && (
                      <p className="text-xs text-brand-red sm:col-span-2">{formError}</p>
                    )}
                    <div className="flex gap-2 sm:col-span-2">
                      <Button disabled={saving} onClick={() => void handleAdd(room.id)}>
                        {saving ? t('common.saving') : t('common.save')}
                      </Button>
                      <Button variant="ghost" onClick={() => setAddingForRoom(null)}>
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </FmsShell>
  );
}
