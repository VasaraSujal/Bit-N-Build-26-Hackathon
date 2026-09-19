-- Migration: 006_risk_code.sql
-- Description: Add risk_code column and deduplication indexes to risks table

ALTER TABLE risks 
ADD COLUMN IF NOT EXISTS risk_code VARCHAR(50);

-- Index for fast risk queries by event, code, and status
CREATE INDEX IF NOT EXISTS idx_risks_event_code_status ON risks(event_id, risk_code, status);

-- Partial unique index ensuring at most one active (open) risk per rule code per event
DROP INDEX IF EXISTS idx_unique_open_risk_per_code;
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_open_risk_per_code 
ON risks(event_id, risk_code) 
WHERE status = 'open';

