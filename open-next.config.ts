/**
 * OpenNext Cloudflare adapter configuration for Workers deployment.
 * R2 incremental cache + DO queue for ISR / time-based revalidation (Pages Router).
 */
import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';
import doQueue from '@opennextjs/cloudflare/overrides/queue/do-queue';

export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  queue: doQueue,
});
