-- Add triage columns for AI triage results
ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS triage_category VARCHAR(50),
  ADD COLUMN IF NOT EXISTS triage_confidence DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS triaged_at TIMESTAMP WITH TIME ZONE;
