require('dotenv').config();
const { query } = require('./src/config/db');

async function cleanUp() {
  try {
    const res = await query(`DELETE FROM users WHERE full_name = 'Updated Name' AND email LIKE '%@test.com'`);
    console.log(`Deleted ${res.rowCount} dummy users.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

cleanUp();
