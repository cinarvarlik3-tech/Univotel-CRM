import { StageLeadPage } from '@/components/leads/StageLeadPage';
import { useLeadRowActions } from '@/hooks/useLeadRowActions';
import { useSalespeople } from '@/hooks/useSalespeople';

export default function Restricted24hPage() {
  const { data: salespeople } = useSalespeople();
  const { renderRowActions, dialogs } = useLeadRowActions({
    preset: 'manager',
    salespeople,
  });

  return (
    <>
      <StageLeadPage
        titleKey="restricted24h.title"
        stageFilter="&filter[is_24h_restricted][eq]=true"
        basePath="/leads/24h-restricted"
        renderRowActions={renderRowActions}
      />
      {dialogs}
    </>
  );
}
