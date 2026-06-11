-- Add claimed_at timestamp to leads.
-- Set when a salesperson claims an unassigned lead from Lead Hub.
-- Cleared (NULL) when a lead is reactivated back to Lead Hub so the next claim re-stamps it.
-- Required for "new claims this week" counter and claim-to-conversion timing.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
