require('dotenv').config();
const { pool } = require('../config/db');

async function clearRequests() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('Clearing invoices...');
    await client.query('DELETE FROM invoices');
    
    console.log('Clearing service requests...');
    await client.query('DELETE FROM service_requests');
    
    await client.query('COMMIT');
    console.log('Successfully cleared all requests, invoices, and timelines!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error clearing requests:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

clearRequests();
