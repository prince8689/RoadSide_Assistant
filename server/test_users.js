require('dotenv').config({ path: 'd:/UM_project1_RoadSide_Assistant/server/.env' });
const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.query("SELECT id, full_name, phone FROM users")
  .then(res => {
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  })
  .catch(console.error);
