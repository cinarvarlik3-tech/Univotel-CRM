import { StageLeadPage } from '@/components/leads/StageLeadPage';

export default function ExpectingCallPage() {
  return (
    <StageLeadPage
      titleKey="expectingCall.title"
      stageFilter="&filter[funnel_status][in]=aranacak,arandi-acmadi"
      basePath="/leads/expecting-call"
    />
  );
}
