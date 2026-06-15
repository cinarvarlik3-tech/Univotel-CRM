import { StageLeadPage } from '@/components/leads/StageLeadPage';
import { useLeadRowActions } from '@/hooks/useLeadRowActions';
import { useSalespeople } from '@/hooks/useSalespeople';

export default function ExpectingCallPage() {
  const { data: salespeople } = useSalespeople();
  const { renderRowActions, dialogs } = useLeadRowActions({
    preset: 'call-awaiting',
    salespeople,
  });

  return (
    <>
      <StageLeadPage
        titleKey="expectingCall.title"
        stageFilter="&filter[funnel_status][in]=aranacak,arandi-acmadi"
        basePath="/leads/expecting-call"
        renderRowActions={renderRowActions}
      />
      {dialogs}
    </>
  );
}
