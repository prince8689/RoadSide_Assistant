// ============================================
// DAY 1: COMPREHENSIVE TEST SCRIPT
// ============================================
// Run this file with `node test-day1.js` to verify
// the database, OTP table, Email service, JWT generation,
// and Redis connection.

require('dotenv').config();
const { pool, connectDB } = require('./src/config/db');
const { connectRedis } = require('./src/config/redis');
const { sendOTP } = require('./src/utils/email');
const jwt = require('jsonwebtoken');

const runTests = async () => {
  let passed = 0;
  const total = 5;

  console.log('\n===========================================');
  console.log('🚀 RUNNING DAY 1 SYSTEM TESTS');
  console.log('===========================================\n');

  // Test 1: Database connection
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW() as current_time');
    client.release();
    console.log(`✅ Database connected: ${res.rows[0].current_time}`);
    passed++;
  } catch (error) {
    console.log(`❌ DB Error: ${error.message}`);
  }

  // Test 2: OTP table exists
  try {
    const res = await pool.query('SELECT COUNT(*) FROM otps');
    console.log(`✅ OTP table exists (Rows: ${res.rows[0].count})`);
    passed++;
  } catch (error) {
    console.log(`❌ OTP table missing — run migration: ${error.message}`);
  }

  // Test 3: Email service
  try {
    const testEmail = process.env.TEST_EMAIL;
    if (!testEmail) {
      console.log(`❌ Email error: TEST_EMAIL is not defined in .env`);
    } else {
      await sendOTP(testEmail, '123456', 'Test User');
      console.log(`✅ Email sent successfully to ${testEmail}`);
      passed++;
    }
  } catch (error) {
    console.log(`❌ Email error: ${error.message}`);
  }

  // Test 4: JWT generation
  try {
    const payload = { userId: 1, email: 'test@test.com', role: 'user' };
    const secret = process.env.JWT_SECRET || 'test_secret_for_test_script_only';
    
    // Generate
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    
    // Verify
    const decoded = jwt.verify(token, secret);
    
    if (decoded.email === payload.email) {
      console.log(`✅ JWT working (Token: ${token.substring(0, 20)}...)`);
      passed++;
    } else {
      console.log(`❌ JWT error: Payload mismatch`);
    }
  } catch (error) {
    console.log(`❌ JWT error: ${error.message}`);
  }

  // Test 5: Redis connection
  try {
    const redisClient = await connectRedis();
    await redisClient.set('test_key', 'hello');
    const val = await redisClient.get('test_key');
    if (val === 'hello') {
      console.log(`✅ Redis connected, value: ${val}`);
      passed++;
    } else {
      console.log(`❌ Redis error: value mismatch`);
    }
  } catch (error) {
    console.log(`❌ Redis error: ${error.message}`);
  }

  console.log('\n===========================================');
  console.log(`🏁 Day 1 Tests: ${passed}/${total} passed`);
  console.log('===========================================\n');

  // Close connections
  pool.end();
  process.exit(0);
};

runTests();
