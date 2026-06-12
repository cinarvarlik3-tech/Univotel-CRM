/**
 * Ziyaret Sonrası Takip — post-visit nurture leads not contacted today.
 * Same 24h-approaching logic as Nurtures.
 */
import { TaskContainerCard } from './TaskContainerCard';
import { LeadTaskRow } from './LeadTaskRow';
import type { NurtureRow } from '@/lib/my-day/cockpit';

interface PostVisitCardProps {
  postVisit: NurtureRow[];
  isLoading?: boolean;
  onOpenLead: (uuid: string) => void;
  onAction: (uuid: string) => void;
}

export function PostVisitCard({ postVisit, isLoading, onOpenLead, onAction }: PostVisitCardProps) {
  return (
    <TaskContainerCard
      containerKey="postVisit"
      count={postVisit.length}
      isLoading={isLoading}
      isEmpty={!isLoading && postVisit.length === 0}
    >
      {postVisit.map((row) => (
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
