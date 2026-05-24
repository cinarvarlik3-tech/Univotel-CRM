/**
 * Cloudflare Workers waitUntil helper with local dev fallback.
 * Used for campaign workers and cron paths that return before long-running work finishes.
 */
import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * Runs async work via Workers ctx.waitUntil when available; otherwise fire-and-forget.
 * @param promise - Async processing promise.
 */
export function runAfterResponse(promise: Promise<unknown>): void {
  try {
    const { ctx } = getCloudflareContext();
    if (typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(promise);
      return;
    }
  } catch {
    // Not running inside OpenNext Cloudflare request context (e.g. local dev).
  }

  void promise.catch((err) => {
    console.error('[wait-until] async processing failed:', err);
  });
}
