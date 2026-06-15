import { StageLeadPage } from '@/components/leads/StageLeadPage';
import { useLeadRowActions } from '@/hooks/useLeadRowActions';
import { useSalespeople } from '@/hooks/useSalespeople';

export default function PostVisitPage() {
  const { data: salespeople } = useSalespeople();
  const { renderRowActions, dialogs } = useLeadRowActions({
    preset: 'post-visit',
    salespeople,
  });

  return (
    <>
      <StageLeadPage
        titleKey="postVisit.title"
        stageFilter="&filter[funnel_status][in]=ziyaret-etti,teklif-gonderildi"
        basePath="/leads/post-visit"
        renderRowActions={renderRowActions}
      />
      {dialogs}
    </>
  );
}
