import { StageLeadPage } from '@/components/leads/StageLeadPage';

export default function Restricted24hPage() {
  return (
    <StageLeadPage
      titleKey="restricted24h.title"
      stageFilter="&filter[is_24h_restricted][eq]=true"
      basePath="/leads/24h-restricted"
    />
  );
}
