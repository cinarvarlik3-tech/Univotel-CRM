/**
 * Aranacaklar — leads awaiting a call, sorted coldest-first.
 */
import { TaskContainerCard } from './TaskContainerCard';
import { LeadTaskRow } from './LeadTaskRow';
import type { CallTaskRow } from '@/lib/my-day/cockpit';

interface CallsCardProps {
  calls: CallTaskRow[];
  isLoading?: boolean;
  onOpenLead: (uuid: string) => void;
  onAction: (uuid: string) => void;
}

export function CallsCard({ calls, isLoading, onOpenLead, onAction }: CallsCardProps) {
  return (
    <TaskContainerCard
      containerKey="calls"
      count={calls.length}
      isLoading={isLoading}
      isEmpty={!isLoading && calls.length === 0}
    >
      {calls.map((row) => (
        <LeadTaskRow
          key={row.uuid}
          row={{
            uuid: row.uuid,
            name: row.name,
            phone: row.phone,
            stage: row.stage,
            channel: row.channel,
            lastContactLabel: row.lastContactLabel,
            actionLabel: 'Ara',
          }}
          onOpen={onOpenLead}
          onAction={onAction}
        />
      ))}
    </TaskContainerCard>
  );
}
