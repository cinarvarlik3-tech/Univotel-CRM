/**
 * Team page — read-only salespeople list.
 */
import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSalespeople } from '@/hooks/useSalespeople';

/**
 * Renders read-only team member table.
 * @returns Team page wrapped in AppShell.
 */
export default function TeamPage() {
  const { data, error, isLoading } = useSalespeople();

  return (
    <AppShell title="Team">
      {isLoading && <Skeleton className="h-64 w-full" />}
      {error && <p className="text-sm text-brand-red">Failed to load team</p>}

      {data && (
        <div className="overflow-hidden rounded-[10px] border border-border-default bg-surface-card">
          <Table>
            <TableHeader>
              <TableRow className="h-[34px] hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((sp) => (
                <TableRow key={sp.id}>
                  <TableCell>{sp.full_name}</TableCell>
                  <TableCell className="text-text-secondary">{sp.email}</TableCell>
                  <TableCell className="text-text-secondary">{sp.role}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AppShell>
  );
}
