/**
 * GA4 enrichment cron job runner — batch attempts 2–4.
 */
import { processGa4EnrichmentBatch } from '@/lib/ga4/enrich-from-ga4';

/**
 * Processes pending GA4 enrichment rows eligible for cron retry.
 * @returns Number of rows processed in this run.
 */
export async function runGa4Enrichment(): Promise<number> {
  return processGa4EnrichmentBatch();
}
