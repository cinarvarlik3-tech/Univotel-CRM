/**
 * NetGSM / Netsantral webhook endpoint — static token + CDR lead ingestion.
 */
import { createWebhookHandler } from '@/lib/webhooks/create-webhook-handler';
import { netgsmIdempotencyKey } from '@/lib/webhooks/idempotency-key';
import { processNetGsm, shouldSkipNetGsmLead } from '@/lib/webhooks/process-netgsm';
import { verifyNetGsmToken } from '@/lib/webhooks/verify';
import { normalizeNetGsmPayload } from '@/lib/webhooks/normalize-netgsm-payload';

const handler = createWebhookHandler({
  source: 'netgsm',
  verify: async (rawBody) => {
    try {
      const parsed = JSON.parse(rawBody) as Record<string, unknown>;
      const { token } = normalizeNetGsmPayload(parsed);
      if (!token) return true;
      return verifyNetGsmToken(token);
    } catch {
      return false;
    }
  },
  getIdempotencyKey: (parsed) => netgsmIdempotencyKey(parsed),
  shouldSkipProcessing: (parsed) => shouldSkipNetGsmLead(parsed),
  process: (parsed) => processNetGsm(parsed),
});

export default handler;
export const config = {
  api: {
    bodyParser: false,
  },
};
