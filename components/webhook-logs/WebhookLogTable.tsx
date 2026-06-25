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
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateTime } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { isReplayable, severityFor } from '@/lib/webhooks/webhook-outcome';
import type { WebhookLogListItem } from '@/hooks/useWebhookLogs';

interface WebhookLogTableProps {
  items: WebhookLogListItem[];
  onReplay: (id: string) => Promise<void>;
}

/** Severity → badge classes (info gray, warning amber, error red). */
const SEVERITY_CLASS: Record<string, string> = {
  info: 'bg-muted text-text-secondary',
  warning: 'bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)]',
  error: 'bg-brand-red/10 text-brand-red',
};

/**
 * Displays webhook log rows.
 * @param props - Log items and replay handler.
 */
export function WebhookLogTable({ items, onReplay }: WebhookLogTableProps) {
  const { locale, t } = useTranslation();
  const emDash = t('common.emDash');

  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-text-secondary">{t('webhooks.noLogs')}</p>;
  }

  return (
    <div className="overflow-hidden rounded-[10px] border border-border-default bg-surface-card">
      <Table>
        <TableHeader>
          <TableRow className="h-[34px] hover:bg-transparent">
            <TableHead>{t('webhooks.tableSource')}</TableHead>
            <TableHead>{t('webhooks.tableEvent')}</TableHead>
            <TableHead>{t('webhooks.tableStatus')}</TableHead>
            <TableHead>{t('webhooks.tableReason')}</TableHead>
            <TableHead>{t('webhooks.tableError')}</TableHead>
            <TableHead>{t('webhooks.tableRetries')}</TableHead>
            <TableHead>{t('webhooks.tableCreated')}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.source}</TableCell>
              <TableCell className="text-text-secondary">{row.event_type}</TableCell>
              <TableCell>
                <span
                  className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                    SEVERITY_CLASS[severityFor(row.status)] ?? SEVERITY_CLASS.info,
                  )}
                >
                  {row.status}
                </span>
              </TableCell>
              <TableCell className="text-text-secondary">{row.reason_code ?? emDash}</TableCell>
              <TableCell className="text-text-secondary">{row.error_message ?? emDash}</TableCell>
              <TableCell className="text-text-secondary">{row.retry_count}</TableCell>
              <TableCell className="text-text-secondary">
                {formatDateTime(row.created_at, locale)}
              </TableCell>
              <TableCell>
                {isReplayable(row.status) && (
                  <Button type="button" onClick={() => onReplay(row.id)}>
                    {t('webhooks.replay')}
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
