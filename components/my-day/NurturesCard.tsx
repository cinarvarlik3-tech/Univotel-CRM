/**
 * Beslenecekler — nurture leads not contacted today.
 * Sorts 24h-approaching leads to the top with an amber badge.
 */
import { TaskContainerCard } from './TaskContainerCard';
import { LeadTaskRow } from './LeadTaskRow';
import type { NurtureRow } from '@/lib/my-day/cockpit';

interface NurturesCardProps {
  nurtures: NurtureRow[];
  isLoading?: boolean;
  onOpenLead: (uuid: string) => void;
  onAction: (uuid: string) => void;
}

export function NurturesCard({ nurtures, isLoading, onOpenLead, onAction }: NurturesCardProps) {
  return (
    <TaskContainerCard
      containerKey="nurtures"
      count={nurtures.length}
      isLoading={isLoading}
      isEmpty={!isLoading && nurtures.length === 0}
    >
      {nurtures.map((row) => (
        <LeadTaskRow
          key={row.uuid}
          row={{
            uuid: row.uuid,
            name: row.name,
            phone: row.phone,
            stage: row.stage,
            channel: row.channel,
            lastContactLabel: row.lastContactLabel,
            hoursUntil24h: row.hoursUntil24h,
            actionLabel: 'İletişim kaydet',
          }}
          onOpen={onOpenLead}
          onAction={onAction}
        />
      ))}
    </TaskContainerCard>
  );
}
