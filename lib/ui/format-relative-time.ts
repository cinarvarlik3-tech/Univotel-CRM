/**
 * Locale-aware relative time formatter for lead dwell pills (D13).
 * Produces Turkish strings like "3 gün önce", "az önce", "2 saat önce".
 */

/**
 * Formats a past timestamp as a human-readable Turkish relative string.
 * Used for the "last-contact age" pill on lead rows and slide-over header.
 * @param date - The past timestamp.
 * @returns Relative time string in Turkish.
 */
export function formatRelativeTime(date: Date): string {
  const nowMs = Date.now();
  const diffMs = nowMs - date.getTime();

  if (diffMs < 0) return 'az önce';

  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMinutes < 2) return 'az önce';
  if (diffMinutes < 60) return `${diffMinutes} dk önce`;
  if (diffHours < 24) return `${diffHours} saat önce`;
  if (diffDays === 1) return 'dün';
  if (diffDays < 30) return `${diffDays} gün önce`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} ay önce`;

  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears} yıl önce`;
}
