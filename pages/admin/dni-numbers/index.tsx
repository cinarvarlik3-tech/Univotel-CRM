/**
 * Superadmin DNI numbers management page.
 */
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { FormSelect } from '@/components/ui/form-select';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { canAccessDniAdmin } from '@/lib/auth/roles';
import { formatDateTime, formatEnumLabel, formatYesNo } from '@/lib/i18n';
import { useRouter } from 'next/router';

interface DniNumberRow {
  id: string;
  virtual_number: string;
  source: string;
  display_label: string;
  is_active: boolean;
  lead_count: number;
  last_lead_at: string | null;
}

const SOURCE_OPTIONS = [
  'google-ads',
  'meta-ads',
  'organic',
  'ituyurt',
  'galatasarayyurt',
  'kampushan',
  'academic-house',
];

/**
 * Renders superadmin DNI numbers CRUD table.
 * @returns Admin DNI page.
 */
export default function AdminDniNumbersPage() {
  const router = useRouter();
  const { locale, t } = useTranslation();
  const { user } = useAuth();
  const [rows, setRows] = useState<DniNumberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [virtualNumber, setVirtualNumber] = useState('');
  const [source, setSource] = useState('google-ads');
  const [displayLabel, setDisplayLabel] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/dni-numbers');
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? t('admin.failedToLoad'));
      setLoading(false);
      return;
    }
    setRows(json.data);
    setError(null);
    setLoading(false);
  }, [t]);

  useEffect(() => {
    if (user && !canAccessDniAdmin(user.role)) {
      router.replace('/leads');
      return;
    }
    if (user) void load();
  }, [user, router, load]);

  async function toggleActive(row: DniNumberRow) {
    const res = await fetch(`/api/admin/dni-numbers/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !row.is_active }),
    });
    if (res.ok) await load();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/dni-numbers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        virtual_number: virtualNumber,
        source,
        display_label: displayLabel,
        is_active: true,
      }),
    });
    if (res.ok) {
      setVirtualNumber('');
      setDisplayLabel('');
      await load();
    }
  }

  if (!user || !canAccessDniAdmin(user.role)) return null;

  const emDash = t('common.emDash');

  return (
    <AppShell title={t('admin.dniTitle')}>
      <form
        onSubmit={handleCreate}
        className="mb-6 grid gap-3 rounded-lg border p-4 md:grid-cols-4"
      >
        <Input
          placeholder={t('admin.virtualNumberPlaceholder')}
          value={virtualNumber}
          onChange={(e) => setVirtualNumber(e.target.value)}
          required
        />
        <FormSelect
          value={source}
          onValueChange={setSource}
          options={SOURCE_OPTIONS.map((opt) => ({
            value: opt,
            label: formatEnumLabel(locale, 'source', opt),
          }))}
        />
        <Input
          placeholder={t('admin.displayLabelPlaceholder')}
          value={displayLabel}
          onChange={(e) => setDisplayLabel(e.target.value)}
          required
        />
        <Button type="submit">{t('admin.addNumber')}</Button>
      </form>

      {error && <p className="mb-4 text-sm text-brand-red">{error}</p>}
      {loading && <p className="text-sm text-text-secondary">{t('common.loading')}</p>}

      {!loading && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('admin.tableSource')}</TableHead>
              <TableHead>{t('admin.tableNumber')}</TableHead>
              <TableHead>{t('admin.tableLabel')}</TableHead>
              <TableHead>{t('admin.tableActive')}</TableHead>
              <TableHead>{t('admin.tableLeads')}</TableHead>
              <TableHead>{t('admin.tableLastLead')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{formatEnumLabel(locale, 'source', row.source)}</TableCell>
                <TableCell>{row.virtual_number}</TableCell>
                <TableCell>{row.display_label}</TableCell>
                <TableCell>{formatYesNo(row.is_active, locale)}</TableCell>
                <TableCell>{row.lead_count}</TableCell>
                <TableCell>
                  {row.last_lead_at ? formatDateTime(row.last_lead_at, locale) : emDash}
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => toggleActive(row)}
                  >
                    {row.is_active ? t('common.deactivate') : t('common.activate')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </AppShell>
  );
}
