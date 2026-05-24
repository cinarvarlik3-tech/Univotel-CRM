-- Migration 0019: Backfill notifications for pre-existing breaches (run before throttle deploy).

INSERT INTO notifications (alert_type, lead_uuid, message, sent_to, is_resolved, created_at)
SELECT
  'sla_breach',
  uuid,
  'Phase 2 migration: pre-existing SLA breach',
  ARRAY[]::TEXT[],
  false,
  NOW()
FROM leads
WHERE sla_status = 'breached'
  AND is_deleted = false
  AND funnel_status NOT IN ('sozlesme-imzalandi', 'ziyaret-ama-almayacak', 'ilgilenmiyor');

INSERT INTO notifications (alert_type, lead_uuid, task_id, message, sent_to, is_resolved, created_at)
SELECT
  'task_overdue',
  lead_uuid,
  id,
  'Phase 2 migration: pre-existing overdue task',
  ARRAY[]::TEXT[],
  false,
  NOW()
FROM tasks
WHERE is_late = true
  AND is_completed = false;

INSERT INTO notifications (alert_type, lead_uuid, message, sent_to, is_resolved, created_at)
SELECT
  'unassigned_lead',
  uuid,
  'Phase 2 migration: pre-existing unassigned lead',
  ARRAY[]::TEXT[],
  false,
  NOW()
FROM leads
WHERE assigned_to IS NULL
  AND is_deleted = false
  AND funnel_status NOT IN ('sozlesme-imzalandi', 'ziyaret-ama-almayacak', 'ilgilenmiyor');
