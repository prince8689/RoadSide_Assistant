require('dotenv').config();
const { query } = require('./src/config/db.js');

async function checkRelations() {
  try {
    await query(`
      ALTER TABLE mechanic_locations
      DROP CONSTRAINT mechanic_locations_mechanic_id_fkey,
      ADD CONSTRAINT mechanic_locations_mechanic_id_fkey
        FOREIGN KEY (mechanic_id)
        REFERENCES mechanic_profiles(id)
        ON DELETE CASCADE;
    `);
    console.log('Fixed mechanic_locations foreign key constraint!');
  } catch(e) {
    console.error(e);
  }
  process.exit();
}

checkRelations();
