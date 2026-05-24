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
import { canAccessDniAdmin } from '@/lib/auth/roles';
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
      setError(json.error ?? 'Failed to load');
      setLoading(false);
      return;
    }
    setRows(json.data);
    setError(null);
    setLoading(false);
  }, []);

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

  return (
    <AppShell title="DNI Numbers">
      <form
        onSubmit={handleCreate}
        className="mb-6 grid gap-3 rounded-lg border p-4 md:grid-cols-4"
      >
        <Input
          placeholder="Virtual number (+90850...)"
          value={virtualNumber}
          onChange={(e) => setVirtualNumber(e.target.value)}
          required
        />
        <FormSelect
          value={source}
          onValueChange={setSource}
          options={SOURCE_OPTIONS.map((opt) => ({ value: opt, label: opt }))}
        />
        <Input
          placeholder="Display label"
          value={displayLabel}
          onChange={(e) => setDisplayLabel(e.target.value)}
          required
        />
        <Button type="submit">Add number</Button>
      </form>

      {error && <p className="mb-4 text-sm text-brand-red">{error}</p>}
      {loading && <p className="text-sm text-text-secondary">Loading...</p>}

      {!loading && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Number</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Leads</TableHead>
              <TableHead>Last lead</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.source}</TableCell>
                <TableCell>{row.virtual_number}</TableCell>
                <TableCell>{row.display_label}</TableCell>
                <TableCell>{row.is_active ? 'Yes' : 'No'}</TableCell>
                <TableCell>{row.lead_count}</TableCell>
                <TableCell>
                  {row.last_lead_at ? new Date(row.last_lead_at).toLocaleString('tr-TR') : '—'}
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => toggleActive(row)}
                  >
                    {row.is_active ? 'Deactivate' : 'Activate'}
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
