-- ============================================
-- MIGRATION: Create OTPs Table
-- ============================================
-- Stores one-time passwords for email verification.
-- OTPs expire after 15 minutes (enforced by application logic).
-- Before inserting a new OTP, the app deletes any existing OTP for the same email.
-- ============================================

CREATE TABLE IF NOT EXISTS otps (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255) NOT NULL,
  otp        VARCHAR(6) NOT NULL,
  purpose    VARCHAR(20) DEFAULT 'register',
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookup by email
CREATE INDEX IF NOT EXISTS idx_otps_email ON otps(email);

-- Cleanup: Remove expired OTPs automatically (optional — app also handles this)
-- You can set up a pg_cron job to run: DELETE FROM otps WHERE expires_at < NOW();
