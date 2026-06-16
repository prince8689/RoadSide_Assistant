require('dotenv').config({ path: 'd:/UM_project1_RoadSide_Assistant/server/.env' });
const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'service_requests'")
  .then(res => {
    console.log(res.rows.map(r => r.column_name).join(', '));
    process.exit(0);
  })
  .catch(console.error);
