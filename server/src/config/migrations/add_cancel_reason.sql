-- ============================================================
-- MIGRATION: Add cancel_reason column to service_requests
-- ============================================================
-- The original schema (Day 2) did not include cancel_reason.
-- Day 6 requires storing why a user cancelled a request.
-- Run: psql -U postgres -d roadside_db -f src/config/migrations/add_cancel_reason.sql
-- ============================================================

ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

SELECT '✅ cancel_reason column added to service_requests' AS status;
