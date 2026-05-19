-- Migration 0007: Indexes and RPC helpers for routing and search.

CREATE UNIQUE INDEX idx_leads_lead_phone_active ON leads (lead_phone) WHERE is_deleted = false;

CREATE INDEX idx_leads_parent_phone ON leads (parent_phone);
CREATE INDEX idx_leads_funnel_status ON leads (funnel_status);
CREATE INDEX idx_leads_assigned_to ON leads (assigned_to);
CREATE INDEX idx_leads_student_stage ON leads (student_stage);
CREATE INDEX idx_leads_sla_deadline ON leads (sla_deadline ASC);
CREATE INDEX idx_leads_lead_score ON leads (lead_score DESC);
CREATE INDEX idx_leads_is_deleted ON leads (is_deleted);
CREATE INDEX idx_leads_created_at ON leads (created_at DESC);
CREATE INDEX idx_leads_funnel_assigned ON leads (funnel_status, assigned_to);
CREATE INDEX idx_leads_deleted_sla ON leads (is_deleted, sla_deadline);

CREATE INDEX idx_lead_details_lead_uuid ON lead_details (lead_uuid);

CREATE INDEX idx_contact_history_lead_uuid ON contact_history (lead_uuid);
CREATE INDEX idx_contact_history_created_at ON contact_history (created_at DESC);
CREATE INDEX idx_contact_history_interaction_type ON contact_history (interaction_type);

CREATE INDEX idx_tasks_assigned_completed_due ON tasks (assigned_to, is_completed, due_when);
CREATE INDEX idx_tasks_completed_due ON tasks (is_completed, due_when);

CREATE UNIQUE INDEX idx_salespeople_email ON salespeople (email);
CREATE INDEX idx_salespeople_is_active ON salespeople (is_active);
CREATE INDEX idx_salespeople_active_lead_count ON salespeople (active_lead_count);

CREATE INDEX idx_properties_district ON properties (district);
CREATE INDEX idx_properties_serviced_gender ON properties (serviced_gender);

-- Atomic increment for assignment routing counter.
CREATE OR REPLACE FUNCTION increment_active_lead_count(agent_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE salespeople
  SET active_lead_count = active_lead_count + 1,
      lead_count = lead_count + 1
  WHERE id = agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION increment_active_lead_count IS 'Increment denormalized lead counters after assignment.';
