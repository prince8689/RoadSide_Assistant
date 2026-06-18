require('dotenv').config();
const { query } = require('./src/config/db.js');

async function checkSchema() {
  try {
    const res = await query(`
      SELECT mp.latitude, (6371 * acos(cos(radians(28.6139)) * cos(radians(mp.latitude)) * cos(radians(mp.longitude) - radians(77.2090)) + sin(radians(28.6139)) * sin(radians(mp.latitude)))) AS distance_km
      FROM mechanic_profiles mp
      WHERE mp.is_available = true
      HAVING (6371 * acos(cos(radians(28.6139)) * cos(radians(mp.latitude)) * cos(radians(mp.longitude) - radians(77.2090)) + sin(radians(28.6139)) * sin(radians(mp.latitude)))) <= 10
    `);
    console.log(res.rows);
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    process.exit(0);
  }
}

checkSchema();
