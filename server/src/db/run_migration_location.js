require('dotenv').config({ path: 'd:/UM_project1_RoadSide_Assistant/server/.env' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function run() {
  try {
    const sql = fs.readFileSync('d:/UM_project1_RoadSide_Assistant/server/src/config/migrations/add_mechanic_location.sql', 'utf8');
    await pool.query(sql);
    console.log('Migration successful');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
