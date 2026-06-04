-- ============================================================
-- ROADSIDE ASSIST — COMPLETE DATABASE SCHEMA
-- ============================================================
-- Database: roadside_db
-- Run: psql -U postgres -d roadside_db -f schema.sql
-- ============================================================
-- This file is IDEMPOTENT — safe to re-run anytime.
-- It drops existing tables and recreates everything fresh.
-- ============================================================

-- ============================================================
-- STEP 0: Enable Required Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- Password hashing (bcrypt)

-- ============================================================
-- STEP 1: Drop Existing Tables (reverse dependency order)
-- ============================================================
DROP TABLE IF EXISTS notifications   CASCADE;
DROP TABLE IF EXISTS reviews         CASCADE;
DROP TABLE IF EXISTS service_requests CASCADE;
DROP TABLE IF EXISTS service_categories CASCADE;
DROP TABLE IF EXISTS mechanic_profiles CASCADE;
DROP TABLE IF EXISTS vehicles        CASCADE;
DROP TABLE IF EXISTS users           CASCADE;

-- ============================================================
-- STEP 2: Create ENUM Types
-- ============================================================
DROP TYPE IF EXISTS user_role CASCADE;
CREATE TYPE user_role AS ENUM ('user', 'mechanic', 'admin');

DROP TYPE IF EXISTS fuel_type CASCADE;
CREATE TYPE fuel_type AS ENUM ('petrol', 'diesel', 'electric', 'hybrid', 'cng', 'lpg');

DROP TYPE IF EXISTS request_status CASCADE;
CREATE TYPE request_status AS ENUM (
  'pending',      -- User submitted, waiting for mechanic
  'accepted',     -- Mechanic accepted the request
  'en_route',     -- Mechanic is on the way
  'arrived',      -- Mechanic arrived at breakdown location
  'in_progress',  -- Repair/service in progress
  'completed',    -- Service completed
  'cancelled'     -- Cancelled by user or mechanic
);

DROP TYPE IF EXISTS notification_type CASCADE;
CREATE TYPE notification_type AS ENUM (
  'request_created',
  'request_accepted',
  'mechanic_en_route',
  'mechanic_arrived',
  'service_started',
  'service_completed',
  'request_cancelled',
  'review_received',
  'payment',
  'system'
);

