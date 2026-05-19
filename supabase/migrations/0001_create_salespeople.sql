-- Migration 0001: Create salespeople table for agent management and assignment routing.

CREATE TABLE salespeople (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  telegram_chat_id TEXT,
  role TEXT NOT NULL CHECK (role IN ('salesperson', 'manager')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  languages TEXT[] NOT NULL DEFAULT '{}',
  assigned_hotels UUID[] NOT NULL DEFAULT '{}',
  shift_start TIME NOT NULL DEFAULT '09:00',
  shift_end TIME NOT NULL DEFAULT '18:00',
  active_lead_count INTEGER NOT NULL DEFAULT 0,
  max_active_leads INTEGER NOT NULL DEFAULT 40,
  lead_count INTEGER NOT NULL DEFAULT 0,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE salespeople IS 'Sales agents and managers. id must match auth.users.id.';
