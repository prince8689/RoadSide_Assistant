require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function migrate() {
  try {
    console.log('Connecting to DB...');
    const client = await pool.connect();

    console.log('Adding new columns to vehicles table...');
    
    const queries = [
      `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS image_url VARCHAR(255);`,
      `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS chassis_number VARCHAR(100);`,
      `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS engine_number VARCHAR(100);`,
      `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS insurance_expiry_date DATE;`,
      `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS nickname VARCHAR(100);`
    ];

    for (const q of queries) {
      await client.query(q);
      console.log('Executed:', q);
    }

    console.log('Migration completed successfully.');
    client.release();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
