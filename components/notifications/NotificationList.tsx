/**
 * Manager notifications inbox with resolve actions.
 */
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { NotificationRow } from '@/types/domain';
import { displayLeadPhone } from '@/lib/ui/display-phone';

interface NotificationListProps {
  items: NotificationRow[];
  onResolve: (id: string) => Promise<void>;
}

/**
 * Renders unresolved alerts with resolve buttons.
 * @param props - Notification rows and resolve handler.
 */
export function NotificationList({ items, onResolve }: NotificationListProps) {
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-text-secondary">No unresolved alerts.</p>;
  }

  return (
    <div className="overflow-hidden rounded-[10px] border border-border-default bg-surface-card">
      <Table>
        <TableHeader>
          <TableRow className="h-[34px] hover:bg-transparent">
            <TableHead>Type</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Lead</TableHead>
            <TableHead>Created</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.alert_type}</TableCell>
              <TableCell className="max-w-[400px] whitespace-pre-wrap">{row.message}</TableCell>
              <TableCell>
                {row.lead_uuid ? (
                  <Link
                    href={`/leads/${row.lead_uuid}`}
                    className="text-brand-blue hover:underline"
                  >
                    {row.leads
                      ? displayLeadPhone(
                          row.leads as {
                            lead_phone: string;
                            source_details?: Record<string, unknown>;
                          },
                        )
                      : row.lead_uuid}
                  </Link>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell className="text-text-secondary">
                {new Date(row.created_at).toLocaleString()}
              </TableCell>
              <TableCell>
                <Button type="button" onClick={() => onResolve(row.id)}>
                  Resolve
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
