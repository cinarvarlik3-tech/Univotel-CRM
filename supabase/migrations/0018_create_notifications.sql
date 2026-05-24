-- Migration 0018: notifications — Phase 2 Telegram alert audit and throttle.

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL CHECK (
    alert_type IN (
      'sla_breach',
      'task_overdue',
      'unassigned_lead',
      'webhook_failure',
      'campaign_paused',
      'campaign_failed'
    )
  ),
  lead_uuid UUID REFERENCES leads (uuid) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks (id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  sent_to TEXT[] NOT NULL DEFAULT '{}',
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID REFERENCES salespeople (id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_throttle
  ON notifications (alert_type, lead_uuid, is_resolved, created_at DESC);

CREATE INDEX idx_notifications_unresolved
  ON notifications (created_at DESC)
  WHERE is_resolved = false;

COMMENT ON TABLE notifications IS 'Telegram alert audit log and throttle controller (Phase 2).';

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_manager_select ON notifications
  FOR SELECT
  TO authenticated
  USING (get_user_role() = 'manager');

CREATE POLICY notifications_manager_resolve ON notifications
  FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'manager')
  WITH CHECK (get_user_role() = 'manager');

GRANT SELECT ON notifications TO authenticated;
