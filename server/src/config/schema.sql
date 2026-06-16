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
  rejection_reason TEXT,                              -- Reason for verification rejection
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
- -   E N U M S  
 C R E A T E   T Y P E   c o m p l a i n t _ c a t e g o r y   A S   E N U M   (  
     ' f r a u d ' ,   ' o v e r c h a r g i n g ' ,   ' h a r a s s m e n t ' ,   ' m i s b e h a v i o r ' ,   ' f a k e _ s e r v i c e ' ,    
     ' t h r e a t e n i n g _ b e h a v i o r ' ,   ' v e h i c l e _ d a m a g e ' ,   ' p a y m e n t _ i s s u e ' ,   ' s a f e t y _ c o n c e r n ' ,   ' o t h e r '  
 ) ;  
  
 C R E A T E   T Y P E   c o m p l a i n t _ s t a t u s   A S   E N U M   (  
     ' p e n d i n g ' ,   ' u n d e r _ i n v e s t i g a t i o n ' ,   ' r e s o l v e d ' ,   ' r e j e c t e d ' ,   ' e s c a l a t e d '  
 ) ;  
  
 C R E A T E   T Y P E   a d m i n _ a c t i o n _ t y p e   A S   E N U M   (  
     ' w a r n i n g ' ,   ' s u s p e n s i o n ' ,   ' b a n ' ,   ' r e a c t i v a t i o n ' ,   ' c o m p l a i n t _ r e s o l v e d '  
 ) ;  
  
 - -   M O D I F Y   U S E R S   T A B L E  
 A L T E R   T A B L E   u s e r s   A D D   C O L U M N   I F   N O T   E X I S T S   s u s p e n s i o n _ e n d _ d a t e   T I M E S T A M P   W I T H   T I M E   Z O N E ;  
 A L T E R   T A B L E   u s e r s   A D D   C O L U M N   I F   N O T   E X I S T S   i s _ b a n n e d   B O O L E A N   N O T   N U L L   D E F A U L T   f a l s e ;  
  
 - -   M O D I F Y   M E C H A N I C _ P R O F I L E S   T A B L E  
 A L T E R   T A B L E   m e c h a n i c _ p r o f i l e s   A D D   C O L U M N   I F   N O T   E X I S T S   t r u s t _ s c o r e   I N T E G E R   N O T   N U L L   D E F A U L T   1 0 0   C H E C K   ( t r u s t _ s c o r e   > =   0   A N D   t r u s t _ s c o r e   < =   1 0 0 ) ;  
 A L T E R   T A B L E   m e c h a n i c _ p r o f i l e s   A D D   C O L U M N   I F   N O T   E X I S T S   t o t a l _ s t r i k e s   I N T E G E R   N O T   N U L L   D E F A U L T   0   C H E C K   ( t o t a l _ s t r i k e s   > =   0 ) ;  
 A L T E R   T A B L E   m e c h a n i c _ p r o f i l e s   A D D   C O L U M N   I F   N O T   E X I S T S   w a r n i n g _ c o u n t   I N T E G E R   N O T   N U L L   D E F A U L T   0   C H E C K   ( w a r n i n g _ c o u n t   > =   0 ) ;  
  
 - -   C O M P L A I N T S   T A B L E  
 C R E A T E   T A B L E   I F   N O T   E X I S T S   c o m p l a i n t s   (  
     i d                               U U I D   P R I M A R Y   K E Y   D E F A U L T   u u i d _ g e n e r a t e _ v 4 ( ) ,  
     u s e r _ i d                     U U I D   N O T   N U L L   R E F E R E N C E S   u s e r s ( i d )   O N   D E L E T E   C A S C A D E ,  
     m e c h a n i c _ i d             U U I D   N O T   N U L L   R E F E R E N C E S   u s e r s ( i d )   O N   D E L E T E   C A S C A D E ,  
     r e q u e s t _ i d               U U I D   R E F E R E N C E S   s e r v i c e _ r e q u e s t s ( i d )   O N   D E L E T E   S E T   N U L L ,  
     c a t e g o r y                   c o m p l a i n t _ c a t e g o r y   N O T   N U L L ,  
     d e s c r i p t i o n             T E X T   N O T   N U L L ,  
     e v i d e n c e _ u r l s         J S O N B   D E F A U L T   ' [ ] ' ,   - -   A r r a y   o f   i m a g e / v i d e o   U R L s  
     s t a t u s                       c o m p l a i n t _ s t a t u s   N O T   N U L L   D E F A U L T   ' p e n d i n g ' ,  
     a d m i n _ n o t e s             T E X T ,  
     r e s o l v e d _ a t             T I M E S T A M P   W I T H   T I M E   Z O N E ,  
     c r e a t e d _ a t               T I M E S T A M P   W I T H   T I M E   Z O N E   N O T   N U L L   D E F A U L T   N O W ( ) ,  
     u p d a t e d _ a t               T I M E S T A M P   W I T H   T I M E   Z O N E   N O T   N U L L   D E F A U L T   N O W ( )  
 ) ;  
  
 - -   M E C H A N I C   S T R I K E S   T A B L E  
 C R E A T E   T A B L E   I F   N O T   E X I S T S   m e c h a n i c _ s t r i k e s   (  
     i d                               U U I D   P R I M A R Y   K E Y   D E F A U L T   u u i d _ g e n e r a t e _ v 4 ( ) ,  
     m e c h a n i c _ i d             U U I D   N O T   N U L L   R E F E R E N C E S   u s e r s ( i d )   O N   D E L E T E   C A S C A D E ,  
     c o m p l a i n t _ i d           U U I D   R E F E R E N C E S   c o m p l a i n t s ( i d )   O N   D E L E T E   S E T   N U L L ,  
     r e a s o n                       T E X T   N O T   N U L L ,  
     s t r i k e _ v a l u e           I N T E G E R   N O T   N U L L   D E F A U L T   1 ,  
     c r e a t e d _ a t               T I M E S T A M P   W I T H   T I M E   Z O N E   N O T   N U L L   D E F A U L T   N O W ( )  
 ) ;  
  
 - -   S A F E T Y   A L E R T S   T A B L E  
 C R E A T E   T A B L E   I F   N O T   E X I S T S   s a f e t y _ a l e r t s   (  
     i d                               U U I D   P R I M A R Y   K E Y   D E F A U L T   u u i d _ g e n e r a t e _ v 4 ( ) ,  
     c o m p l a i n t _ i d           U U I D   N O T   N U L L   R E F E R E N C E S   c o m p l a i n t s ( i d )   O N   D E L E T E   C A S C A D E ,  
     s t a t u s                       V A R C H A R ( 2 0 )   N O T   N U L L   D E F A U L T   ' a c t i v e ' ,   - -   ' a c t i v e '   o r   ' h a n d l e d '  
     h a n d l e d _ a t               T I M E S T A M P   W I T H   T I M E   Z O N E ,  
     c r e a t e d _ a t               T I M E S T A M P   W I T H   T I M E   Z O N E   N O T   N U L L   D E F A U L T   N O W ( )  
 ) ;  
  
 - -   A U D I T   L O G S   T A B L E  
 C R E A T E   T A B L E   I F   N O T   E X I S T S   a u d i t _ l o g s   (  
     i d                               U U I D   P R I M A R Y   K E Y   D E F A U L T   u u i d _ g e n e r a t e _ v 4 ( ) ,  
     a d m i n _ i d                   U U I D   N O T   N U L L   R E F E R E N C E S   u s e r s ( i d )   O N   D E L E T E   C A S C A D E ,  
     a c t i o n _ t y p e             a d m i n _ a c t i o n _ t y p e   N O T   N U L L ,  
     t a r g e t _ u s e r _ i d       U U I D   R E F E R E N C E S   u s e r s ( i d )   O N   D E L E T E   C A S C A D E ,  
     t a r g e t _ e n t i t y _ i d   U U I D ,   - -   C a n   b e   c o m p l a i n t _ i d ,   e t c .  
     r e a s o n                       T E X T   N O T   N U L L ,  
     c r e a t e d _ a t               T I M E S T A M P   W I T H   T I M E   Z O N E   N O T   N U L L   D E F A U L T   N O W ( )  
 ) ;  
  
 - -   I N D E X E S  
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ c o m p l a i n t s _ u s e r _ i d   O N   c o m p l a i n t s ( u s e r _ i d ) ;  
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ c o m p l a i n t s _ m e c h a n i c _ i d   O N   c o m p l a i n t s ( m e c h a n i c _ i d ) ;  
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ c o m p l a i n t s _ s t a t u s   O N   c o m p l a i n t s ( s t a t u s ) ;  
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ s a f e t y _ a l e r t s _ s t a t u s   O N   s a f e t y _ a l e r t s ( s t a t u s ) ;  
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ a u d i t _ l o g s _ t a r g e t _ u s e r   O N   a u d i t _ l o g s ( t a r g e t _ u s e r _ i d ) ;  
 