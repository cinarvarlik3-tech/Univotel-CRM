/**
 * Starts an outbound_message campaign — segment resolve, campaign_leads bulk insert, worker kick.
 */
import { countSegmentLeads, resolveSegmentLeadUuids } from '@/lib/campaigns/resolve-segment';
import { createServiceClient } from '@/lib/supabase/service';
import type { CampaignSegment } from '@/types/domain';

/** Result of starting a campaign. */
export interface StartCampaignResult {
  started: true;
  leadCount: number;
}

/**
 * Validates and starts a campaign worker for the given campaign id.
 * @param campaignId - Campaign UUID.
 * @returns Lead count enqueued.
 * @throws Error with user-facing message on validation failure.
 */
export async function startCampaign(campaignId: string): Promise<StartCampaignResult> {
  const client = createServiceClient();

  const { data: campaign, error } = await client
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .maybeSingle();

  if (error) throw new Error('Failed to load campaign');
  if (!campaign) throw new Error('Campaign not found');

  if (campaign.campaign_type === 'outbound_call') {
    throw new Error('outbound_call campaigns are not yet supported.');
  }

  const segment = campaign.segment as unknown as CampaignSegment;
  const count = await countSegmentLeads(segment, campaign.language);

  if (count === 0) {
    throw new Error('No leads match this segment.');
  }

  const leadUuids = await resolveSegmentLeadUuids(segment, campaign.language);

  const rows = leadUuids.map((lead_uuid) => ({
    campaign_id: campaignId,
    lead_uuid,
    status: 'pending' as const,
  }));

  if (rows.length > 0) {
    const { error: insertError } = await client.from('campaign_leads').upsert(rows, {
      onConflict: 'campaign_id,lead_uuid',
      ignoreDuplicates: true,
    });

    if (insertError) throw new Error('Failed to create campaign leads');
  }

  const { error: updateError } = await client
    .from('campaigns')
    .update({ status: 'running' })
    .eq('id', campaignId);

  if (updateError) throw new Error('Failed to start campaign');

  return { started: true, leadCount: leadUuids.length };
}
