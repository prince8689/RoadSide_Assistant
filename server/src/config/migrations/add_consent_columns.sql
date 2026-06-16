-- ============================================
-- MIGRATION: Add Consent Columns to service_requests
-- ============================================

ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS share_location BOOLEAN DEFAULT true;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS share_phone BOOLEAN DEFAULT false;
