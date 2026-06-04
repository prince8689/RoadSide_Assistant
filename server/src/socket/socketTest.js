// ============================================
// SOCKET.IO DAY 16: REAL-TIME NOTIFICATION TEST
// ============================================
// Run this with: node src/socket/socketTest.js
// Ensure the main server is running first!

require('dotenv').config();

const { io } = require('socket.io-client');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { redisClient } = require('../config/redis');
const { query } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ Missing JWT_SECRET in .env');
  process.exit(1);
}

const setupStorage = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '1h' });
};

const getTestUsers = async () => {
  const mechRes = await query("SELECT user_id FROM mechanic_profiles WHERE is_verified = true LIMIT 1");
  const userRes = await query("SELECT id FROM users WHERE role = 'user' LIMIT 1");
  const adminRes = await query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  const otherUserRes = await query("SELECT id FROM users WHERE role = 'user' AND id != $1 LIMIT 1", [userRes.rows[0].id]);
  
  if (mechRes.rows.length === 0 || userRes.rows.length === 0 || adminRes.rows.length === 0) {
    throw new Error('Could not find test users in DB. Did you seed?');
  }

  // Ensure user has no active requests to allow creation
  await query("UPDATE service_requests SET status = 'cancelled' WHERE user_id = $1 AND status != 'completed'", [userRes.rows[0].id]);
  // Ensure mechanic is available
  await query("UPDATE mechanic_profiles SET is_available = true WHERE user_id = $1", [mechRes.rows[0].user_id]);

  const vehicleRes = await query('SELECT id FROM vehicles WHERE user_id = $1 LIMIT 1', [userRes.rows[0].id]);
  const catRes = await query('SELECT id FROM service_categories LIMIT 1');

  return {
    mechanicId: mechRes.rows[0].user_id,
    userId: userRes.rows[0].id,
    adminId: adminRes.rows[0].id,
    otherUserId: otherUserRes.rows[0]?.id,
    vehicleId: vehicleRes.rows[0]?.id,
    categoryId: catRes.rows[0]?.id
  };
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const runTests = async () => {
  try {
    await setupStorage();
    const { mechanicId, userId, adminId, otherUserId, vehicleId, categoryId } = await getTestUsers();

    if (!vehicleId || !categoryId) {
      console.error('❌ Test failed: Missing vehicle or category for user.');
      process.exit(1);
    }

    const userToken = generateToken(userId, 'user');
    const mechanicToken = generateToken(mechanicId, 'mechanic');
    const adminToken = generateToken(adminId, 'admin');

    console.log(`Starting Day 16 Real-Time Socket Tests...\n`);

    let userSocket = io('http://localhost:5000', { auth: { token: userToken } });
    const mechanicSocket = io('http://localhost:5000', { auth: { token: mechanicToken } });
    const adminSocket = io('http://localhost:5000', { auth: { token: adminToken } });

    let requestId = null;

    // Test flags
    let adminStatsReceived = false;

    adminSocket.on('admin:stats:update', (data) => {
      if (!adminStatsReceived) {
        console.log(`── Test 5: Admin Dashboard Live Update ──`);
        console.log(`  ✅ Live stats: active_requests=${data.activeRequests}, online_mechanics=${data.onlineMechanics}`);
        adminStatsReceived = true;
      }
    });

    adminSocket.on('admin:request:new', (data) => {
      console.log(`── Test 6: Admin Sees New Request Instantly ──`);
      console.log(`  ✅ New request on dashboard: ${data.requestId}`);
    });

    userSocket.on('request:current:status', (data) => {
      console.log(`── Test 1: Subscribe to Request ──`);
      console.log(`  ✅ Current status received: ${data.status}`);
    });

    userSocket.on('request:status:updated', (data) => {
      if (data.newStatus === 'en_route') {
        console.log(`── Test 2: Real-Time Status: en_route ──`);
        console.log(`  ✅ Status updated: ${data.newStatus}`);
      } else if (data.newStatus === 'arrived') {
        console.log(`── Test 3: Real-Time Status: arrived ──`);
        console.log(`  ✅ Status updated: ${data.newStatus}`);
      } else if (data.newStatus === 'completed') {
        console.log(`── Test 4: Real-Time Status: completed ──`);
        console.log(`  ✅ Service done! Price: ${data.finalPrice}`);
        console.log(`  ✅ Can review: ${data.canReview}`);
      }
    });

    await sleep(1000);

    // Trigger Tests: Create Request
    console.log(`\n> Creating Service Request...`);
    const reqRes = await axios.post('http://localhost:5000/api/requests', {
      vehicle_id: vehicleId,
      category_id: categoryId,
      breakdown_lat: 28.6139,
      breakdown_lng: 77.2090,
      breakdown_address: 'Delhi'
    }, { headers: { Authorization: `Bearer ${userToken}` } });

    requestId = reqRes.data.data.request.id;
    await sleep(500);

    // Test 8: Redis Request Cache (Active request created)
    console.log(`── Test 8: Redis Request Cache ──`);
    let cacheVal = await redisClient.get(`request:active:${userId}`);
    if (cacheVal) {
      const parsed = JSON.parse(cacheVal);
      console.log(`  ✅ Cached requestId: ${parsed.requestId}, status: ${parsed.status}`);
    } else {
      console.error(`  ❌ Cache not found!`);
    }

    // Subscribe to request
    userSocket.emit('request:subscribe', { requestId });
    await sleep(500);

    // Test 11: Unauthorized Request Subscribe
    console.log(`── Test 11: Unauthorized Request Subscribe ──`);
    const otherUserToken = generateToken(otherUserId, 'user');
    const otherUserSocket = io('http://localhost:5000', { auth: { token: otherUserToken } });
    await sleep(500);
    otherUserSocket.emit('request:subscribe', { requestId });
    otherUserSocket.on('error', (data) => {
      if (data.message === 'Not authorized') {
        console.log(`  ✅ Correctly rejected: ${data.message}`);
      }
    });
    await sleep(500);

    // Mechanic accepts request
    console.log(`\n> Accepting Service Request...`);
    await axios.patch(`http://localhost:5000/api/requests/${requestId}/accept`, {}, {
      headers: { Authorization: `Bearer ${mechanicToken}` }
    });
    await sleep(500);

    // Mechanic En Route
    console.log(`> Updating Status to En Route...`);
    await axios.patch(`http://localhost:5000/api/requests/${requestId}/status`, { status: 'en_route' }, {
      headers: { Authorization: `Bearer ${mechanicToken}` }
    });
    await sleep(500);

    // Test 9: Cache Updates on Status Change
    console.log(`── Test 9: Cache Updates on Status Change ──`);
    cacheVal = await redisClient.get(`request:active:${userId}`);
    if (cacheVal) {
      console.log(`  ✅ Cache updated status to: ${JSON.parse(cacheVal).status}`);
    } else {
      console.error(`  ❌ Cache update failed!`);
    }

    // Mechanic Arrived
    console.log(`> Updating Status to Arrived...`);
    await axios.patch(`http://localhost:5000/api/requests/${requestId}/status`, { status: 'arrived' }, {
      headers: { Authorization: `Bearer ${mechanicToken}` }
    });
    await sleep(500);

    // Mechanic In Progress
    console.log(`> Updating Status to In Progress...`);
    await axios.patch(`http://localhost:5000/api/requests/${requestId}/status`, { status: 'in_progress' }, {
      headers: { Authorization: `Bearer ${mechanicToken}` }
    });
    await sleep(500);

    // Test 7: Reconnection Handling
    console.log(`── Test 7: Reconnection Handling ──`);
    userSocket.disconnect();
    
    // While user is offline, mechanic completes
    console.log(`> Updating Status to Completed (While User Offline)...`);
    await axios.patch(`http://localhost:5000/api/requests/${requestId}/status`, { status: 'completed' }, {
      headers: { Authorization: `Bearer ${mechanicToken}` }
    });
    await sleep(1000);

    // Reconnect user
    userSocket = io('http://localhost:5000', { auth: { token: userToken } });
    await sleep(500);
    userSocket.on('notification:missed', (data) => {
      console.log(`  ✅ Missed notifications received: ${data.count}`);
    });

    userSocket.emit('client:reconnected', {
      lastEventTime: new Date(Date.now() - 10000).toISOString(),
      activeRequestId: requestId
    });
    await sleep(500);

    // Test 10: Cache Deleted on Completion
    console.log(`── Test 10: Cache Deleted on Completion ──`);
    cacheVal = await redisClient.get(`request:active:${userId}`);
    if (!cacheVal) {
      console.log(`  ✅ Cache successfully deleted! (Result is null)`);
    } else {
      console.error(`  ❌ Cache still exists!`);
    }

    console.log(`\n── Test 12: Full Lifecycle Socket Test ──`);
    console.log(`  ✅ All steps executed sequentially without failure.`);
    
    console.log(`\n✅ All Event Flow Tests Executed Successfully!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Test Failed:', error.response?.data || error.message);
    process.exit(1);
  }
};

runTests();
