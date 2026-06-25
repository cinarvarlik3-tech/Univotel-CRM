/**
 * Source attribution buckets for analytics overview.
 * Meta Ads / Google Ads are UI placeholders until UTM/referral resolver lands.
 */

export const SOURCE_BUCKET_IDS = [
  'meta_ads',
  'google_ads',
  'netgsm_call',
  'whatsapp_dm',
  'instagram_dm',
  'other',
] as const;

export type SourceBucketId = (typeof SOURCE_BUCKET_IDS)[number];

/** Wired buckets resolve from lead_source today; paid channels stay at 0 until resolver. */
const WIRED_BUCKETS = new Set<SourceBucketId>([
  'netgsm_call',
  'whatsapp_dm',
  'instagram_dm',
  'other',
]);

/**
 * Maps a raw lead_source value to an analytics bucket.
 * Meta/Google always map to `other` until the paid resolver is wired.
 */
export function resolveSourceBucket(leadSource: string | null | undefined): SourceBucketId {
  const src = leadSource ?? '';
  if (src === 'netgsm_call') return 'netgsm_call';
  if (src === 'whatsapp' || src === 'whatsapp_call') return 'whatsapp_dm';
  if (src === 'instagram') return 'instagram_dm';
  return 'other';
}

/** Whether a bucket count should be populated from live data (vs placeholder zero). */
export function isSourceBucketWired(bucket: SourceBucketId): boolean {
  return WIRED_BUCKETS.has(bucket);
}

/** Card display value — unwired paid buckets always return 0. */
export function sourceBucketCardCount(bucket: SourceBucketId, count: number): number {
  if (bucket === 'meta_ads' || bucket === 'google_ads') return 0;
  return count;
}

export function initSourceCounts(): Record<SourceBucketId, number> {
  return SOURCE_BUCKET_IDS.reduce(
    (acc, id) => {
      acc[id] = 0;
      return acc;
    },
    {} as Record<SourceBucketId, number>,
  );
}
