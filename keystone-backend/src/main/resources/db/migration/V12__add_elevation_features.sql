-- V12: Add columns for AI triage urgency/duration, offline notes, customer signatures, and ratings/feedback
ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS triage_urgency VARCHAR(50),
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS work_notes TEXT,
  ADD COLUMN IF NOT EXISTS customer_signature TEXT,
  ADD COLUMN IF NOT EXISTS customer_rating INTEGER,
  ADD COLUMN IF NOT EXISTS customer_feedback TEXT;

-- Seed sample feedback on completed demo work order if available
UPDATE work_orders
SET customer_rating = 5,
    customer_feedback = 'Exceptional service! The technician arrived right on time, diagnosed the issue quickly, and left the work area spotless.',
    work_notes = 'Replaced worn seals, tested pressure valves up to 120 PSI, no leaks detected.',
    estimated_duration_minutes = 90
WHERE status = 'COMPLETED' AND customer_rating IS NULL;
