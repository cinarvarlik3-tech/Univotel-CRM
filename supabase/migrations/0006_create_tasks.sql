-- Migration 0006: Create tasks table for salesperson follow-ups.

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_uuid UUID NOT NULL REFERENCES leads(uuid) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES salespeople(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (
    task_type IN (
      'callback',
      'follow_up',
      'tour_reminder',
      'document_collection',
      'contract_prep',
      'placement_follow_up'
    )
  ),
  due_when TIMESTAMPTZ NOT NULL,
  notes TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  is_late BOOLEAN NOT NULL DEFAULT false,
  created_by TEXT NOT NULL DEFAULT 'system' CHECK (
    created_by IN ('system', 'salesperson', 'manager')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE tasks IS 'Action items assigned to salespeople for lead follow-up.';
