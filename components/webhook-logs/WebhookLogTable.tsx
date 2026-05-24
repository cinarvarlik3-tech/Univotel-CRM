/**
 * Webhook audit log table with replay for failed entries.
 */
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { WebhookLogListItem } from '@/hooks/useWebhookLogs';

interface WebhookLogTableProps {
  items: WebhookLogListItem[];
  onReplay: (id: string) => Promise<void>;
}

/**
 * Displays webhook log rows.
 * @param props - Log items and replay handler.
 */
export function WebhookLogTable({ items, onReplay }: WebhookLogTableProps) {
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-text-secondary">No webhook logs found.</p>;
  }

  return (
    <div className="overflow-hidden rounded-[10px] border border-border-default bg-surface-card">
      <Table>
        <TableHeader>
          <TableRow className="h-[34px] hover:bg-transparent">
            <TableHead>Source</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Error</TableHead>
            <TableHead>Retries</TableHead>
            <TableHead>Created</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.source}</TableCell>
              <TableCell className="text-text-secondary">{row.event_type}</TableCell>
              <TableCell>{row.status}</TableCell>
              <TableCell className="text-text-secondary">{row.error_message ?? '—'}</TableCell>
              <TableCell className="text-text-secondary">{row.retry_count}</TableCell>
              <TableCell className="text-text-secondary">
                {new Date(row.created_at).toLocaleString()}
              </TableCell>
              <TableCell>
                {row.status === 'failed' && (
                  <Button type="button" onClick={() => onReplay(row.id)}>
                    Replay
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
