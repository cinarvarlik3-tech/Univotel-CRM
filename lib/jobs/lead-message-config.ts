/**
 * Runtime config for the lead-message notify cron, read from the cron_settings
 * table so windows can be tuned during peak season without a redeploy.
 * Missing or invalid rows fall back to the defaults below.
 */
import { NOTIFICATION_THROTTLE_MINUTES } from '@/lib/notifications/constants';
import { createServiceClient } from '@/lib/supabase/service';

/** Resolved config for a single cron run. */
export interface LeadMessageNotifyConfig {
  /** Master kill switch — when false the cron does nothing. */
  enabled: boolean;
  /** Minutes of recent Chatwoot agent activity that suppress ALL of a rep's pings. */
  activeWindowMinutes: number;
  /** Per-lead cooldown between pings to the same salesperson. */
  cooldownMinutes: number;
}

const DEFAULTS: LeadMessageNotifyConfig = {
  enabled: true,
  activeWindowMinutes: 5,
  cooldownMinutes: NOTIFICATION_THROTTLE_MINUTES.lead_message,
};

/** cron_settings keys this module reads. */
const KEYS = [
  'lead_notify_enabled',
  'chatwoot_active_window_minutes',
  'lead_message_cooldown_minutes',
] as const;

/**
 * Coerces a cron_settings string to a positive integer, or returns the fallback.
 * @param raw - Raw string value from cron_settings.
 * @param fallback - Default when missing or invalid.
 */
function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Loads the live notify config from cron_settings, falling back to defaults.
 */
export async function loadLeadMessageNotifyConfig(): Promise<LeadMessageNotifyConfig> {
  const client = createServiceClient();

  const { data, error } = await client
    .from('cron_settings')
    .select('key, value')
    .in('key', KEYS as unknown as string[]);

  if (error) {
    console.error('[lead-notify] cron_settings read failed, using defaults:', error.message);
    return { ...DEFAULTS };
  }

  const map = new Map((data ?? []).map((row) => [row.key, row.value]));

  return {
    enabled: (map.get('lead_notify_enabled') ?? 'true') !== 'false',
    activeWindowMinutes: parsePositiveInt(
      map.get('chatwoot_active_window_minutes'),
      DEFAULTS.activeWindowMinutes,
    ),
    cooldownMinutes: parsePositiveInt(
      map.get('lead_message_cooldown_minutes'),
      DEFAULTS.cooldownMinutes,
    ),
  };
}
