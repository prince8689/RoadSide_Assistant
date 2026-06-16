-- ENUMS
CREATE TYPE complaint_category AS ENUM (
  'fraud', 'overcharging', 'harassment', 'misbehavior', 'fake_service', 
  'threatening_behavior', 'vehicle_damage', 'payment_issue', 'safety_concern', 'other'
);

CREATE TYPE complaint_status AS ENUM (
  'pending', 'under_investigation', 'resolved', 'rejected', 'escalated'
);

CREATE TYPE admin_action_type AS ENUM (
  'warning', 'suspension', 'ban', 'reactivation', 'complaint_resolved'
);

-- MODIFY USERS TABLE
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;

-- MODIFY MECHANIC_PROFILES TABLE
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS trust_score INTEGER NOT NULL DEFAULT 100 CHECK (trust_score >= 0 AND trust_score <= 100);
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS total_strikes INTEGER NOT NULL DEFAULT 0 CHECK (total_strikes >= 0);
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS warning_count INTEGER NOT NULL DEFAULT 0 CHECK (warning_count >= 0);

-- COMPLAINTS TABLE
CREATE TABLE IF NOT EXISTS complaints (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mechanic_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id       UUID REFERENCES service_requests(id) ON DELETE SET NULL,
  category         complaint_category NOT NULL,
  description      TEXT NOT NULL,
  evidence_urls    JSONB DEFAULT '[]', -- Array of image/video URLs
  status           complaint_status NOT NULL DEFAULT 'pending',
  admin_notes      TEXT,
  resolved_at      TIMESTAMP WITH TIME ZONE,
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- MECHANIC STRIKES TABLE
CREATE TABLE IF NOT EXISTS mechanic_strikes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mechanic_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  complaint_id     UUID REFERENCES complaints(id) ON DELETE SET NULL,
  reason           TEXT NOT NULL,
  strike_value     INTEGER NOT NULL DEFAULT 1,
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- SAFETY ALERTS TABLE
CREATE TABLE IF NOT EXISTS safety_alerts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id     UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  status           VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active' or 'handled'
  handled_at       TIMESTAMP WITH TIME ZONE,
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type      admin_action_type NOT NULL,
  target_user_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  target_entity_id UUID, -- Can be complaint_id, etc.
  reason           TEXT NOT NULL,
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_complaints_user_id ON complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_mechanic_id ON complaints(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_safety_alerts_status ON safety_alerts(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_user ON audit_logs(target_user_id);
