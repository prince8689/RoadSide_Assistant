-- MIGRATION: Add tracking columns to mechanic_profiles and feedback to service_requests

ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS total_requests_received INTEGER DEFAULT 0;
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS total_requests_accepted INTEGER DEFAULT 0;
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS total_requests_rejected INTEGER DEFAULT 0;
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS user_feedback TEXT;

SELECT '✅ tracking columns added' AS status;
