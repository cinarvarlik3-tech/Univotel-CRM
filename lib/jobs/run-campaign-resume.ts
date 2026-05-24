/**
 * Resumes campaign workers for running/paused campaigns with pending leads.
 */
import { runCampaignWorker } from '@/lib/campaigns/run-campaign-worker';
import { runAfterResponse } from '@/lib/webhooks/wait-until';
import { createServiceClient } from '@/lib/supabase/service';

const DAILY_QUOTA_PAUSE = 950;

/**
 * Kicks workers for campaigns that have pending leads and are eligible to run.
 * @returns Number of workers started.
 */
export async function runCampaignResumeCheck(): Promise<number> {
  const client = createServiceClient();

  const { data: campaigns, error } = await client
    .from('campaigns')
    .select('id, status, daily_send_count')
    .in('status', ['running', 'paused']);

  if (error) {
    throw new Error(`Failed to list campaigns: ${error.message}`);
  }

  let started = 0;

  for (const campaign of campaigns ?? []) {
    if (campaign.status === 'paused' && (campaign.daily_send_count ?? 0) >= DAILY_QUOTA_PAUSE) {
      continue;
    }

    const { count } = await client
      .from('campaign_leads')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaign.id)
      .eq('status', 'pending');

    if ((count ?? 0) === 0) continue;

    if (campaign.status === 'paused') {
      await client
        .from('campaigns')
        .update({ status: 'running', paused_at: null })
        .eq('id', campaign.id);
    }

    runAfterResponse(runCampaignWorker(campaign.id));
    started++;
  }

  return started;
}
