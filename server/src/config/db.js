// ============================================
// POSTGRESQL DATABASE CONNECTION
// ============================================
// Uses node-postgres (pg) connection pool for efficient
// connection management. A pool maintains a set of
// reusable connections rather than opening/closing
// one per query — critical for production performance.

const { Pool } = require('pg');

// Create connection pool from environment variables
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'roadside_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
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

module.exports = {
  pool,
  connectDB,
  query,
};
