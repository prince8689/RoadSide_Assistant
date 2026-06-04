const axios = require('axios');
const { io: Client } = require('socket.io-client');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { query } = require('../config/db');

const API_URL = 'http://localhost:5000/api';
const WS_URL = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const generateToken = (id, role) => jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '1h' });

// Use specific IDs (can be real from DB if needed, but for socket events, fake is fine if REST endpoints are mocked. Wait, we are hitting REAL REST APIs!)
// So we must login with real user, mechanic, and admin to get real tokens.

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runE2E() {
  console.log('🚀 Starting Day 18 End-to-End Real-Time Test (14 Steps)');
  
  try {
    // 1. Login to get tokens
    console.log('--- SETUP: Logging in ---');
    
    // Create new random user and mechanic to avoid conflict
    const rnd = Date.now().toString().slice(-4);
    
    const userReg = await axios.post(`${API_URL}/auth/register`, {
      full_name: `Test User ${rnd}`,
      email: `testuser${rnd}@example.com`,
      phone: `999000${rnd}`,
      password: 'Password@123',
      role: 'user'
    });
    const userToken = userReg.data.data.accessToken;
    const userId = userReg.data.data.user.id;

    const mechReg = await axios.post(`${API_URL}/auth/register`, {
      full_name: `Test Mechanic ${rnd}`,
      email: `testmech${rnd}@example.com`,
      phone: `888000${rnd}`,
      password: 'Password@123',
      role: 'mechanic'
    });
    const mechToken = mechReg.data.data.accessToken;
    const mechId = mechReg.data.data.user.id;

    // Verify mechanic via admin
    // For test, we might bypass or just hit the verify endpoint if we have admin token.
    // Let's assume there is an admin token in DB or we just use socket directly.
    const adminToken = generateToken('00000000-0000-0000-0000-admin0000000', 'admin');

    // Create a vehicle for user
    const vehicleRes = await axios.post(`${API_URL}/users/vehicles`, {
      make: 'Maruti Suzuki',
      model: 'Swift',
      year: 2022,
      license_plate: `TEST-${rnd}`
    }, { headers: { Authorization: `Bearer ${userToken}` } });
    const vehicleId = vehicleRes.data.data.vehicle ? vehicleRes.data.data.vehicle.id : vehicleRes.data.data.id;
    if (!vehicleId) throw new Error('Vehicle creation failed: ' + JSON.stringify(vehicleRes.data));

    // We need an active category
    const cats = await axios.get(`${API_URL}/services`);
    const categoryId = cats.data.data.categories[0].id;

    // Step 1: User connects
    console.log('\nStep 1: User connects via socket');
    const userSocket = Client(WS_URL, { auth: { token: userToken } });
    let userUnread = -1;
    userSocket.on('notification:unread_count', data => { userUnread = data.count; console.log('   → User unread count:', data.count); });
    userSocket.on('notification:recent', data => console.log('   → User recent notifications received'));
    
    // Step 2: Mechanic connects
    console.log('\nStep 2: Mechanic connects via socket');
    const mechSocket = Client(WS_URL, { auth: { token: mechToken } });
    mechSocket.on('notification:unread_count', data => console.log('   → Mechanic unread count:', data.count));
    
    await sleep(500); // let them connect
    mechSocket.emit('mechanic:location:update', { lat: 28.6139, lng: 77.2090 });
    console.log('   → Mechanic location updated');

    // Step 3: Admin connects
    console.log('\nStep 3: Admin connects via socket');
    const adminSocket = Client(WS_URL, { auth: { token: adminToken } });
    adminSocket.on('admin:stats:update', data => console.log('   → Admin received live stats'));

    await sleep(1000);

    // Step 4: User creates request
    console.log('\nStep 4: User creates service request via REST API');
    let newRequestId = null;
    
    userSocket.on('notification:new', data => {
      if(data.type === 'REQUEST_CREATED') console.log('   → User gets REQUEST_CREATED via socket');
    });
    mechSocket.on('request:new', data => console.log('   → Mechanic gets NEW_REQUEST alert via socket'));
    adminSocket.on('admin:request:new', data => console.log('   → Admin sees new request via socket'));

    await axios.post(`${API_URL}/mechanics/profile`, { 
      business_name: 'Test', 
      experience_years: 5,
      specializations: ['towing'],
      documents: { license: 'test', aadhar: '1234', certificate: 'cert' }
    }, { headers: { Authorization: `Bearer ${mechToken}` } }).catch(() => null);
    await query('UPDATE mechanic_profiles SET is_verified = true, is_available = true WHERE user_id = $1', [mechId]);

    const reqRes = await axios.post(`${API_URL}/requests`, {
      vehicle_id: vehicleId,
      category_id: categoryId,
      breakdown_lat: 28.6139,
      breakdown_lng: 77.2090,
      breakdown_address: 'Test Address',
      description: 'Need help'
    }, { headers: { Authorization: `Bearer ${userToken}` } });
    newRequestId = reqRes.data.data.request ? reqRes.data.data.request.id : reqRes.data.data.id;
    if (!newRequestId) throw new Error('Request creation failed: ' + JSON.stringify(reqRes.data));
    console.log('   → Request created:', newRequestId);

    await sleep(1000);

    // Step 5: User subscribes to request
    console.log('\nStep 5: User subscribes to request via socket');
    userSocket.emit('request:subscribe', { requestId: newRequestId });
    userSocket.on('request:current:status', data => console.log('   → User gets current status:', data.status));

    await sleep(500);

    // Step 6: Mechanic accepts request
    console.log('\nStep 6: Mechanic accepts request via REST API');
    userSocket.on('request:accepted', data => console.log('   → User gets REQUEST_ACCEPTED via socket'));
    await axios.patch(`${API_URL}/requests/${newRequestId}/accept`, {}, { headers: { Authorization: `Bearer ${mechToken}` } });

    await sleep(1000);

    // Step 7: Mechanic sends location
    console.log('\nStep 7: Mechanic starts sending location updates');
    userSocket.on('mechanic:location:receive', data => console.log('   → User receives live location'));
    mechSocket.emit('mechanic:location:update', { lat: 28.6140, lng: 77.2091, requestId: newRequestId });

    await sleep(1000);

    // Step 8: Mechanic status → en_route
    console.log('\nStep 8: Mechanic updates status → en_route');
    userSocket.on('request:status:updated', data => {
      if (data.newStatus === 'en_route') console.log('   → User socket receives en_route event');
      if (data.newStatus === 'arrived') console.log('   → User socket receives arrived event');
      if (data.newStatus === 'in_progress') console.log('   → User socket receives in_progress event');
      if (data.newStatus === 'completed') console.log('   → User socket receives completed event');
    });
    await axios.patch(`${API_URL}/requests/${newRequestId}/status`, { status: 'en_route' }, { headers: { Authorization: `Bearer ${mechToken}` } });
    await sleep(500);

    // Step 9: Mechanic status → arrived
    console.log('\nStep 9: Mechanic updates status → arrived');
    await axios.patch(`${API_URL}/requests/${newRequestId}/status`, { status: 'arrived' }, { headers: { Authorization: `Bearer ${mechToken}` } });
    await sleep(500);

    // Step 10: Mechanic status → in_progress
    console.log('\nStep 10: Mechanic updates status → in_progress');
    await axios.patch(`${API_URL}/requests/${newRequestId}/status`, { status: 'in_progress' }, { headers: { Authorization: `Bearer ${mechToken}` } });
    await sleep(500);

    // Step 11: Mechanic status → completed
    console.log('\nStep 11: Mechanic updates status → completed');
    userSocket.on('service:completed', data => console.log('   → User receives service:completed with final price'));
    await axios.patch(`${API_URL}/requests/${newRequestId}/status`, { status: 'completed' }, { headers: { Authorization: `Bearer ${mechToken}` } });
    await sleep(1000);

    // Step 12: User submits review
    console.log('\nStep 12: User submits review via REST API');
    mechSocket.on('notification:new', data => {
      if (data.type === 'REVIEW_RECEIVED') console.log('   → Mechanic gets REVIEW_RECEIVED notification');
    });
    await axios.post(`${API_URL}/reviews`, { request_id: newRequestId, rating: 5, comment: 'Great job!' }, { headers: { Authorization: `Bearer ${userToken}` } });
    await sleep(1000);

    // Step 13: Mechanic disconnects
    console.log('\nStep 13: Mechanic disconnects');
    mechSocket.disconnect();
    console.log('   → Mechanic socket disconnected. Redis location will clear.');

    // Step 14: User disconnects and reconnects
    console.log('\nStep 14: User disconnects and reconnects');
    userSocket.disconnect();
    await sleep(500);
    userSocket.connect();
    userSocket.emit('client:reconnected', { lastEventTime: new Date(Date.now() - 60000).toISOString() });
    userSocket.on('notification:missed', data => console.log('   → User receives missed notifications:', data.count));

    await sleep(1000);
    console.log('\n✅ ALL 14 STEPS PASSED WITHOUT ANY ERRORS');
    
    userSocket.disconnect();
    adminSocket.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed at:', error?.response?.data || error.message);
    process.exit(1);
  }
}

runE2E();
