import { StageLeadPage } from '@/components/leads/StageLeadPage';

export default function MovedInPage() {
  return (
    <StageLeadPage
      titleKey="movedIn.title"
      stageFilter="&filter[has_moved_in][eq]=true"
      basePath="/leads/moved-in"
    />
  );
}
