import { StageLeadPage } from '@/components/leads/StageLeadPage';

export default function DownpaymentPage() {
  return (
    <StageLeadPage
      titleKey="downpayment.title"
      stageFilter="&filter[funnel_status][eq]=kapora-alindi"
      basePath="/leads/downpayment"
    />
  );
}
