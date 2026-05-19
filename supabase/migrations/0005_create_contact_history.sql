-- Migration 0005: Create append-only contact_history audit log.

CREATE TABLE contact_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_uuid UUID NOT NULL REFERENCES leads(uuid) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (
    interaction_type IN (
      'call_success',
      'call_fail',
      'message_sent',
      'message_received',
      'whatsapp_call',
      'status_change',
      'duplicate_submission',
      'reassignment',
      'form_submitted',
      'callback_scheduled',
      'correction'
    )
  ),
  interaction_source TEXT CHECK (
    interaction_source IN ('whatsapp', 'instagram', 'netgsm', 'manual')
  ),
  funnel_status_at_time TEXT,
  previous_status TEXT,
  status_changed BOOLEAN NOT NULL DEFAULT false,
  salesperson_id UUID REFERENCES salespeople(id) ON DELETE SET NULL,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE contact_history IS 'Append-only interaction audit log. Never update or delete rows.';
