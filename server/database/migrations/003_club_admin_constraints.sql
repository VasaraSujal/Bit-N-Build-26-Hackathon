-- Migration: 003_club_admin_constraints.sql
-- Description: Ensure only one active CLUB_ADMIN exists per club using a partial unique index.

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_club_admin 
ON users(club_id) 
WHERE role = 'CLUB_ADMIN' AND is_active = TRUE AND club_id IS NOT NULL;
