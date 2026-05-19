/**
 * Cloudflare Workers waitUntil helper with local dev fallback.
 * Allows webhook handlers to return 200 before async processing completes.
 */

/**
 * Runs async work after HTTP response is sent (Workers) or awaits in local dev.
 * @param promise - Async processing promise.
 */
export function runAfterResponse(promise: Promise<unknown>): void {
  const ctx = (globalThis as Record<string | symbol, unknown>)[
    Symbol.for('__cf_waitUntil')
  ] as ((p: Promise<unknown>) => void) | undefined;

  if (typeof ctx === 'function') {
    ctx(promise);
  } else {
    promise.catch((err) => {
      console.error('[wait-until] async processing failed:', err);
    });
  }
}
