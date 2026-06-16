-- Add mechanic_lat and mechanic_lng to service_requests table
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS mechanic_lat DECIMAL(10, 8);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS mechanic_lng DECIMAL(11, 8);
