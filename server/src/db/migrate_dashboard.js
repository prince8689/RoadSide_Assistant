require('dotenv').config();
const { query, pool } = require('../config/db');

async function runMigrations() {
  try {
    console.log('Starting dashboard database migrations...');

    // 1. Alter Users
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;`);
    console.log('✅ Added address to users');

    // 2. Alter Vehicles
    await query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;`);
    await query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(30) DEFAULT 'car';`);
    console.log('✅ Added is_default and vehicle_type to vehicles');

    // 3. Create Emergency Contacts
    await query(`
      CREATE TABLE IF NOT EXISTS emergency_contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        contact_name VARCHAR(100) NOT NULL,
        relationship VARCHAR(50),
        phone VARCHAR(15) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Created emergency_contacts table');

    // 4. Create User Preferences
    await query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        request_updates BOOLEAN DEFAULT true,
        mechanic_alerts BOOLEAN DEFAULT true,
        service_completed BOOLEAN DEFAULT true,
        promotions BOOLEAN DEFAULT false,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Created user_preferences table');

    console.log('🎉 Migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    if (pool) await pool.end();
    process.exit();
  }
}

runMigrations();
