-- Migration: 004_event_status.sql
-- Description: Add status column and constraints to events table

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'upcoming' 
CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
