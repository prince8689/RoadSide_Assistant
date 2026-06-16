require('dotenv').config();
const { pool } = require('./src/config/db');
const requestService = require('./src/modules/requests/request.service');

async function test() {
  try {
    const result = await pool.query("SELECT id, mechanic_id, user_id FROM service_requests WHERE status = 'payment_verification' LIMIT 1");
    if (result.rows.length === 0) {
      console.log('No request found');
      return;
    }
    const { id, mechanic_id, user_id } = result.rows[0];
    console.log(`Verifying payment for request ${id} with mechanic ${mechanic_id}`);
    const updated = await requestService.verifyPayment(id, mechanic_id);
    console.log('Success:', updated);
  } catch (err) {
    console.error('Error during verifyPayment:', err);
    console.error(err.stack);
  } finally {
    process.exit(0);
  }
}
test();
