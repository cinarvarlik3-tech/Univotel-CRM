/**
 * Lead Hub table — unclaimed leads with per-row Claim button.
 */
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { formatEnumLabel } from '@/lib/i18n/enum-labels';
import { displayLeadContactIdentifier } from '@/lib/ui/display-phone';
import type { LeadRow } from '@/types/domain';

interface LeadHubTableProps {
  leads: LeadRow[];
  onClaimSuccess: (uuid: string) => void;
}

/**
 * Renders unassigned leads with a Claim button per row.
 * @param props - Lead rows and claim callback.
 * @returns Lead Hub table element.
 */
export function LeadHubTable({ leads, onClaimSuccess }: LeadHubTableProps) {
  const { locale, t } = useTranslation();
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const emDash = t('common.emDash');

  if (leads.length === 0) {
    return <p className="py-8 text-center text-sm text-text-secondary">{t('leadHub.noLeads')}</p>;
  }

  async function handleClaim(uuid: string) {
    setClaimingId(uuid);
    try {
      const res = await fetch(`/api/leads/${uuid}/claim`, { method: 'POST' });
      if (res.ok) {
        onClaimSuccess(uuid);
      }
    } finally {
      setClaimingId(null);
    }
  }

  return (
    <div className="overflow-hidden rounded-[10px] border border-border-default bg-surface-card">
      <Table>
        <TableHeader>
          <TableRow className="h-[34px] hover:bg-transparent">
            <TableHead>{t('leads.tableNameContact')}</TableHead>
            <TableHead>{t('leads.tableSource')}</TableHead>
            <TableHead>{t('leads.tableFunnelStatus')}</TableHead>
            <TableHead>{t('leads.tableStudentStage')}</TableHead>
            <TableHead className="w-[120px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.uuid}>
              <TableCell>
                <div className="font-medium">{lead.lead_name ?? emDash}</div>
                <div className="text-xs text-text-secondary">
                  {displayLeadContactIdentifier(lead)}
                </div>
              </TableCell>
              <TableCell className="text-text-secondary">
                {formatEnumLabel(locale, 'source', lead.lead_source)}
              </TableCell>
              <TableCell>
                <StatusBadge status={lead.funnel_status} type="funnel" />
              </TableCell>
              <TableCell className="text-text-secondary">
                {formatEnumLabel(locale, 'stage', lead.student_stage)}
              </TableCell>
              <TableCell>
                {/* D5: yeni / Lead Hub primary action = Claim */}
                <Button
                  type="button"
                  size="sm"
                  disabled={claimingId === lead.uuid}
                  onClick={() => handleClaim(lead.uuid)}
                >
                  {claimingId === lead.uuid ? t('leadHub.claiming') : t('leadHub.claim')}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
