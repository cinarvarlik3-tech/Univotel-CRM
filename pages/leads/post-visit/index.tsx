import { StageLeadPage } from '@/components/leads/StageLeadPage';

export default function PostVisitPage() {
  return (
    <StageLeadPage
      titleKey="postVisit.title"
      stageFilter="&filter[funnel_status][in]=ziyaret-etti,teklif-gonderildi"
      basePath="/leads/post-visit"
    />
  );
}
