import { StageLeadPage } from '@/components/leads/StageLeadPage';

export default function DealSignedPage() {
  return (
    <StageLeadPage
      titleKey="dealSigned.title"
      stageFilter="&filter[funnel_status][eq]=sozlesme-imzalandi"
      basePath="/leads/deal-signed"
    />
  );
}
