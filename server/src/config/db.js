// ============================================
// POSTGRESQL DATABASE CONNECTION
// ============================================
// Uses node-postgres (pg) connection pool for efficient
// connection management. A pool maintains a set of
// reusable connections rather than opening/closing
// one per query — critical for production performance.

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Create connection pool from environment variables
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'roadside_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // Pool configuration
  max: 20,                   // Maximum number of connections in the pool
  idleTimeoutMillis: 30000,  // Close idle connections after 30 seconds
  connectionTimeoutMillis: 5000, // Fail if connection takes > 5 seconds
});

// Listen for unexpected errors on idle clients
pool.on('error', (err) => {
  console.error('❌ Unexpected PostgreSQL pool error:', err.message);
  // Don't exit — the pool will handle reconnection
});

/**
 * Connect to PostgreSQL and verify the connection.
 * Called once at server startup.
 */
const connectDB = async () => {
  try {
    const client = await pool.connect();
    // Auto-migrate the enum value if it's missing (Postgres 12+)
    try {
      await client.query("ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'awaiting_payment'");
      await client.query("ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'payment_verification'");
    } catch (e) {
      if (e.code !== '42710') console.error('Enum alter error:', e.message);
    }

    // Auto-migrate missing tables and columns
    try {
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;`);
      
      await client.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;`);
      await client.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(30) DEFAULT 'car';`);
      await client.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS image_url TEXT;`);
      await client.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS chassis_number VARCHAR(100);`);
      await client.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS engine_number VARCHAR(100);`);
      await client.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS insurance_expiry_date DATE;`);
      await client.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS nickname VARCHAR(100);`);

      await client.query(`
        CREATE TABLE IF NOT EXISTS emergency_contacts (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          contact_name VARCHAR(100) NOT NULL,
          relationship VARCHAR(50),
          phone VARCHAR(20) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS user_preferences (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          request_updates BOOLEAN DEFAULT true,
          mechanic_alerts BOOLEAN DEFAULT true,
          service_completed BOOLEAN DEFAULT true,
          promotions BOOLEAN DEFAULT false,
      await client.query(`ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS working_hours_start TIME DEFAULT '09:00';`);
      await client.query(`ALTER TABLE mechanic_profiles ADD COLUMN IF NOT EXISTS working_hours_end TIME DEFAULT '18:00';`);

      await client.query(`
        CREATE TABLE IF NOT EXISTS mechanic_services (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          mechanic_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
          min_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          max_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          is_enabled BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          UNIQUE(mechanic_id, category_id)
        );
      `);

      await client.query(`
        INSERT INTO service_categories (name, slug, icon, base_price, description)
        SELECT 'Other Service', 'other-service', 'more-horizontal', 0.00, 'Any other general help or miscellaneous assistance. Price varies on call.'
        WHERE NOT EXISTS (
          SELECT 1 FROM service_categories WHERE slug = 'other-service'
        );
      `);
      
      console.log('✅ Auto-migrations completed successfully.');
    } catch (e) {
      console.error('Auto-migration error:', e.message);
    }

    const result = await client.query('SELECT NOW() AS current_time');
    client.release(); // Always release the client back to the pool

    console.log(`✅ PostgreSQL connected successfully`);
    console.log(`   📦 Database: ${process.env.DB_NAME || 'roadside_db'}`);
    console.log(`   🕐 Server time: ${result.rows[0].current_time}`);

    return pool;
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:');
    console.error(`   Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    console.error(`   Database: ${process.env.DB_NAME}`);
    console.error(`   Error: ${error.message}`);
    throw error; // Let the caller (app.js) handle the failure
  }
};

/**
 * Helper: Execute a query using the pool.
 * Use this throughout the app instead of importing pool directly.
 * 
 * @param {string} text - SQL query string
 * @param {Array} params - Parameterized query values
 * @returns {Promise<Object>} - Query result
 * 
 * @example
 *   const { rows } = await query('SELECT * FROM users WHERE id = $1', [userId]);
 */
const query = async (text, params) => {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  // Log slow queries in development (> 100ms)
  if (process.env.NODE_ENV !== 'production' && duration > 100) {
    console.warn(`⚠️  Slow query (${duration}ms):`, text);
  }

  return result;
};

/**
 * Run all SQL migration files from the migrations directory.
 * Reads all .sql files in server/src/config/migrations/ and executes them.
 * Safe to run multiple times — uses IF NOT EXISTS patterns.
 *
 * @returns {Promise<void>}
 */
const runMigrations = async () => {
  const migrationsDir = path.join(__dirname, 'migrations');

  // Check if migrations directory exists
  if (!fs.existsSync(migrationsDir)) {
    console.log('ℹ️  No migrations directory found, skipping migrations.');
    return;
  }

  // Read all .sql files from the directory
  const files = fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort(); // Sort alphabetically to run in order

  if (files.length === 0) {
    console.log('ℹ️  No migration files found.');
    return;
  }

  console.log(`\n🔄 Running ${files.length} migration(s)...`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    try {
      const sql = fs.readFileSync(filePath, 'utf-8');
      await pool.query(sql);
      console.log(`   ✅ ${file}`);
    } catch (error) {
      // Don't crash on migration errors — log and continue
      // Migrations use IF NOT EXISTS so duplicates are safe
      if (error.code === '42P07') {
        // 42P07 = relation already exists — this is fine
        console.log(`   ✅ ${file} (already applied)`);
      } else {
        console.error(`   ⚠️  ${file}: ${error.message}`);
      }
    }
  }

  console.log('✅ Migrations complete.\n');
};

module.exports = {
  pool,
  connectDB,
  query,
  runMigrations,
};
