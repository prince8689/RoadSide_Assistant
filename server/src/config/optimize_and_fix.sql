-- Fix ENUM types for notifications
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'request_update';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'new_request';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'verification_update';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'account_update';

-- Database Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_reviews_mechanic ON reviews(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_user ON vehicles(user_id);
