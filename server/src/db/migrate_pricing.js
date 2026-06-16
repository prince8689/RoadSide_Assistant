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

    console.log('Creating mechanic_services table...');
    
    const queries = [
      `CREATE TABLE IF NOT EXISTS mechanic_services (
         id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
         mechanic_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
         category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
         min_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
         max_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
         is_enabled BOOLEAN NOT NULL DEFAULT true,
         created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
         updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
         UNIQUE(mechanic_id, category_id)
       );`,
      `CREATE OR REPLACE FUNCTION update_updated_at_column()
       RETURNS TRIGGER AS $$
       BEGIN
         NEW.updated_at = NOW();
         RETURN NEW;
       END;
       $$ LANGUAGE plpgsql;`,
      `DROP TRIGGER IF EXISTS trigger_mechanic_services_updated_at ON mechanic_services;`,
      `CREATE TRIGGER trigger_mechanic_services_updated_at
       BEFORE UPDATE ON mechanic_services
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,
       `ALTER TABLE service_requests DROP COLUMN IF EXISTS estimated_price;`
    ];

    for (const q of queries) {
      await client.query(q);
      console.log('Executed query successfully.');
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
