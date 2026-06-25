/**
 * Webhook processing outcome model.
 *
 * Processors return a WebhookOutcome instead of void so the log records what
 * actually happened — not merely "the function didn't throw". A thrown error is
 * recorded separately as a 'failed' outcome by runWithWebhookLog.
 *
 * severity (UI colour + alerting) and retryable (replay eligibility) are derived
 * from the status here, so they never drift from a stored column.
 */

/** Terminal outcome a processor can return (throwing maps to 'failed'). */
export type WebhookOutcomeStatus = 'success' | 'ignored' | 'dropped' | 'partial' | 'rejected';

/** Every terminal status recorded in webhook_logs (includes thrown 'failed'). */
export type WebhookTerminalStatus = WebhookOutcomeStatus | 'failed';

/** Structured result of processing a webhook. */
export interface WebhookOutcome {
  status: WebhookOutcomeStatus;
  /** Machine-readable sub-reason, e.g. 'schema_invalid', 'no_linked_lead', 'cdr_written'. */
  reasonCode: string;
  /** Human-readable detail for the audit log (stored in error_message). */
  detail?: string;
}

export type WebhookSeverity = 'info' | 'warning' | 'error';

interface StatusMeta {
  severity: WebhookSeverity;
  /** Whether a row in this status is eligible for manual replay. */
  retryable: boolean;
}

/** Single source of truth mapping each terminal status to its severity + replayability. */
export const WEBHOOK_STATUS_META: Record<WebhookTerminalStatus, StatusMeta> = {
  success: { severity: 'info', retryable: false },
  ignored: { severity: 'info', retryable: false },
  dropped: { severity: 'warning', retryable: true },
  partial: { severity: 'error', retryable: true },
  rejected: { severity: 'error', retryable: false },
  failed: { severity: 'error', retryable: true },
};

/** Statuses that warrant attention in the dashboard "needs attention" view. */
export const WEBHOOK_ATTENTION_STATUSES: WebhookTerminalStatus[] = [
  'failed',
  'partial',
  'rejected',
  'dropped',
];

/** True when a row in this status can be replayed from its stored payload. */
export function isReplayable(status: string): boolean {
  return (WEBHOOK_STATUS_META as Record<string, StatusMeta>)[status]?.retryable ?? false;
}

/** Severity for a status (defaults to 'info' for legacy/unknown values). */
export function severityFor(status: string): WebhookSeverity {
  return (WEBHOOK_STATUS_META as Record<string, StatusMeta>)[status]?.severity ?? 'info';
}

// ── Outcome constructors ─────────────────────────────────────────────────────

/** Processed successfully; intended side effects written. */
export function ok(reasonCode: string, detail?: string): WebhookOutcome {
  return { status: 'success', reasonCode, detail };
}

/** Intentional no-op by design (not a problem). */
export function ignored(reasonCode: string, detail?: string): WebhookOutcome {
  return { status: 'ignored', reasonCode, detail };
}

/** Valid payload but couldn't be actioned (missing prerequisite); retryable. */
export function dropped(reasonCode: string, detail?: string): WebhookOutcome {
  return { status: 'dropped', reasonCode, detail };
}

/** Some side effects written, some failed; retryable. */
export function partial(reasonCode: string, detail?: string): WebhookOutcome {
  return { status: 'partial', reasonCode, detail };
}

/** Payload invalid or unauthorized (permanent — replay won't help until fixed). */
export function rejected(reasonCode: string, detail?: string): WebhookOutcome {
  return { status: 'rejected', reasonCode, detail };
}
