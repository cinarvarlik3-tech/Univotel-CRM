import { StageLeadPage } from '@/components/leads/StageLeadPage';
import { useLeadRowActions } from '@/hooks/useLeadRowActions';
import { useSalespeople } from '@/hooks/useSalespeople';

export default function NurturePage() {
  const { data: salespeople } = useSalespeople();
  const { renderRowActions, dialogs } = useLeadRowActions({
    preset: 'nurture',
    salespeople,
  });

  return (
    <>
      <StageLeadPage
        titleKey="nurture.title"
        stageFilter="&filter[funnel_status][in]=arandi,bilgi-verildi,bizi-aradi-konustuk"
        basePath="/leads/nurture"
        renderRowActions={renderRowActions}
      />
      {dialogs}
    </>
  );
}
