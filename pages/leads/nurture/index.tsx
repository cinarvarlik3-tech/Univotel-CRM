import { StageLeadPage } from '@/components/leads/StageLeadPage';

export default function NurturePage() {
  return (
    <StageLeadPage
      titleKey="nurture.title"
      stageFilter="&filter[funnel_status][in]=arandi,bilgi-verildi,bizi-aradi-konustuk"
      basePath="/leads/nurture"
    />
  );
}