-- ============================================================
-- TABLE 1: users
-- ============================================================
-- Central user table for all three roles: user, mechanic, admin
-- Email is unique and used for login. Phone is optional but unique if provided.
-- ============================================================
CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name        VARCHAR(100) NOT NULL,
  email            VARCHAR(255) NOT NULL UNIQUE,
  phone            VARCHAR(20) UNIQUE,
  password_hash    VARCHAR(255) NOT NULL,
  role             user_role NOT NULL DEFAULT 'user',
  profile_picture  TEXT,                              -- URL to profile image
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE 2: vehicles
-- ============================================================
-- Vehicles owned by users (role = 'user').
-- A user can have multiple vehicles. License plate is unique.
-- ============================================================
CREATE TABLE vehicles (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  make             VARCHAR(50) NOT NULL,              -- e.g., Toyota, Honda
  model            VARCHAR(50) NOT NULL,              -- e.g., Corolla, Civic
  year             INTEGER NOT NULL CHECK (year >= 1900 AND year <= 2100),
  license_plate    VARCHAR(20) NOT NULL UNIQUE,
  fuel_type        fuel_type NOT NULL DEFAULT 'petrol',
  color            VARCHAR(30),
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE 3: mechanic_profiles
-- ============================================================
-- Extended profile for users with role = 'mechanic'.
-- One-to-one with users table. Stores location, rating, documents.
-- documents is JSONB: [{ "type": "license", "url": "...", "verified": true }]
-- ============================================================
CREATE TABLE mechanic_profiles (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  business_name    VARCHAR(150),
  experience_years INTEGER NOT NULL DEFAULT 0 CHECK (experience_years >= 0),
  specializations  TEXT[] DEFAULT '{}',               -- Array: {'engine', 'electrical', 'tires'}
  is_verified      BOOLEAN NOT NULL DEFAULT false,
  is_available     BOOLEAN NOT NULL DEFAULT false,
  current_lat      DECIMAL(10, 8),                    -- Latitude: -90 to +90
  current_lng      DECIMAL(11, 8),                    -- Longitude: -180 to +180
  rating           DECIMAL(3, 2) NOT NULL DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
  total_jobs       INTEGER NOT NULL DEFAULT 0 CHECK (total_jobs >= 0),
  documents        JSONB DEFAULT '[]',                -- Uploaded verification docs
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE 4: service_categories
-- ============================================================
-- Predefined service types available on the platform.
-- slug is URL-friendly, unique identifier.
-- base_price is the starting price — final price may vary.
-- ============================================================
CREATE TABLE service_categories (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             VARCHAR(100) NOT NULL,
  slug             VARCHAR(100) NOT NULL UNIQUE,
  icon             VARCHAR(50),                       -- Icon name (e.g., 'wrench', 'truck')
  base_price       DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (base_price >= 0),
  description      TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE 5: service_requests
-- ============================================================
-- The core business table. Every roadside assistance request lives here.
-- Links user, mechanic, vehicle, and service category.
-- Tracks full lifecycle via status enum and timestamps.
-- mechanic_id is NULL until a mechanic accepts the request.
-- ============================================================
CREATE TABLE service_requests (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mechanic_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  vehicle_id       UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  category_id      UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  status           request_status NOT NULL DEFAULT 'pending',
  breakdown_lat    DECIMAL(10, 8) NOT NULL,
  breakdown_lng    DECIMAL(11, 8) NOT NULL,
  breakdown_address TEXT,
  description      TEXT,                              -- User's description of the issue
  estimated_price  DECIMAL(10, 2),
  final_price      DECIMAL(10, 2),
  -- Lifecycle timestamps
  requested_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  accepted_at      TIMESTAMP WITH TIME ZONE,
  en_route_at      TIMESTAMP WITH TIME ZONE,
  arrived_at       TIMESTAMP WITH TIME ZONE,
  started_at       TIMESTAMP WITH TIME ZONE,
  completed_at     TIMESTAMP WITH TIME ZONE,
  cancelled_at     TIMESTAMP WITH TIME ZONE,
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE 6: reviews
-- ============================================================
-- Users rate mechanics after service completion.
-- One review per service_request (unique constraint).
-- Rating is 1-5 stars.
-- ============================================================
CREATE TABLE reviews (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id       UUID NOT NULL UNIQUE REFERENCES service_requests(id) ON DELETE CASCADE,
  reviewer_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mechanic_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating           INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment          TEXT,
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE 7: notifications
-- ============================================================
-- Push/in-app notifications for all users.
-- type categorizes the notification for filtering/display.
-- ============================================================
CREATE TABLE notifications (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title            VARCHAR(255) NOT NULL,
  message          TEXT NOT NULL,
  type             notification_type NOT NULL DEFAULT 'system',
  is_read          BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);


-- ============================================================
-- STEP 3: PERFORMANCE INDEXES
-- ============================================================
-- These indexes speed up the most common queries in the app.
-- Without these, PostgreSQL does full table scans = SLOW.
-- ============================================================

-- service_requests: Most queried table — index all common WHERE columns
CREATE INDEX idx_service_requests_user_id     ON service_requests(user_id);
CREATE INDEX idx_service_requests_mechanic_id ON service_requests(mechanic_id);
CREATE INDEX idx_service_requests_status      ON service_requests(status);
CREATE INDEX idx_service_requests_category_id ON service_requests(category_id);

-- mechanic_profiles: Location-based queries for finding nearby mechanics
CREATE INDEX idx_mechanic_profiles_location   ON mechanic_profiles(current_lat, current_lng);
CREATE INDEX idx_mechanic_profiles_available  ON mechanic_profiles(is_available, is_verified);

-- users: Fast lookup by email (login) and role (filtering)
CREATE INDEX idx_users_email                  ON users(email);
CREATE INDEX idx_users_role                   ON users(role);

-- vehicles: Find vehicles by owner
CREATE INDEX idx_vehicles_user_id             ON vehicles(user_id);

-- reviews: Find reviews for a mechanic
CREATE INDEX idx_reviews_mechanic_id          ON reviews(mechanic_id);

-- notifications: Unread notifications for a user
CREATE INDEX idx_notifications_user_unread    ON notifications(user_id, is_read);


-- ============================================================
-- STEP 4: SEED DATA
-- ============================================================
-- Passwords are hashed using pgcrypto's crypt() with blowfish (bcrypt).
-- These hashes are compatible with bcryptjs in Node.js.
-- ============================================================

-- ────────────────────────────────────────────
-- 4.1: Service Categories (5 categories)
-- ────────────────────────────────────────────
INSERT INTO service_categories (name, slug, icon, base_price, description) VALUES
  (
    'Breakdown Repair',
    'breakdown-repair',
    'wrench',
    500.00,
    'On-spot vehicle breakdown repair including engine, electrical, and mechanical issues.'
  ),
  (
    'Towing',
    'towing',
    'truck',
    1500.00,
    'Tow your vehicle to the nearest garage or your preferred location.'
  ),
  (
    'Battery Jump-start',
    'battery-jumpstart',
    'battery-charging',
    300.00,
    'Dead battery? Get an instant jump-start to get back on the road.'
  ),
  (
    'Flat Tire Repair',
    'flat-tire-repair',
    'tire',
    250.00,
    'Flat tire replacement or puncture repair at your location.'
  ),
  (
    'Fuel Delivery',
    'fuel-delivery',
    'fuel',
    400.00,
    'Ran out of fuel? We deliver fuel directly to your breakdown location.'
  );

-- ────────────────────────────────────────────
-- 4.2: Admin User (1 admin)
-- Password: Admin@123
-- ────────────────────────────────────────────
INSERT INTO users (full_name, email, phone, password_hash, role) VALUES
  (
    'Admin User',
    'admin@roadside.com',
    '+919999900000',
    crypt('Admin@123', gen_salt('bf', 10)),
    'admin'
  );

-- ────────────────────────────────────────────
-- 4.3: Mechanic Users (2 mechanics)
-- Password: Mech@123
-- ────────────────────────────────────────────
INSERT INTO users (full_name, email, phone, password_hash, role) VALUES
  (
    'Rajesh Kumar',
    'rajesh@mechanic.com',
    '+919999911111',
    crypt('Mech@123', gen_salt('bf', 10)),
    'mechanic'
  ),
  (
    'Sunil Sharma',
    'sunil@mechanic.com',
    '+919999922222',
    crypt('Mech@123', gen_salt('bf', 10)),
    'mechanic'
  );

-- Create mechanic profiles for the mechanic users
INSERT INTO mechanic_profiles (user_id, business_name, experience_years, specializations, is_verified, is_available, current_lat, current_lng, rating, total_jobs, documents)
SELECT
  id,
  'Rajesh Auto Garage',
  8,
  ARRAY['engine', 'electrical', 'battery'],
  true,
  true,
  28.61390000,    -- Delhi coordinates
  77.20900000,
  4.50,
  120,
  '[{"type": "driving_license", "url": "/docs/rajesh_dl.pdf", "verified": true}, {"type": "certification", "url": "/docs/rajesh_cert.pdf", "verified": true}]'::jsonb
FROM users WHERE email = 'rajesh@mechanic.com';

INSERT INTO mechanic_profiles (user_id, business_name, experience_years, specializations, is_verified, is_available, current_lat, current_lng, rating, total_jobs, documents)
SELECT
  id,
  'Sunil Tyre Works',
  5,
  ARRAY['tires', 'brakes', 'suspension'],
  true,
  false,
  28.52950000,    -- Delhi coordinates (different area)
  77.25070000,
  4.20,
  85,
  '[{"type": "driving_license", "url": "/docs/sunil_dl.pdf", "verified": true}]'::jsonb
FROM users WHERE email = 'sunil@mechanic.com';

-- ────────────────────────────────────────────
-- 4.4: Regular Users (2 users)
-- Password: User@123
-- ────────────────────────────────────────────
INSERT INTO users (full_name, email, phone, password_hash, role) VALUES
  (
    'Amit Patel',
    'amit@user.com',
    '+919999933333',
    crypt('User@123', gen_salt('bf', 10)),
    'user'
  ),
  (
    'Priya Singh',
    'priya@user.com',
    '+919999944444',
    crypt('User@123', gen_salt('bf', 10)),
    'user'
  );

-- Add vehicles for the users
INSERT INTO vehicles (user_id, make, model, year, license_plate, fuel_type, color)
SELECT id, 'Maruti Suzuki', 'Swift', 2022, 'DL-01-AB-1234', 'petrol', 'White'
FROM users WHERE email = 'amit@user.com';

INSERT INTO vehicles (user_id, make, model, year, license_plate, fuel_type, color)
SELECT id, 'Hyundai', 'Creta', 2023, 'DL-02-CD-5678', 'diesel', 'Blue'
FROM users WHERE email = 'amit@user.com';

INSERT INTO vehicles (user_id, make, model, year, license_plate, fuel_type, color)
SELECT id, 'Honda', 'City', 2021, 'DL-03-EF-9012', 'petrol', 'Silver'
FROM users WHERE email = 'priya@user.com';


-- ============================================================
-- STEP 5: UPDATED_AT TRIGGER
-- ============================================================
-- Automatically updates the updated_at column on row changes.
-- Applied to tables that have an updated_at column.
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_mechanic_profiles_updated_at
  BEFORE UPDATE ON mechanic_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_service_requests_updated_at
  BEFORE UPDATE ON service_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- DONE! 🎉
-- ============================================================
-- Tables created:    7
-- Indexes created:  11
-- Seed records:     12 (1 admin + 2 mechanics + 2 profiles + 2 users + 3 vehicles + 5 categories)
-- Triggers created:  3
-- ============================================================

SELECT '✅ Schema created successfully!' AS status;
SELECT 'Tables: ' || count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
