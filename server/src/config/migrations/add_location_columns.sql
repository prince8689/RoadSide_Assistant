-- ============================================
-- MIGRATION: Add Location Tracking Columns
-- ============================================

-- For mechanics table
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMP;
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT false;
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS is_on_duty BOOLEAN DEFAULT false;
ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS current_job_id INTEGER;

-- For users table  
ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP;

-- Create mechanic_locations history table
CREATE TABLE IF NOT EXISTS mechanic_locations (
  id SERIAL PRIMARY KEY,
  mechanic_id INTEGER REFERENCES mechanic_profiles(id),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(10, 2),
  timestamp TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mechanic_locations_mechanic_id 
  ON mechanic_locations(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_locations_timestamp 
  ON mechanic_locations(timestamp);

-- Function to find nearby mechanics using Haversine formula in PostgreSQL
CREATE OR REPLACE FUNCTION find_nearby_mechanics(
  user_lat DECIMAL,
  user_lng DECIMAL,
  radius_km DECIMAL DEFAULT 10
)
RETURNS TABLE (
  mechanic_id INTEGER,
  name VARCHAR,
  phone VARCHAR,
  profile_picture VARCHAR,
  latitude DECIMAL,
  longitude DECIMAL,
  distance_km DECIMAL,
  is_available BOOLEAN,
  is_verified BOOLEAN,
  average_rating DECIMAL,
  total_reviews INTEGER,
  specializations TEXT[],
  experience_years VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id as mechanic_id,
    u.full_name as name,
    u.phone,
    u.profile_picture,
    m.latitude,
    m.longitude,
    ROUND(
      (6371 * acos(
        cos(radians(user_lat)) * cos(radians(m.latitude)) *
        cos(radians(m.longitude) - radians(user_lng)) +
        sin(radians(user_lat)) * sin(radians(m.latitude))
      ))::DECIMAL, 1
    ) as distance_km,
    m.is_available,
    m.is_verified,
    COALESCE(m.average_rating, 0) as average_rating,
    COALESCE(m.total_reviews, 0) as total_reviews,
    m.specializations,
    m.experience_years
  FROM mechanic_profiles m
  JOIN users u ON m.user_id = u.id
  WHERE 
    m.is_available = true
    AND m.is_verified = true
    AND m.latitude IS NOT NULL
    AND m.longitude IS NOT NULL
    AND (6371 * acos(
      cos(radians(user_lat)) * cos(radians(m.latitude)) *
      cos(radians(m.longitude) - radians(user_lng)) +
      sin(radians(user_lat)) * sin(radians(m.latitude))
    )) <= radius_km
  ORDER BY distance_km ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;
